// src/moteur/seo/sitemap-index.ts - le point d'entree de la route /sitemap-index.xml : l'index qui ne cite que le plan vivant.
//
// L'aiguillage en tete du Worker (aiguillage.ts) sert deja cet index avant
// les fichiers du build. Cette route le sert aussi quand une requete arrive
// a Astro sans etre passee par lui (astro dev, essais) :
//   injectRoute({ pattern: "/sitemap-index.xml", entrypoint: ".../seo/sitemap-index.ts", prerender: false })
import { indexDuPlan } from "./route.ts";

export const prerender = false;

export const GET = indexDuPlan;
