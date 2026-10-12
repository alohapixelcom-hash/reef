// src/moteur/accueil/identite.mjs - l'identite de l'extension "accueil" du back office (generique) : le tableau de bord en tuiles, ecrite une fois.
//
// Lu par la configuration du moteur (Node, d'ou le .mjs) et par extension.ts
// dans le Worker, comme les autres extensions de la maison. L'extension n'a
// ni page, ni route, ni base : une seule carte sur la page d'accueil d'EmDash.
export const IDENTITE = { id: "aloha-accueil", version: "1.0.0" };

/**
 * La carte de la page d'accueil d'EmDash. Son titre ne s'affiche pas (la
 * feuille accueil.css retire le cadre de la carte) ; il reste le nom lu par
 * un lecteur d'ecran si la feuille ne s'applique pas.
 * @type {{ id: string; size: "full" | "half" | "third"; title: string }[]}
 */
export const CARTES = [{ id: "tuiles", size: "full", title: "Votre site" }];
