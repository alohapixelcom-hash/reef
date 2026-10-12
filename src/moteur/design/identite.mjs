// src/moteur/design/identite.mjs - l'identite de l'extension "Design" et sa page du rail, ecrites une fois.
//
// Lu par la configuration du moteur (Node, d'ou le .mjs), par extension.ts
// dans le Worker et par le self-check du rail. L'identifiant entre dans
// l'adresse de la page (/_emdash/admin/plugins/aloha-design/) et dans son
// rang de back-office-rail.css : il ne change jamais.
export const IDENTITE = { id: "aloha-design", version: "1.0.0" };

/** La page du rail : une seule, a la racine de l'extension. */
export const PAGE_DESIGN = { path: "/", label: "Design", icon: "palette" };
