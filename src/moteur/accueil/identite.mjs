// src/moteur/accueil/identite.mjs - l'identite de l'extension "carte du site" du tableau de bord, ecrite une fois.
//
// Comme pour "Tout deployer" : moteur.config.mjs la lit au demarrage (Node,
// donc un fichier .mjs), et extension.ts la rend dans le Worker.
export const IDENTITE = { id: "aloha-accueil", version: "1.0.0" };

/** L'identifiant de la carte dans le tableau de bord, partage par l'extension et par son composant. */
export const CARTE = "site";
