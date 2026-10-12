// src/moteur/seo/route.ts - la route du plan vivant (/sitemap-moteur.xml) et celle de l'index, rendues a la demande dans le Worker du moteur.
//
// LES TROIS SOURCES DU PLAN (voir plan.ts) :
//   (a) le manifeste du build (integration.mjs), lu dans les fichiers publics
//       par la liaison ASSETS : les pages figees indexables avec les hreflang
//       de leur head, et les pages sans parametre rendues a la demande ;
//   (b) `aLaDemande` du site : des chemins (comme adressesDuPlan du socle,
//       alternatives devinees par la langue) ou des entrees completes ;
//       `depuisUneRoute` reprend telle quelle une route de plan existante ;
//   (c) `collections` du site : collection -> adresse d'une entree. Les
//       entrees publiees y prennent leur lastmod (updated_at), leur image de
//       partage et leurs alternatives (translation_group). `ajoute: false` :
//       la collection date et illustre les adresses que le site liste deja,
//       sans en ajouter (une adresse que le site ne sert pas ne peut pas
//       entrer par la).
// Moins : seo_no_index, les sources des redirections actives (EmDash et
// _redirects du build), `horsDuPlan`.
//
// UN PLAN INCOMPLET NE PART PAS. Si une source repond en erreur, la route
// rend 503 (Search Console reessaie) plutot qu'un plan ampute qui ferait
// sortir des pages de l'index.
import type { APIContext, APIRoute } from "astro";
import { type Base, d1De, ecrireLigne, type EntreePubliee, lireLesEntrees, lireLesRedirections, lireLigne } from "./base.ts";
import type { Fichiers } from "./fichiers.ts";
import { MANIFESTE_DU_BUILD, ROUTE_DU_PLAN } from "./identite.mjs";
import {
  assembler,
  cheminDe,
  devinerLesLangues,
  EN_TETES_DU_PLAN,
  EN_TETES_XML,
  type EntreeDuPlan,
  entreesDepuisXml,
  hreflangDe,
  type Langues,
  redirections,
  type Retrait,
  versW3C,
  xmlDeLIndex,
  xmlDuPlan,
} from "./plan.ts";

export interface EntreeDeCollection {
  collection: string;
  id: string;
  slug: string;
  locale: string | null;
}

/** L'adresse publique d'une entree, telle que le site la sert ("/fr/contact/"), ou null si elle n'a pas de page. */
export type AdresseDEntree = (e: EntreeDeCollection) => string | null;

export interface OptionsDuPlanVivant {
  langues?: Langues;
  aLaDemande?: (contexte: APIContext) => Promise<Array<string | EntreeDuPlan>>;
  collections?: Record<string, AdresseDEntree | { adresse: AdresseDEntree; ajoute?: boolean }>;
  horsDuPlan?: RegExp;
  /** Le nom de la liaison D1 du Worker ("DB"). */
  liaison?: string;
  /** Le manifeste, quand il ne se lit pas dans les fichiers publics (essais). */
  manifeste?: () => Promise<Manifeste | null>;
}

/** Ce que integration.mjs ecrit au build. */
export interface Manifeste {
  construit: string;
  pages: EntreeDuPlan[];
  aLaDemande: string[];
  redirections: string[];
  ecartees: { chemin: string; raison: string }[];
}

/** Le resume du dernier plan, garde dans aloha_seo (ligne "plan") pour l'ecran SEO. */
export interface Resume {
  adresses: number;
  figees: number;
  duSite: number;
  deLaBase: number;
  derniereModification: string | null;
  manifeste: string | null;
  manquantes: string[];
  retirees: Retrait[];
  ecarteesAuBuild: { chemin: string; raison: string }[];
}

async function envDuWorker(): Promise<Record<string, unknown>> {
  try {
    // Le module n'existe que dans workerd (meme choix que courriels/adaptateur.ts).
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: { env?: Record<string, unknown> } = await import("cloudflare:workers");
    return plateforme.env ?? {};
  } catch {
    return {};
  }
}

const estFichiers = (v: unknown): v is Fichiers => typeof v === "object" && v !== null && typeof (v as Fichiers).fetch === "function";

/** Le manifeste ecrit par le build dans les fichiers publics, ou null. */
export async function lireLeManifeste(fichiers: Fichiers | null, origine: string | URL): Promise<Manifeste | null> {
  if (!fichiers) return null;
  try {
    const r = await fichiers.fetch(new Request(new URL(MANIFESTE_DU_BUILD, origine).href));
    if (!r.ok) return null;
    const m = (await r.json()) as Manifeste;
    return Array.isArray(m.pages) ? m : null;
  } catch {
    return null;
  }
}

/** Reprend une route de plan existante (urlset) comme source (b), sans la reecrire. */
export function depuisUneRoute(route: APIRoute): (contexte: APIContext) => Promise<EntreeDuPlan[]> {
  return async (contexte) => {
    const r = await route(contexte);
    if (!(r instanceof Response) || !r.ok) throw new Error(`la route du site a repondu ${r instanceof Response ? r.status : "sans reponse"}`);
    return entreesDepuisXml(await r.text(), contexte.site ?? contexte.url);
  };
}

/** L'adresse d'une image du panneau SEO, comme EmDash l'ecrit (identifiant nu, chemin, ou adresse absolue). */
export function adresseDeLImage(image: string): string {
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return image;
  return `/_emdash/api/media/file/${image}`;
}

const enEntrees = (liste: Array<string | EntreeDuPlan>, langues?: Langues): EntreeDuPlan[] => [
  ...devinerLesLangues(liste.filter((x): x is string => typeof x === "string"), langues),
  ...liste.filter((x): x is EntreeDuPlan => typeof x !== "string"),
];

/** La source (c) : entrees publiees, noindex et retraits, depuis la base. */
async function depuisLaBase(base: Base, options: OptionsDuPlanVivant, origine: string | URL) {
  const regles = Object.entries(options.collections ?? {}).map(([collection, r]) => ({ collection, adresse: typeof r === "function" ? r : r.adresse, ajoute: typeof r === "function" ? true : r.ajoute !== false }));
  // Les collections et les redirections en meme temps : chaque requete D1 coute un aller-retour.
  const [{ entrees, manquantes }, lesRedirections] = await Promise.all([lireLesEntrees(base, regles.map((r) => r.collection)), lireLesRedirections(base)]);
  const parGroupe = new Map<string, EntreePubliee[]>();
  for (const e of entrees) {
    if (!e.groupe || e.noindex) continue;
    const cle = `${e.collection}:${e.groupe}`;
    parGroupe.set(cle, [...(parGroupe.get(cle) ?? []), e]);
  }
  const parId = new Map<string, string | null>();
  for (const e of entrees) {
    const regle = regles.find((r) => r.collection === e.collection)!;
    const brut = regle.adresse({ collection: e.collection, id: e.id, slug: e.slug, locale: e.locale });
    parId.set(`${e.collection}:${e.id}`, brut === null ? null : cheminDe(brut, origine));
  }
  const ajoutees: EntreeDuPlan[] = [];
  const datees: EntreeDuPlan[] = [];
  const noindex: string[] = [];
  for (const e of entrees) {
    const chemin = parId.get(`${e.collection}:${e.id}`);
    if (!chemin) continue;
    const liste = regles.find((r) => r.collection === e.collection)!.ajoute ? ajoutees : datees;
    if (e.noindex) {
      // Elle entre pour etre retiree aussitot : le resume la montre parmi les adresses retirees.
      noindex.push(chemin);
      liste.push({ chemin });
      continue;
    }
    // Une canonique qui pointe ailleurs : cette adresse n'est pas la bonne, elle n'entre pas.
    if (e.canonique && cheminDe(e.canonique.startsWith("/") || /^https?:/i.test(e.canonique) ? e.canonique : `/${e.canonique}`, origine) !== chemin) continue;
    const freres = e.groupe ? (parGroupe.get(`${e.collection}:${e.groupe}`) ?? []) : [];
    const alternatives = freres
      .map((x) => ({ langue: hreflangDe(x.locale ?? "", options.langues), href: parId.get(`${x.collection}:${x.id}`) ?? "" }))
      .filter((a) => a.langue && a.href);
    const entree: EntreeDuPlan = {
      chemin,
      lastmod: versW3C(e.majLe),
      ...(alternatives.length > 1 ? { alternatives } : {}),
      ...(e.image ? { images: [adresseDeLImage(e.image)] } : {}),
    };
    liste.push(entree);
  }
  return { ajoutees, datees, noindex, manquantes, redirections: lesRedirections };
}

/** Garde le resume du plan quand il a change (une ecriture par changement, pas par requete). */
async function garderLeResume(base: Base, resume: Resume): Promise<void> {
  try {
    const json = JSON.stringify(resume);
    const avant = await lireLigne(base, "plan");
    if (avant?.contenu === json) return;
    await ecrireLigne(base, { nom: "plan", contenu: json, empreinte: null, maj: Date.now(), maj_par: null });
  } catch {
    // Le resume n'est qu'un affichage : le plan part quand meme.
  }
}

/**
 * Le plan, sans requete ni Worker : ce que la route rend, et ce que le
 * self-check joue sur une vraie base SQLite.
 */
export async function calculerLePlan(entree: { base: Base | null; manifeste: Manifeste | null; duSite: Array<string | EntreeDuPlan>; options: OptionsDuPlanVivant; origine: string | URL }) {
  const { base, manifeste, options, origine } = entree;
  // Pas de lastmod pour une page figee : la date du build changerait a chaque
  // mise en ligne sans que la page change, et Google cesse de croire les
  // lastmod d'un site qui en donne de faux. Seule la base date (updated_at).
  const figees = [...(manifeste?.pages ?? []), ...devinerLesLangues(manifeste?.aLaDemande ?? [], options.langues)];
  const duSite = enEntrees(entree.duSite, options.langues);
  const laBase = base ? await depuisLaBase(base, options, origine) : { ajoutees: [], datees: [], noindex: [], manquantes: Object.keys(options.collections ?? {}), redirections: [] };
  const r = redirections([
    ...laBase.redirections.map((x) => ({ source: x.source, syntaxe: "emdash" as const })),
    ...(manifeste?.redirections ?? []).map((source) => ({ source, syntaxe: "cloudflare" as const })),
  ]);
  const { entrees, retirees } = assembler([figees, duSite, laBase.ajoutees], { noindex: laBase.noindex, redirections: r, horsDuPlan: options.horsDuPlan }, laBase.datees);
  const resume: Resume = {
    adresses: entrees.length,
    figees: figees.length,
    duSite: duSite.length,
    deLaBase: laBase.ajoutees.length,
    derniereModification: entrees.reduce<string | null>((m, e) => (e.lastmod && (!m || e.lastmod > m) ? e.lastmod : m), null),
    manifeste: manifeste?.construit ?? null,
    manquantes: laBase.manquantes,
    retirees: retirees.slice(0, 500),
    ecarteesAuBuild: (manifeste?.ecartees ?? []).slice(0, 200),
  };
  return { entrees, retirees, resume };
}

/** Le waitUntil du Worker (adaptateur Cloudflare d'Astro), ou null hors Worker. */
function plusTard(contexte: APIContext): ((promesse: Promise<unknown>) => void) | null {
  const cf = (contexte.locals as { cfContext?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined)?.cfContext;
  return typeof cf?.waitUntil === "function" ? cf.waitUntil.bind(cf) : null;
}

/** La route /sitemap-moteur.xml. */
export function planVivant(options: OptionsDuPlanVivant = {}): APIRoute {
  return async (contexte) => {
    const origine = contexte.site ?? contexte.url;
    const env = await envDuWorker();
    const base = d1De(env, options.liaison ?? "DB");
    const fichiers = estFichiers(env.ASSETS) ? env.ASSETS : null;
    try {
      // Le manifeste et les adresses du site en meme temps : deux sources independantes.
      const [manifeste, duSite] = await Promise.all([
        options.manifeste ? options.manifeste() : lireLeManifeste(fichiers, origine),
        options.aLaDemande ? options.aLaDemande(contexte) : Promise.resolve([] as Array<string | EntreeDuPlan>),
      ]);
      const { entrees, retirees, resume } = await calculerLePlan({ base, manifeste, duSite, options, origine });
      if (base) {
        // Le resume n'est qu'un affichage de l'ecran SEO : il s'ecrit apres la reponse quand le Worker le permet.
        const garde = garderLeResume(base, resume);
        const apres = plusTard(contexte);
        if (apres) apres(garde);
        else await garde;
      }
      return new Response(xmlDuPlan(entrees, origine, options.langues), {
        status: 200,
        headers: { ...EN_TETES_DU_PLAN, "x-aloha-plan": `${entrees.length} adresses, ${retirees.length} retirees${manifeste ? "" : ", manifeste du build introuvable"}` },
      });
    } catch (erreur) {
      console.error("[aloha-seo] plan indisponible", erreur instanceof Error ? erreur.message : String(erreur));
      return new Response("<!-- plan indisponible, reessayer -->\n", { status: 503, headers: { ...EN_TETES_XML, "retry-after": "120" } });
    }
  };
}

/** La route /sitemap-index.xml, pour un site qui ne la sert pas depuis l'aiguillage. */
export const indexDuPlan: APIRoute = ({ site, url }) => new Response(xmlDeLIndex(site ?? url, ROUTE_DU_PLAN), { status: 200, headers: EN_TETES_DU_PLAN });
