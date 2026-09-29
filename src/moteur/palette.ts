// src/moteur/palette.ts - la couleur de la marque choisie dans le back office (generique) : une liste fermee de couleurs nommees juste, et la feuille qui repeint les jetons du theme.
//
// UN CHOIX CONTRAINT, PAS UN CHAMP LIBRE. L'entree "site" porte un champ
// "Couleur de la marque" dont les valeurs sont les cles de COULEURS : un
// editeur choisit "Bleu océan", il ne tape pas un code couleur qui casserait
// les contrastes.
//
// LA TEINTE EST CELLE QUE LE NOM DIT (socle 1.3.0). Chaque couleur donne la
// teinte VISIBLE, sur la roue HSL : celle des boutons et des liens du site,
// quel que soit le theme. "Bleu océan" vaut 208, un bleu, partout. Le theme
// dit, dans son adaptateur (src/moteur/theme.ts, variablesDeLaPalette), quelle
// rampe de ses jetons porte cette couleur visible et comment il en deduit les
// autres, par la meme recette que son `pnpm rebrand`. Si sa rampe visible est
// une rotation de son accent, il remonte a l'accent par teinteAvantRotation :
// aucun decalage propre au socle a compenser.
// (Avant la 1.3.0, les teintes etaient celles de l'accent de Swell, dont la
// couleur visible est l'accent tourne de 250 degres : "Bleu océan" donnait un
// rose sur tout theme dont l'accent est la couleur visible.)
//
// Champ vide : aucune feuille, la palette du theme (le rendu d'origine).
// GENERIQUE et pur, sans import : le Worker le calcule a chaque page, en
// quelques microsecondes, et le build statique ne le lit jamais.

/** Les couleurs proposees, et leur teinte visible (roue HSL, en degres). */
export const COULEURS = {
  "Bleu océan": 208,
  "Bleu nuit": 230,
  "Vert émeraude": 160,
  "Rouge framboise": 345,
  "Orange soleil": 25,
} as const;

export type NomDeCouleur = keyof typeof COULEURS;

/** La teinte visible d'une couleur proposee, ou null pour une valeur vide ou inconnue. */
export function teinteDe(nom: unknown): number | null {
  return typeof nom === "string" && nom in COULEURS ? COULEURS[nom as NomDeCouleur] : null;
}

/** La teinte a donner a une rampe pour que cette rampe, tournee de `rotation` degres, tombe sur `visible`. */
export function teinteAvantRotation(visible: number, rotation: number): number {
  return (((visible - rotation) % 360) + 360) % 360;
}

/** La teinte d'une couleur #rrggbb sur la roue HSL (null pour un gris ou une valeur illisible) : de quoi verifier qu'une rampe dit bien son nom. */
export function teinteDuHexa(hexa: string): number | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexa.trim());
  if (!m) return null;
  const [r, v, b] = [m[1], m[2], m[3]].map((x) => Number.parseInt(x!, 16) / 255) as [number, number, number];
  const max = Math.max(r, v, b);
  const ecart = max - Math.min(r, v, b);
  if (ecart < 0.02) return null;
  const h = max === r ? ((v - b) / ecart) % 6 : max === v ? (b - r) / ecart + 2 : (r - v) / ecart + 4;
  return Math.round(((h * 60) % 360 + 360) % 360);
}

/**
 * Les couleurs dont la variable visible du theme s'ecarte de plus de `tolerance`
 * degres de la teinte nommee : vide quand chaque nom dit vrai. Le self-check
 * du theme l'appelle avec sa recette et la variable de ses boutons.
 */
export function couleursQuiMentent(variables: (teinte: number) => Record<string, string>, variableVisible: string, tolerance = 12): string[] {
  const ecart = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  return (Object.keys(COULEURS) as NomDeCouleur[]).filter((nom) => {
    const hexa = variables(COULEURS[nom])[variableVisible];
    const teinte = hexa ? teinteDuHexa(hexa) : null;
    return teinte === null || ecart(teinte, COULEURS[nom]) > tolerance;
  });
}

/** La feuille a poser dans la page pour cette couleur, ou null (aucune balise : le rendu d'origine). */
export function feuilleDeLaPalette(nom: unknown, variables: (teinte: number) => Record<string, string>): string | null {
  const teinte = teinteDe(nom);
  if (teinte === null) return null;
  return `:root{${Object.entries(variables(teinte))
    .map(([nomVar, valeur]) => `${nomVar}:${valeur}`)
    .join(";")}}`;
}
