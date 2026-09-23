// src/moteur/deployer/textes.ts - choisit le dictionnaire de la page "Tout deployer" : francais ou anglais, selon la langue du back office.
//
// Le back office n'a pas de dictionnaire du theme (src/i18n sert le site
// public). textes.fr.ts et textes.en.ts en tiennent lieu : aucune phrase
// affichee ne vit dans la logique, et une correction de wording ne touche
// qu'eux. La langue est celle que le moteur a choisie pour la personne (voir
// ../langue-bo.regles.ts) ; le libelle du menu, lui, est fige au demarrage :
// il suit la langue par defaut du site.
import { type LangueDesTextes, langueDesTextes } from "../langue-bo.regles";
import { EN } from "./textes.en";
import { FR } from "./textes.fr";

export type Textes = typeof FR;
export type { LangueDesTextes };

export const COMMANDE_DU_SECRET = "pnpm wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc";

const DICTIONNAIRES: Record<LangueDesTextes, Textes> = { fr: FR, en: EN };

/** La langue des textes du theme pour cette requete du back office. */
export function langueDe(requete: Request): LangueDesTextes {
  return langueDesTextes(requete, __ALOHA_BO_LANGUE__);
}

export function textesPour(langue: LangueDesTextes): Textes {
  return DICTIONNAIRES[langue];
}

/** Le dictionnaire de la langue par defaut du site : sert aux libelles figes au demarrage (entree de menu, titre de la carte). */
export const TEXTES_DU_SITE: Textes = textesPour(__ALOHA_BO_LANGUE__?.toLowerCase().split("-")[0] === "fr" ? "fr" : "en");
