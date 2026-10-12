// src/moteur/medias/textes.ts - choisit le dictionnaire de la carte "Photos" : francais ou anglais, selon la langue du back office.
//
// Meme regle que l'extension deployer (langue-bo.regles.ts). La constante
// __ALOHA_BO_LANGUE__ est posee par moteur.config.mjs ; un back office qui ne
// la pose pas (celui de la boutique) recoit le francais, sans erreur : la
// declaration locale ci-dessous evite de dependre de constantes.d.ts.
import { type LangueDesTextes, langueDesTextes } from "../langue-bo.regles";
import { EN } from "./textes.en";
import { FR } from "./textes.fr";

declare const __ALOHA_BO_LANGUE__: string | null | undefined;

export type Textes = typeof FR;

const DEFAUT: string = typeof __ALOHA_BO_LANGUE__ === "string" ? __ALOHA_BO_LANGUE__ : "fr";

export function textesDe(requete: Request): { langue: LangueDesTextes; textes: Textes } {
  const langue = langueDesTextes(requete, DEFAUT);
  return { langue, textes: langue === "fr" ? FR : EN };
}

/** Le titre de la carte, fige au demarrage : il suit la langue par defaut du site. */
export const TITRE_DE_LA_CARTE = (DEFAUT.toLowerCase().startsWith("fr") ? FR : EN).carte;
