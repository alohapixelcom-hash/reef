// src/moteur/accueil/textes.ts - les textes de la carte du tableau de bord, en francais et en anglais.
//
// Le composant du navigateur n'a pas de dictionnaire : la route `etat` lui
// rend les phrases deja choisies, dans la langue du back office de la
// personne (voir ../langue-bo.regles.ts).
import type { LangueDesTextes } from "../langue-bo.regles";

export interface TextesDeLaCarte {
  titre: string;
  dernier: string;
  aucun: string;
  version: string;
  construit: (quand: string) => string;
  voir: string;
  deployer: string;
  nouvelOnglet: string;
}

export const TEXTES_DE_LA_CARTE: Record<LangueDesTextes, TextesDeLaCarte> = {
  fr: {
    titre: "Le site",
    dernier: "Dernier contenu publié",
    aucun: "Rien n'est encore publié.",
    version: "Version servie",
    construit: (quand) => `Build du ${quand}`,
    voir: "Voir le site",
    deployer: "Tout déployer",
    nouvelOnglet: "s'ouvre dans un nouvel onglet",
  },
  en: {
    titre: "Your site",
    dernier: "Last published content",
    aucun: "Nothing is published yet.",
    version: "Version served",
    construit: (quand) => `Build from ${quand}`,
    voir: "View the site",
    deployer: "Deploy everything",
    nouvelOnglet: "opens in a new tab",
  },
};
