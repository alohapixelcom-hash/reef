// src/moteur/catalogue-bo.config.mjs - le branchement du catalogue francais dans la configuration d'Astro : un alias et un greffon Vite, a poser depuis la config du site.
//
// PIECE DU SOCLE. Ce fichier s'appelle depuis la configuration Astro du site
// (Node, d'ou un .mjs) et rend tout ce qu'il faut pour que la page
// d'administration d'EmDash lise le catalogue complete de catalogue-bo.ts au
// lieu du catalogue brut du paquet. Le mode d'emploi complet est en tete de
// catalogue-bo.ts.
//
// POURQUOI UN GREFFON ET PAS UNE LIGNE D'ALIAS. L'integration d'EmDash pose
// elle-meme un alias de prefixe "@emdash-cms/admin" vers son dossier dist, et
// Astro range les alias des integrations AVANT ceux du projet. Or le premier
// alias qui correspond gagne : le notre, ajoute a la fin, ne serait jamais lu.
// Le crochet `config` d'un greffon est le seul endroit ou l'on peut se placer
// en tete, et Vite le prevoit explicitement (on modifie la configuration en
// place avant qu'elle soit resolue).
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/** Le nom sous lequel catalogue-bo.ts importe le vrai catalogue du moteur (declare pour TypeScript par catalogue-emdash.d.ts et tsconfig.json). */
export const NOM_DU_CATALOGUE_DU_MOTEUR = "@moteur/catalogue-emdash";

/** Le nom par lequel la page d'administration d'EmDash importe son catalogue. */
const NOM_LU_PAR_LA_PAGE = "@emdash-cms/admin/locales";

/**
 * Le chemin reel du catalogue de messages de l'administration. Il se resout
 * DEPUIS emdash : @emdash-cms/admin est sa dependance, pas celle du site, et
 * l'arborescence stricte de pnpm ne le met pas a portee de src/.
 *
 * @param {string} depuis l'URL (import.meta.url) d'un fichier du site, d'ou emdash se resout
 */
export function cheminDuCatalogueDuMoteur(depuis) {
  const depuisLeSite = createRequire(depuis);
  const depuisEmdash = createRequire(realpathSync(depuisLeSite.resolve("emdash")));
  return depuisEmdash.resolve("@emdash-cms/admin/locales/index.js");
}

/**
 * Ce que la configuration Astro du site etale dans `vite` : l'alias qui mene
 * catalogue-bo.ts au vrai catalogue, et le greffon qui met catalogue-bo.ts
 * sur le chemin de la page d'administration.
 *
 * @param {string} depuis l'URL (import.meta.url) du fichier de configuration qui appelle
 * @param {string} [catalogue] le chemin de catalogue-bo.ts, si le fichier n'est pas a cote de celui-ci
 * @returns {{ alias: { find: string, replacement: string }[], greffon: import("vite").Plugin }}
 */
export function catalogueDuBackOffice(depuis, catalogue = fileURLToPath(new URL("./catalogue-bo.ts", import.meta.url))) {
  return {
    alias: [{ find: NOM_DU_CATALOGUE_DU_MOTEUR, replacement: cheminDuCatalogueDuMoteur(depuis) }],
    greffon: {
      name: "aloha:catalogue-bo",
      config(configuration) {
        const alias = configuration.resolve?.alias;
        if (!Array.isArray(alias)) throw new Error("aloha:catalogue-bo : les alias de Vite ne sont plus un tableau");
        alias.unshift({ find: NOM_LU_PAR_LA_PAGE, replacement: catalogue });
      },
    },
  };
}
