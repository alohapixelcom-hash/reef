// src/moteur/maintenance/textes.ts - choisit le dictionnaire de la page "Maintenance" : francais ou anglais, selon la langue du back office.
import { type LangueDesTextes, langueDesTextes } from "../langue-bo.regles";
import { EN } from "./textes.en";
import { FR } from "./textes.fr";

export type Textes = typeof FR;

const DICTIONNAIRES: Record<LangueDesTextes, Textes> = { fr: FR, en: EN };

/** Le dictionnaire de la personne qui ouvre la page. */
export function textesDe(requete: Request): Textes {
  return DICTIONNAIRES[langueDesTextes(requete, __ALOHA_BO_LANGUE__)];
}

/** Le dictionnaire de la langue par defaut du site : le libelle du menu est fige au demarrage. */
export const TEXTES_DU_SITE: Textes = DICTIONNAIRES[__ALOHA_BO_LANGUE__?.toLowerCase().split("-")[0] === "fr" ? "fr" : "en"];
