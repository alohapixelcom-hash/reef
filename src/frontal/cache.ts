// src/frontal/cache.ts - le Worker frontal leger du socle : fichiers, redirections du site, puis cache des pages anonymes devant le Worker du moteur, qui ne se reveille que pour une page absente du cache, le back office et l'API.
//
// POURQUOI UN SECOND WORKER. Le Worker du moteur embarque EmDash : 13,3 Mio, 3,3 Mio compresse. Chaque
// nouvel isolat le recharge, et un visiteur sur quelques-uns payait 1,1 a
// 2,7 s de premier octet (MESURE en ligne). Ce Worker-ci ne pese que ce
// fichier et les regles d'adresses du site : il repond seul aux fichiers,
// aux redirections et aux pages deja gardees, et ne passe la main au moteur,
// par liaison de service (MOTEUR), que pour le reste.
//
// L'ORDRE, pour chaque requete :
//   0. la lecture anonyme du plan du site (/sitemap-moteur.xml, option
//      plansGardes) : droit au cache de l'etape 5, fraicheur de 300 s. Le
//      plan vivant se calcule depuis la base ; sans copie, la Search Console
//      attendait jusqu'a 86 s et le declarait illisible (MESURE le 12 octobre
//      2026). Le site peut l'envoyer au moteur par versLeMoteur : il y passe
//      quand meme, mais par le cache ;
//   1. ni GET ni HEAD, adresse interne (/_emdash, /_image, /_actions...,
//      sauf /_astro), entree du back office, page introuvable demandee par
//      son adresse : au moteur, telle quelle ;
//   2. les regles du site (avantLeCache : plans, barre finale, langue du
//      visiteur), les memes fonctions que le Worker du moteur : une redirection
//      part d'ici sans reveiller EmDash, jamais gardee ;
//   2 bis. le site en maintenance (maintenance.ts) : hors fichiers et hors
//      personne connectee au back office, la page d'attente en 503 (composee
//      depuis l'ecran par attente.ts, sinon celle du site), jamais gardee
//      (en-tete x-aloha-cache MAINTENANCE) ;
//   3. un fichier (une extension, ou /_astro/) : les fichiers du build ; puis
//      une page figee par le build (lecture d'une adresse de page, hors /_) :
//      son fichier, sans reveiller le moteur. Le moteur des sept themes la
//      servait deja depuis les fichiers avant Astro (pageFigee, peutEtreFigee,
//      ou fichiers d'abord par run_worker_first) : meme reponse, pour tous les
//      visiteurs, sans l'isolat de 13 Mio (option pagesFigees, vraie par
//      defaut) ;
//   4. un visiteur avec une session ou le mode edition (cookie astro-session,
//      emdash-edit-mode, ou tout nom qui dit session, auth, token, csrf), ou un
//      en-tete Authorization : au moteur, JAMAIS de cache, ni en lecture ni en
//      ecriture ;
//   5. le cache : cle = hote + chemin + requete + VERSION lue dans la base
//      (version.ts). Copie de moins de 60 s : servie (HIT). Plus vieille :
//      servie aussitot (STALE) et regeneree en arriere-plan, une seule fois a
//      la fois par isolat. Absente : rendue par le moteur (MISS), gardee 7
//      jours si elle peut l'etre.
//
// CE QUI N'EST JAMAIS GARDE : une reponse autre que 200 (404, redirections,
// erreurs), un Set-Cookie, un Cache-Control private ou no-store, un Vary
// sur Cookie ou *, un type autre que HTML, texte ou XML, une page qui porte la
// barre d'edition ou une annotation d'EmDash (verifie sur le corps, en
// arriere-plan), et toute page rendue dans les 35 s qui suivent un
// changement (le temps qu'aucun isolat du moteur ne rende encore l'etat
// d'avant). La langue : les redirections de langue sont decidees a l'etape 2,
// avant le cache ; une page gardee ne depend donc que de son adresse.
//
// SERVER-TIMING : EmDash le pose sur chaque reponse (temps et nombre de
// requetes de la base). Il ne sort jamais d'ici, ni garde ni relaye.
//
// L'EN-TETE x-aloha-cache dit ce qui s'est passe (HIT, STALE, MISS, NON-GARDEE,
// PRIVEE, MOTEUR, FICHIER, FIGEE, REGLE, SANS-VERSION, MAINTENANCE, PLAN-PRECEDENT) : a relever par le banc de
// mesure apres chaque deploiement.
import { composerLAttente } from "./attente.ts";
import { adresseDeLAttente, entetesDeLAttente, lireLaMaintenance, lireLesReglages, PAGE_DE_MAINTENANCE, PAGE_DE_SECOURS, reessayerApres } from "./maintenance.ts";
import { lireLaVersion, type Base, type Version } from "./version.ts";

export interface Service {
  fetch(request: Request): Promise<Response>;
}

export interface EnvDuFrontal {
  /** Le Worker du moteur (liaison de service). */
  MOTEUR: Service;
  /** Les fichiers du build (dist/client), les memes que ceux du moteur. */
  ASSETS?: Service;
  /** La base du moteur, lue seulement (la version). */
  DB: Base;
}

export interface Contexte {
  waitUntil(promesse: Promise<unknown>): void;
}

export interface OptionsDuFrontal {
  /** Les regles du site avant le cache : une reponse (redirection, plan) ou null. */
  avantLeCache?: (request: Request) => Response | null | Promise<Response | null>;
  /** Les adresses qui vont droit au moteur, en plus de celles du socle. */
  versLeMoteur?: RegExp;
  /** Fraicheur d'une copie, en secondes (60). */
  fraicheur?: number;
  /** Conservation d'une copie, en secondes (7 jours). */
  conservation?: number;
  /** Aucune copie gardee pendant ce delai apres un changement, en secondes (35). */
  sansCopieApresChangement?: number;
  /** Duree pendant laquelle un isolat reutilise la version lue, en millisecondes (1000). */
  memoireDeLaVersion?: number;
  /** Une page figee par le build est servie depuis les fichiers avant le cache (vrai). */
  pagesFigees?: boolean;
  /** Les plans du site gardes par le cache, meme quand versLeMoteur les envoie au moteur (/sitemap-moteur.xml). */
  plansGardes?: RegExp;
  /** Fraicheur d'un plan garde, en secondes (300). */
  fraicheurDesPlans?: number;
}

export const REGLAGES = { fraicheur: 60, conservation: 7 * 24 * 3600, sansCopieApresChangement: 35, memoireDeLaVersion: 1000, pagesFigees: true, plansGardes: /^\/sitemap-moteur\.xml$/, fraicheurDesPlans: 300 };

/** Les adresses du socle qui vont droit au moteur : l'entree du back office et la page introuvable demandee par son adresse. */
export const VERS_LE_MOTEUR = /^\/(?:(?:[a-z]{2}\/)?secret-spot|_emdash\/secret-spot)(?:\/.*)?$|^\/(?:[a-z]{2}\/)?404(?:\.html|\/)?$/;

/** Un nom de cookie qui dit qu'une session, une connexion ou le mode edition est la. */
export const COOKIE_PRIVE = /^astro-session$|^emdash|session|auth|token|csrf|logged/i;

const TYPES_GARDES = /^(?:text\/html|text\/plain|text\/xml|application\/xml|application\/rss\+xml)\b/i;
const MARQUES_D_EDITION = ["emdash-toolbar", "data-emdash-ref"];
export const ENTETE = "x-aloha-cache";
const DATE_GARDEE = "x-aloha-garde-le";
const CONTROLE_D_ORIGINE = "x-aloha-controle";

/** Les noms des cookies d'un en-tete Cookie. */
export function nomsDesCookies(entete: string | null): string[] {
  if (!entete) return [];
  return entete
    .split(";")
    .map((morceau) => morceau.split("=")[0]?.trim() ?? "")
    .filter(Boolean);
}

/** Vrai quand la requete vient d'un editeur, d'une session ou d'un client authentifie : jamais de cache. */
export function estPrivee(request: Request): boolean {
  if (request.headers.has("Authorization")) return true;
  return nomsDesCookies(request.headers.get("Cookie")).some((nom) => COOKIE_PRIVE.test(nom));
}

/** Vrai quand l'adresse part droit au moteur (etape 1). */
export function passeAuMoteur(request: Request, autres?: RegExp): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return true;
  const chemin = new URL(request.url).pathname;
  if (chemin.startsWith("/_") && !chemin.startsWith("/_astro/")) return true;
  return VERS_LE_MOTEUR.test(chemin) || (autres?.test(chemin) ?? false);
}

/** Vrai quand l'adresse est celle d'un fichier du build (etape 3). */
export function estUnFichier(chemin: string): boolean {
  return chemin.startsWith("/_astro/") || /\.[a-z0-9]+$/i.test(chemin);
}

/** Vrai pour la lecture d'une adresse de page (ni fichier, ni adresse interne) : le build a pu la figer (etape 3). */
export function peutEtreFigee(request: Request): boolean {
  const chemin = new URL(request.url).pathname;
  return (request.method === "GET" || request.method === "HEAD") && !chemin.startsWith("/_") && !estUnFichier(chemin);
}

/** Vrai quand la reponse du moteur peut etre gardee pour tous les visiteurs. */
export function peutEtreGardee(reponse: Response): boolean {
  if (reponse.status !== 200) return false;
  if (reponse.headers.has("Set-Cookie")) return false;
  if (/private|no-store/i.test(reponse.headers.get("Cache-Control") ?? "")) return false;
  if (/\*|cookie|authorization/i.test(reponse.headers.get("Vary") ?? "")) return false;
  return TYPES_GARDES.test(reponse.headers.get("Content-Type") ?? "");
}

/** Vrai quand le corps porte la barre d'edition ou une annotation d'EmDash. */
export function porteLEdition(corps: string): boolean {
  return MARQUES_D_EDITION.some((marque) => corps.includes(marque));
}

/** La cle du cache : une adresse qui n'existe pas, faite de la version, de l'hote, du chemin et de la requete. */
export function cleDuCache(url: URL, version: string): Request {
  return new Request(`https://cache.aloha/${version}/${url.host}${url.pathname}${url.search}`);
}

/**
 * La cle du dernier plan connu, sans version : ce qu'un plan sert le temps
 * que le moteur recalcule celui de la nouvelle version.
 */
export function cleDuDernierPlan(url: URL): Request {
  return new Request(`https://cache.aloha/dernier-plan/${url.host}${url.pathname}${url.search}`);
}

/** Fraiche ou perimee, selon l'age de la copie. */
export function etatDeLaCopie(gardeeLe: number, maintenant: number, fraicheur: number): "fraiche" | "perimee" {
  return maintenant - gardeeLe < fraicheur * 1000 ? "fraiche" : "perimee";
}

/**
 * Vrai pour la lecture anonyme d'un plan du site : il passe par le cache avant
 * toute autre regle. Le plan vivant se calcule depuis la base a chaque appel ;
 * garde sous la version du contenu, il repond tout de suite a la Search
 * Console, et une publication change sa cle comme celle de toute page.
 */
export function estUnPlanGarde(request: Request, plans: RegExp): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return plans.test(new URL(request.url).pathname) && !estPrivee(request);
}

/** Une reponse avec l'en-tete de diagnostic, sans Server-Timing (EmDash le pose partout, jamais pour un visiteur). */
function marquee(reponse: Response, etat: string): Response {
  const entetes = new Headers(reponse.headers);
  entetes.delete("Server-Timing");
  entetes.set(ENTETE, etat);
  return new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers: entetes });
}

/** La copie gardee rendue au visiteur : en-tetes internes retires, Cache-Control d'origine rendu. */
function servie(copie: Response, etat: string, tete: boolean): Response {
  const entetes = new Headers(copie.headers);
  const origine = entetes.get(CONTROLE_D_ORIGINE);
  entetes.delete(DATE_GARDEE);
  entetes.delete(CONTROLE_D_ORIGINE);
  entetes.delete("Server-Timing");
  if (origine) entetes.set("Cache-Control", origine);
  else entetes.delete("Cache-Control");
  entetes.set(ENTETE, etat);
  return new Response(tete ? null : copie.body, { status: 200, headers: entetes });
}

const cacheParDefaut = (): Cache => (globalThis as unknown as { caches: { default: Cache } }).caches.default;

/** Le Worker frontal : `export default creerFrontal({ avantLeCache })` dans src/worker.frontal.ts du site. */
export function creerFrontal(options: OptionsDuFrontal = {}) {
  const r = { ...REGLAGES, ...options };
  const enCours = new Set<string>();
  let memoire: { version: Version; lue: number } | null = null;
  // Le dernier changement de version vu par cet isolat : un reglage du site
  // n'a pas de date, la fenetre sans copie part donc aussi de ce moment.
  let changementVu = 0;

  async function version(env: EnvDuFrontal, maintenant: number): Promise<Version | null> {
    if (memoire && maintenant - memoire.lue < r.memoireDeLaVersion) return memoire.version;
    const lue = await lireLaVersion(env.DB);
    if (!lue) return null;
    if (memoire && memoire.version.cle !== lue.cle) changementVu = maintenant;
    memoire = { version: lue, lue: maintenant };
    return lue;
  }

  /** Garde la copie en arriere-plan, apres avoir lu son corps (jamais une page d'editeur). */
  async function garder(cle: Request, reponse: Response, corps: ReadableStream<Uint8Array>, dernier: Request | null): Promise<void> {
    const texte = await new Response(corps).text();
    if (porteLEdition(texte)) return;
    const entetes = new Headers(reponse.headers);
    entetes.delete("Server-Timing");
    entetes.set(DATE_GARDEE, String(Date.now()));
    entetes.set(CONTROLE_D_ORIGINE, reponse.headers.get("Cache-Control") ?? "");
    entetes.set("Cache-Control", `public, max-age=${r.conservation}`);
    await cacheParDefaut().put(cle, new Response(texte, { status: 200, headers: entetes }));
    if (dernier) await cacheParDefaut().put(dernier, new Response(texte, { status: 200, headers: entetes }));
  }

  /** Demande la page au moteur et la garde si elle peut l'etre ; rend la reponse du moteur. */
  async function rendre(request: Request, env: EnvDuFrontal, ctx: Contexte, cle: Request, v: Version, maintenant: number): Promise<Response> {
    const reponse = await env.MOTEUR.fetch(request);
    const fenetre = r.sansCopieApresChangement * 1000;
    const recent = maintenant - v.derniere < fenetre || maintenant - changementVu < fenetre;
    if (request.method !== "GET" || recent || !peutEtreGardee(reponse) || !reponse.body) return marquee(reponse, "NON-GARDEE");
    const [visiteur, copie] = reponse.body.tee();
    const url = new URL(request.url);
    const dernier = r.plansGardes.test(url.pathname) ? cleDuDernierPlan(url) : null;
    ctx.waitUntil(garder(cle, reponse, copie, dernier).catch(() => undefined));
    return marquee(new Response(visiteur, { status: reponse.status, statusText: reponse.statusText, headers: reponse.headers }), "MISS");
  }

  // LE MODE MAINTENANCE (maintenance.ts) : l'interrupteur relu au plus une
  // fois par seconde, les sessions verifiees gardees 30 s, la page d'attente
  // de chaque langue gardee 60 s.
  let maintenance: { fermee: boolean; lue: number } | null = null;
  const sessions = new Map<string, { editeur: boolean; jusqua: number }>();
  const attentes = new Map<string, { corps: string; type: string; jusqua: number }>();

  async function siteFerme(env: EnvDuFrontal, maintenant: number): Promise<boolean> {
    if (maintenance && maintenant - maintenance.lue < r.memoireDeLaVersion) return maintenance.fermee;
    maintenance = { fermee: await lireLaMaintenance(env.DB), lue: maintenant };
    return maintenance.fermee;
  }

  /** Vrai pour une personne connectee au back office : le moteur le dit, le nom d'un cookie ne suffit pas. */
  async function estUnEditeur(request: Request, env: EnvDuFrontal, maintenant: number): Promise<boolean> {
    if (!estPrivee(request)) return false;
    const entetes = new Headers();
    for (const nom of ["Cookie", "Authorization"]) {
      const valeur = request.headers.get(nom);
      if (valeur) entetes.set(nom, valeur);
    }
    const cle = `${entetes.get("Cookie") ?? ""}\n${entetes.get("Authorization") ?? ""}`;
    const connu = sessions.get(cle);
    if (connu && connu.jusqua > maintenant) return connu.editeur;
    let editeur = false;
    try {
      const reponse = await env.MOTEUR.fetch(new Request(new URL("/_emdash/api/auth/me", request.url), { headers: entetes }));
      editeur = reponse.status === 200;
      await reponse.body?.cancel();
    } catch {
      editeur = false;
    }
    if (sessions.size > 500) sessions.clear();
    sessions.set(cle, { editeur, jusqua: maintenant + 30_000 });
    return editeur;
  }

  /**
   * La page d'attente, en 503 : celle que l'ecran compose quand un titre y est
   * saisi ; sinon celle du site dans la langue de l'adresse, celle de la
   * racine, puis la page de secours.
   */
  async function pageDAttente(request: Request, env: EnvDuFrontal, maintenant: number): Promise<Response> {
    const url = new URL(request.url);
    const tete = request.method === "HEAD";
    const reglages = await lireLesReglages(env.DB);
    if (reglages) {
      const langue = /^\/en(?:\/|$)/.test(url.pathname) ? "en" : "fr";
      return new Response(tete ? null : composerLAttente(reglages, langue), { status: 503, headers: entetesDeLAttente("text/html; charset=utf-8", reessayerApres(reglages.retour, maintenant)) });
    }
    for (const chemin of [...new Set([adresseDeLAttente(url.pathname), PAGE_DE_MAINTENANCE])]) {
      const gardee = attentes.get(chemin);
      if (gardee && gardee.jusqua > maintenant) return new Response(tete ? null : gardee.corps, { status: 503, headers: entetesDeLAttente(gardee.type) });
      try {
        const rendue = await env.MOTEUR.fetch(new Request(new URL(chemin, url), { headers: { Accept: "text/html" } }));
        const type = rendue.headers.get("Content-Type") ?? "";
        if (rendue.status !== 200 || !type.startsWith("text/html")) {
          await rendue.body?.cancel();
          continue;
        }
        const corps = await rendue.text();
        if (attentes.size > 20) attentes.clear();
        attentes.set(chemin, { corps, type, jusqua: maintenant + 60_000 });
        return new Response(tete ? null : corps, { status: 503, headers: entetesDeLAttente(type) });
      } catch {
        continue;
      }
    }
    return new Response(tete ? null : PAGE_DE_SECOURS, { status: 503, headers: entetesDeLAttente("text/html; charset=utf-8") });
  }

  /** L'etape 5 : la copie gardee sous la version du contenu, fraiche, perimee ou absente. */
  async function parLeCache(request: Request, env: EnvDuFrontal, ctx: Contexte, url: URL, fraicheur: number): Promise<Response> {
    const maintenant = Date.now();
    const v = await version(env, maintenant);
    if (!v) return marquee(await env.MOTEUR.fetch(request), "SANS-VERSION");
    const cle = cleDuCache(url, v.cle);
    const tete = request.method === "HEAD";
    const copie = await cacheParDefaut().match(cle);
    // Un plan sans copie de cette version : le dernier plan connu part tout
    // de suite, et le moteur calcule le nouveau en arriere-plan. Le robot ne
    // paie jamais le calcul ; la copie de la version d'avant ne sert que
    // jusqu'a ce que la nouvelle soit gardee (x-aloha-cache PLAN-PRECEDENT).
    const secours = copie ?? (r.plansGardes.test(url.pathname) ? await cacheParDefaut().match(cleDuDernierPlan(url)) : undefined);
    if (secours) {
      const gardeeLe = Number(secours.headers.get(DATE_GARDEE) ?? 0);
      if (copie && etatDeLaCopie(gardeeLe, maintenant, fraicheur) === "fraiche") return servie(copie, "HIT", tete);
      if (!enCours.has(cle.url)) {
        enCours.add(cle.url);
        // La regeneration demande la page entiere : sans en-tete conditionnel, le moteur ne repond pas 304.
        const entetes = new Headers(request.headers);
        entetes.delete("If-None-Match");
        entetes.delete("If-Modified-Since");
        const neuve = new Request(request.url, { method: "GET", headers: entetes });
        ctx.waitUntil(rendre(neuve, env, ctx, cle, v, maintenant).then((rep) => rep.body?.cancel()).catch(() => undefined).finally(() => enCours.delete(cle.url)));
      }
      return servie(secours, copie ? "STALE" : "PLAN-PRECEDENT", tete);
    }
    return rendre(request, env, ctx, cle, v, maintenant);
  }

  return {
    async fetch(request: Request, env: EnvDuFrontal, ctx: Contexte): Promise<Response> {
      if (estUnPlanGarde(request, r.plansGardes)) return parLeCache(request, env, ctx, new URL(request.url), r.fraicheurDesPlans);
      if (passeAuMoteur(request, r.versLeMoteur)) return marquee(await env.MOTEUR.fetch(request), "MOTEUR");
      const regle = r.avantLeCache ? await r.avantLeCache(request) : null;
      if (regle) return marquee(regle, "REGLE");
      const url = new URL(request.url);
      const fichierDemande = estUnFichier(url.pathname);
      if (!fichierDemande) {
        const instant = Date.now();
        if ((await siteFerme(env, instant)) && !(await estUnEditeur(request, env, instant))) return marquee(await pageDAttente(request, env, instant), "MAINTENANCE");
      }
      if (env.ASSETS && (fichierDemande || (r.pagesFigees && peutEtreFigee(request)))) {
        const fichier = await env.ASSETS.fetch(request);
        if (fichier.status !== 404) return marquee(fichier, fichierDemande ? "FICHIER" : "FIGEE");
        await fichier.body?.cancel();
      }
      if (estPrivee(request)) return marquee(await env.MOTEUR.fetch(request), "PRIVEE");
      return parLeCache(request, env, ctx, url, r.fraicheur);
    },
  };
}
