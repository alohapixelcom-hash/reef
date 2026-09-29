// src/moteur/typographie.ts - la police du site choisie dans le back office (generique) : une liste fermee de familles deja installees sur chaque appareil, et la feuille qui repeint les jetons de police du theme.
//
// UN CHOIX CONTRAINT, PAS UN CHAMP LIBRE. L'entree "site" porte un champ
// "Police du site" dont les valeurs sont les cles de POLICES : un editeur
// choisit "Classique, à empattements", il ne tape pas un nom de police qui
// n'existerait pas chez son lecteur.
//
// AUCUN FICHIER DE PLUS. Chaque choix est une pile de polices du systeme
// (celles que l'appareil du lecteur a deja : San Francisco ou New York sur
// Apple, Segoe UI ou Cambria sur Windows, Roboto sur Android) : rien a
// telecharger, rien a precharger. Choisir une autre police que celle du theme
// rend la page plus legere, jamais plus lourde. Le theme dit, dans son
// adaptateur (src/moteur/theme.ts, VARIABLES_DE_POLICE), quels jetons portent
// la police du texte et celle des titres.
//
// Champ vide, ou "Police d'origine du thème" : aucune feuille, les polices du
// theme (le rendu d'origine), et le theme garde ses prechargements.
// GENERIQUE et pur, sans import : le Worker le calcule a chaque page, et le
// build statique ne le lit jamais.

/** Les piles de polices du systeme, de la plus precise a la plus generale. */
export const PILES = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, "New York", Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif',
} as const;

/** Les polices proposees : la pile du texte et celle des titres. */
export const POLICES = {
  "Police du système, la plus légère": { texte: PILES.sans, titre: PILES.sans },
  "Classique, à empattements": { texte: PILES.serif, titre: PILES.serif },
  "Titres classiques, texte sans empattements": { texte: PILES.sans, titre: PILES.serif },
} as const;

export type NomDePolice = keyof typeof POLICES;

/** Le retour aux polices livrees avec le theme : ce choix vaut vide. */
export const POLICE_D_ORIGINE = "Police d'origine du thème";

/** Les choix du champ "Police du site", dans l'ordre de la graine : l'origine d'abord. */
export const CHOIX_DE_POLICE: readonly string[] = [POLICE_D_ORIGINE, ...Object.keys(POLICES)];

/** Les jetons de police d'un theme : ceux du texte courant et ceux des titres. */
export interface VariablesDePolice {
  texte: readonly string[];
  titre: readonly string[];
}

/** Les piles d'une police proposee, ou null pour une valeur vide, inconnue ou l'origine. */
export function policeDe(nom: unknown): { texte: string; titre: string } | null {
  return typeof nom === "string" && nom in POLICES ? POLICES[nom as NomDePolice] : null;
}

/** Vrai quand la page garde les polices du theme (et donc leurs prechargements). */
export function policesDuTheme(nom: unknown): boolean {
  return policeDe(nom) === null;
}

/** La feuille a poser dans la page pour cette police, ou null (aucune balise : le rendu d'origine). */
export function feuilleDeLaTypographie(nom: unknown, variables: VariablesDePolice): string | null {
  const police = policeDe(nom);
  if (police === null) return null;
  const regles = [...variables.texte.map((v) => `${v}:${police.texte}`), ...variables.titre.map((v) => `${v}:${police.titre}`)];
  return regles.length > 0 ? `:root{${regles.join(";")}}` : null;
}
