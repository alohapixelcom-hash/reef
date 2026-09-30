// src/worker-adresses.ts - les adresses que les deux Workers reglent eux-memes : plans du site, barre finale, page introuvable dans la langue de l'adresse, en-tetes internes.
//
// Partage par le Worker de la demo figee (worker.ts) et par celui du moteur
// (worker.moteur.ts), comme la redirection de langue : deux copies d'une
// meme regle finissent toujours par diverger. Rien ici ne lit la base.
import { LOCALES, ROOT_LOCALE } from "./worker-langue.ts";

interface Fichiers {
  fetch: (request: Request) => Promise<Response>;
}

// LES PLANS DU SITE. Une seule entree, /sitemap-index.xml, que robots.txt
// declare. /sitemap.xml, l'adresse que les robots essaient d'eux-memes, y
// mene par une 301. Tout autre /sitemap*.xml inconnu du site repond 404 : moteur
// allume, EmDash sert sinon ses propres plans (/sitemap.xml et
// /sitemap-<collection>.xml), en doublon des notres, et repondait 500 a une
// collection qu'il ne connait pas.
const PLAN = /^\/sitemap[^/]*\.xml$/;

/** La reponse d'une adresse de plan du site que le site ne sert pas, ou null. */
export function planDuSite(request: Request, connus: readonly string[]): Response | null {
  const { pathname } = new URL(request.url);
  if (pathname === "/sitemap.xml") {
    return new Response(null, { status: 301, headers: { Location: "/sitemap-index.xml" } });
  }
  if (!PLAN.test(pathname) || connus.includes(pathname)) return null;
  return new Response("Not found\n", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

// LA BARRE FINALE. Une seule forme d'adresse (trailingSlash "always") : une
// page demandee sans sa barre repond 301 vers la forme canonique, au lieu de
// 200 (moteur allume, Astro accepte les deux) ou de 307 (les fichiers). Les
// adresses internes (/_emdash, /_image, /_astro, /_actions), celles du serveur
// de developpement (/@vite, /@id, /node_modules : sans elles, le back office ne
// se charge pas sous astro dev) et les fichiers
// (une extension) ne sont jamais touches.
export function barreFinale(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const chemin = url.pathname;
  if (chemin.endsWith("/") || /^\/(?:_|@|node_modules\/)/.test(chemin) || /\.[a-z0-9]+$/i.test(chemin)) return null;
  // Une seule barre en tete : "//hote" (ou "/\hote", que l'URL lit "//hote")
  // serait lu par le navigateur comme une adresse sur un autre domaine.
  const cible = chemin.replace(/^\/+/, "/");
  return new Response(null, { status: 301, headers: { Location: `${cible}/${url.search}` } });
}

// LA PAGE INTROUVABLE. Une par langue, figee dans les deux modes : 404.html
// pour l'anglais, fr/404.html pour le francais (astro.config.mjs les range
// ainsi). Les fichiers les servent sous /404 et /fr/404, avec un code 200 ;
// ici elles repondent toujours 404, meme demandees par leur propre adresse.
const ADRESSE_DE_LA_404 = /^\/(?:([a-z]{2})\/)?404(?:\.html|\/)?$/;

/** La langue d'une adresse, lue sur son premier segment. */
function langueDe(chemin: string): string {
  const tete = chemin.split("/")[1] ?? "";
  return LOCALES.includes(tete) ? tete : ROOT_LOCALE;
}

/** La page introuvable de la langue de l'adresse, avec le code 404. */
export async function pageIntrouvable(request: Request, fichiers: Fichiers): Promise<Response> {
  const url = new URL(request.url);
  const langue = langueDe(url.pathname);
  const fichier = langue === ROOT_LOCALE ? "/404" : `/${langue}/404`;
  const methode = request.method === "HEAD" ? "HEAD" : "GET";
  const page = await fichiers.fetch(new Request(new URL(fichier, url), { method: methode }));
  if (!page.ok) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const entetes = new Headers(page.headers);
  entetes.set("Cache-Control", "no-store");
  return new Response(page.body, { status: 404, headers: entetes });
}

/** Vrai quand l'adresse demandee est celle d'une page introuvable (/404, /fr/404/, /fr/404.html). */
export function estLaPageIntrouvable(request: Request): boolean {
  const match = ADRESSE_DE_LA_404.exec(new URL(request.url).pathname);
  return match !== null && (match[1] === undefined || (LOCALES.includes(match[1]) && match[1] !== ROOT_LOCALE));
}

/**
 * La reponse telle que le visiteur la recoit. Une page introuvable rendue par
 * Astro (toujours dans la langue par defaut) devient celle de la langue de
 * l'adresse ; les adresses internes gardent la leur (l'API repond en JSON).
 * Et l'en-tete Server-Timing, qu'EmDash pose sur chaque reponse, ne sort pas :
 * il decrit le fonctionnement interne du moteur (initialisation de la base,
 * cle de chiffrement, nombre de requetes).
 */
export async function reponseAuVisiteur(request: Request, reponse: Response, fichiers: Fichiers | null): Promise<Response> {
  const chemin = new URL(request.url).pathname;
  const page = request.method === "GET" || request.method === "HEAD";
  const html = (reponse.headers.get("Content-Type") ?? "text/html").startsWith("text/html");
  // Sans fichiers (le Worker du moteur), la page introuvable est deja rendue a
  // la demande, dans la langue de l'adresse : elle passe telle quelle, jamais
  // mise en cache.
  if (reponse.status === 404 && page && html && !chemin.startsWith("/_")) {
    if (fichiers) return pageIntrouvable(request, fichiers);
    const entetes = new Headers(reponse.headers);
    entetes.delete("Server-Timing");
    entetes.set("Cache-Control", "no-store");
    return new Response(reponse.body, { status: 404, statusText: reponse.statusText, headers: entetes });
  }
  if (!reponse.headers.has("Server-Timing")) return reponse;
  const entetes = new Headers(reponse.headers);
  entetes.delete("Server-Timing");
  return new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers: entetes });
}
