// src/moteur/champs/identite.mjs - l'identite de l'extension "champs" du back office (generique) : ses champs de saisie, ecrite une fois.
//
// Comme pour les autres extensions de la maison : la configuration du moteur
// la lit au demarrage (Node, donc un fichier .mjs), et extension.ts la rend
// dans le Worker. Un champ de la graine s'y branche par son `widget` :
//   "widget": "aloha-champs:entree"
export const IDENTITE = { id: "aloha-champs", version: "1.0.0" };

/** Le nom du champ "une entree d'une autre collection, choisie par son nom". */
export const CHAMP_ENTREE = "entree";

/** La valeur du `widget` d'un champ de la graine qui prend ce champ de saisie. */
export const WIDGET_ENTREE = `${IDENTITE.id}:${CHAMP_ENTREE}`;

/**
 * Le nom du champ "garde sans l'afficher" : un champ que le site ne lit plus
 * (Reef 3.8.3 : les anciens mots-cles, remplaces par les etiquettes natives)
 * mais dont la colonne et les valeurs restent. EmDash 0.38 renvoie chaque
 * valeur de l'entree a l'enregistrement : retirer la definition du champ
 * ferait refuser l'enregistrement ("unknown field"). Le champ reste donc
 * defini, sa valeur voyage intacte, et l'ecran n'en montre rien.
 */
export const CHAMP_CACHE = "cache";
