// src/moteur/palette.ts - la couleur de la marque choisie dans le back office (generique) : une liste fermee de couleurs, et la feuille qui repeint les jetons du theme.
//
// UN CHOIX CONTRAINT, PAS UN CHAMP LIBRE. L'entree "site" porte un champ
// "Couleur de la marque" dont les valeurs sont les cles de COULEURS : un
// editeur choisit "Bleu océan", il ne tape pas un code couleur qui casserait
// les contrastes. Chaque couleur est une teinte d'accent ; le THEME dit, dans
// son adaptateur (src/moteur/theme.ts, variablesDeLaPalette), quelles
// variables de ses jetons cette teinte donne, par la meme recette que son
// `pnpm rebrand` : le theme reste dans ses jetons, seules les valeurs changent.
//
// Champ vide : aucune feuille, la palette du theme (le rendu d'origine).
// GENERIQUE et pur, sans import : le Worker le calcule a chaque page, en
// quelques microsecondes, et le build statique ne le lit jamais.

/** Les couleurs proposees, et la teinte de l'accent (roue HSL, en degres). */
export const COULEURS = {
  "Bleu océan": 318,
  "Bleu nuit": 340,
  "Vert émeraude": 270,
  "Rouge framboise": 95,
  "Orange soleil": 135,
} as const;

export type NomDeCouleur = keyof typeof COULEURS;

/** La teinte d'une couleur proposee, ou null pour une valeur vide ou inconnue. */
export function teinteDe(nom: unknown): number | null {
  return typeof nom === "string" && nom in COULEURS ? COULEURS[nom as NomDeCouleur] : null;
}

/** La feuille a poser dans la page pour cette couleur, ou null (aucune balise : le rendu d'origine). */
export function feuilleDeLaPalette(nom: unknown, variables: (teinte: number) => Record<string, string>): string | null {
  const teinte = teinteDe(nom);
  if (teinte === null) return null;
  return `:root{${Object.entries(variables(teinte))
    .map(([nomVar, valeur]) => `${nomVar}:${valeur}`)
    .join(";")}}`;
}
