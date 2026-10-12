// src/moteur/seo/identite.mjs - l'identite de l'extension "SEO" et les adresses qu'elle tient, ecrites une fois.
//
// Lu par la configuration du moteur (Node, d'ou le .mjs), par extension.ts
// dans le Worker, par l'aiguillage en tete du Worker et par le self-check.

export const IDENTITE = { id: "aloha-seo", version: "1.0.0" };

/** La page du rail : une seule, a la racine de l'extension (rang dans back-office-rail.css). */
export const PAGE_SEO = { path: "/", label: "SEO", icon: "magnifying-glass" };

/** Le plan vivant : toutes les adresses indexables, calculees a chaque requete. */
export const ROUTE_DU_PLAN = "/sitemap-moteur.xml";

/** L'index : le seul plan que robots.txt annonce, il ne cite que le plan vivant. */
export const ROUTE_DE_L_INDEX = "/sitemap-index.xml";

/** Le manifeste des pages figees, ecrit au build dans les fichiers publics par integration.mjs. */
export const MANIFESTE_DU_BUILD = "/_aloha/plan-fige.json";

/**
 * Les adresses que le Worker du moteur doit voir avant tout fichier du build
 * (run_worker_first) et que le frontal doit lui passer (versLeMoteur) : les
 * plans, robots.txt, llms.txt.
 */
export const ADRESSES_DU_SEO = /^\/(?:sitemap[^/]*\.xml|robots\.txt|llms\.txt)$/;
