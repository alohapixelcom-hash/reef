// src/moteur/seo/sitemap-moteur.ts - le point d'entree de la route /sitemap-moteur.xml (injectRoute dans moteur.config.mjs) : le plan vivant avec les reglages du site.
//
// moteur.config.mjs du site :
//   injectRoute({ pattern: "/sitemap-moteur.xml", entrypoint: ".../seo/sitemap-moteur.ts", prerender: false })
// Un motif sans parametre passe devant /sitemap-[collection].xml d'EmDash et
// devant toute route attrape-tout du site (priorite des routes d'Astro).
import { planVivant } from "./route.ts";
import { PLAN } from "./site.ts";

export const prerender = false;

export const GET = planVivant(PLAN);
