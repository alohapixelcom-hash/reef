// src/moteur/seo/aiguillage.ts - l'aiguillage du SEO en tete du Worker : anciens plans en 301, index du plan, robots.txt et llms.txt depuis la base, avant EmDash et avant tout fichier du build.
//
// POURQUOI EN TETE DU WORKER ET PAS PAR DES ROUTES ASTRO. EmDash 0.38 injecte
// lui-meme /sitemap.xml, /sitemap-[collection].xml et /robots.txt
// (astro/index.mjs, injectCoreRoutes), sauf si le site a un fichier du meme
// nom dans src/pages (hasUserDefinedPublicRoute). Un tel fichier ne marche
// pas ici : moteur eteint, le build statique le figerait (une 301 ne se fige
// pas), et le site garde deja son src/pages/robots.txt.ts pour le texte par
// defaut. Le Worker, lui, voit chaque requete avant Astro : une reponse
// rendue ici passe devant toutes les routes d'EmDash, quelle que soit leur
// priorite. Et comme le build ecrit sitemap-index.xml, sitemap-0.xml,
// robots.txt et llms.txt dans les fichiers publics, ces adresses doivent
// passer par le Worker avant les fichiers : "run_worker_first" les couvre
// (["/*", ...] chez alohapixel.com ; sinon "/sitemap*.xml", "/robots.txt",
// "/llms.txt"), et un Worker qui sert d'abord ses fichiers (alohapixel.com,
// etape 4) appelle cet aiguillage AVANT env.ASSETS.fetch.
//
// Le plan vivant lui-meme (/sitemap-moteur.xml) reste une route Astro : il a
// besoin des fonctions du site. Un Worker qui n'a pas Astro (la boutique,
// alohapixel.app) le demande au Worker du moteur par `moteur`.
import { ADRESSES_DU_SEO, ROUTE_DE_L_INDEX, ROUTE_DU_PLAN } from "./identite.mjs";
import type { Base } from "./base.ts";
import { type Fichiers, servirLeFichier } from "./fichiers.ts";
import { EN_TETES_DU_PLAN, estUnAncienPlan, xmlDeLIndex } from "./plan.ts";

export { ADRESSES_DU_SEO };
// Un seul import pour le Worker : l'aiguillage et la facon de lui donner la base.
export { baseD1, d1De } from "./base.ts";

export interface OptionsDeLAiguillage {
  /** La base du site (D1), ou null : robots.txt et llms.txt partent alors avec le texte par defaut. */
  base: Base | null;
  /** Les fichiers du build (liaison ASSETS) : le texte par defaut de robots.txt et llms.txt. */
  fichiers?: Fichiers | null;
  /**
   * La suite du Worker (Astro), pour le texte par defaut d'un fichier que le
   * build ne fige pas (llms.txt rendu a la demande). Jamais ce Worker entier :
   * l'aiguillage s'y rappellerait lui-meme.
   */
  rendu?: Fichiers | null;
  /** Le Worker qui rend /sitemap-moteur.xml quand ce n'est pas celui-ci (liaison de service). */
  moteur?: Fichiers | null;
  /** L'origine publique, quand le Worker repond sous une autre (essais) ; sinon celle de la requete. */
  origine?: string;
}

/**
 * La reponse d'un autre Worker telle que le visiteur la recoit : sans
 * Server-Timing, qu'EmDash pose sur chaque reponse (temps de la base, nombre
 * de requetes). Il decrit le moteur, jamais pour un visiteur.
 */
export function sansServerTiming(reponse: Response): Response {
  if (!reponse.headers.has("Server-Timing")) return reponse;
  const entetes = new Headers(reponse.headers);
  entetes.delete("Server-Timing");
  return new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers: entetes });
}

/** Une 301 vers l'index du plan, jamais gardee en cache. */
function versLIndex(url: URL): Response {
  return new Response(null, { status: 301, headers: { location: new URL(ROUTE_DE_L_INDEX, url.origin).href, "cache-control": "no-store" } });
}

/**
 * La reponse du SEO pour cette requete, ou null quand elle ne le concerne
 * pas (le Worker continue alors son chemin habituel).
 */
export async function aiguillerLeSeo(request: Request, options: OptionsDeLAiguillage): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const chemin = url.pathname;
  if (!ADRESSES_DU_SEO.test(chemin)) return null;
  if (estUnAncienPlan(chemin)) return versLIndex(url);
  if (chemin === ROUTE_DE_L_INDEX) {
    return new Response(request.method === "HEAD" ? null : xmlDeLIndex(options.origine ?? url.origin, ROUTE_DU_PLAN), { status: 200, headers: EN_TETES_DU_PLAN });
  }
  if (chemin === ROUTE_DU_PLAN) return options.moteur ? sansServerTiming(await options.moteur.fetch(request)) : null;
  if (chemin === "/robots.txt") return servirLeFichier(request, "robots", options.base, options.fichiers, options.rendu);
  if (chemin === "/llms.txt") return servirLeFichier(request, "llms", options.base, options.fichiers, options.rendu);
  return null;
}
