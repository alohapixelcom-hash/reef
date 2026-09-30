// src/moteur/palette.ts - la couleur de la marque choisie dans le back office (generique) : une liste fermee de couleurs nommees juste, et la feuille qui repeint les jetons du theme.
//
// UN CHOIX CONTRAINT, PAS UN CHAMP LIBRE. L'entree "site" porte un champ
// "Couleur de la marque" dont les valeurs sont les cles de COULEURS : un
// editeur choisit "Bleu océan", il ne tape pas un code couleur qui casserait
// les contrastes.
//
// LA TEINTE EST CELLE QUE LE NOM DIT. Chaque couleur donne la
// teinte VISIBLE, sur la roue HSL : celle des boutons et des liens du site,
// quel que soit le theme. "Bleu océan" vaut 208, un bleu, partout. Le theme
// dit, dans son adaptateur (src/moteur/theme.ts, variablesDeLaPalette), quelle
// rampe de ses jetons porte cette couleur visible et comment il en deduit les
// autres, par la meme recette que son `pnpm rebrand`. Si sa rampe visible est
// une rotation de son accent, il remonte a l'accent par teinteAvantRotation :
// aucun decalage propre au socle a compenser.
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

/**
 * Le retour a la couleur livree avec le theme : la liste n'avait
 * que les cinq couleurs, et un client qui en avait choisi une ne savait pas
 * revenir en arriere (vider une liste deroulante n'est pas un geste connu).
 * Ce choix vaut vide : aucune feuille, la palette du theme.
 */
export const COULEUR_D_ORIGINE = "Couleur d'origine du thème";

/** Les choix du champ "Couleur de la marque", dans l'ordre de la graine : l'origine d'abord. */
export const CHOIX_DE_COULEUR: readonly string[] = [COULEUR_D_ORIGINE, ...Object.keys(COULEURS)];

/** Le contraste minimal du texte d'un bouton sur son fond (WCAG 2.1, niveau AA, texte courant). */
export const CONTRASTE_MINIMAL = 4.5;

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

/* --- Le contraste des boutons --------------------------------
   "Vert émeraude" rendait le texte blanc du bouton illisible (1,41:1, mesure
   du testeur dans Chrome). Chaque theme dit, dans theme.ts, quelles variables
   portent le fond de ses boutons et quelle encre s'ecrit dessus
   (CONTRASTE_DES_BOUTONS) ; garantirLeContraste assombrit (ou eclaircit) ces
   fonds, a teinte et saturation gardees, jusqu'a 4,5:1 au moins. Une couleur
   qui passe deja n'est pas touchee. */

/** Une couleur #rrggbb en composantes 0-1, ou null. */
function rvb(hexa: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexa.trim());
  return m ? ([m[1], m[2], m[3]].map((x) => Number.parseInt(x!, 16) / 255) as [number, number, number]) : null;
}

/** La luminance relative d'une couleur #rrggbb (WCAG 2.1). */
export function luminance(hexa: string): number {
  const c = rvb(hexa);
  if (!c) return 0;
  const [r, v, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}

/** Le rapport de contraste entre deux couleurs #rrggbb, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

function versHsl(hexa: string): [number, number, number] {
  const [r, v, b] = rvb(hexa) ?? [0, 0, 0];
  const max = Math.max(r, v, b);
  const min = Math.min(r, v, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((v - b) / d) % 6 : max === v ? (b - r) / d + 2 : (r - v) / d + 4;
  return [((h * 60) % 360 + 360) % 360, s, l];
}

function versHexa(h: number, s: number, l: number): string {
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Un fond de bouton et l'encre qui s'y ecrit : un nom de variable du theme, ou une couleur #rrggbb. */
export interface RegleDeContraste {
  fond: string;
  encre: string;
}

const lire = (vars: Record<string, string>, nom: string): string | null => (nom.startsWith("#") ? nom : (vars[nom] ?? null));

/**
 * Les variables d'une couleur de la marque, chaque fond de bouton pousse
 * jusqu'au contraste minimal avec son encre : plus sombre sous une encre
 * claire, plus clair sous une encre sombre, a teinte et saturation gardees.
 * Une regle qui nomme une variable absente est ignoree.
 */
export function garantirLeContraste(vars: Record<string, string>, regles: readonly RegleDeContraste[], minimum = CONTRASTE_MINIMAL): Record<string, string> {
  const sortie = { ...vars };
  for (const { fond, encre } of regles) {
    const couleurFond = sortie[fond];
    const couleurEncre = lire(sortie, encre);
    if (!couleurFond || !couleurEncre || !rvb(couleurFond) || !rvb(couleurEncre)) continue;
    if (contraste(couleurFond, couleurEncre) >= minimum) continue;
    const [h, s, l0] = versHsl(couleurFond);
    const sens = luminance(couleurEncre) > luminance(couleurFond) ? -1 : 1;
    let l = l0;
    let essai = couleurFond;
    for (let pas = 0; pas < 100 && contraste(essai, couleurEncre) < minimum; pas += 1) {
      l = Math.min(1, Math.max(0, l + sens * 0.01));
      essai = versHexa(h, s, l);
    }
    sortie[fond] = essai;
    // La rampe garde son ordre : un palier plus fort (le survol, souvent le
    // palier suivant) reste plus sombre qu'un fond assombri, un palier plus
    // faible reste plus clair qu'un fond eclairci.
    const m = /^(.*-)(\d+)$/.exec(fond);
    if (!m) continue;
    const paliers = Object.keys(sortie)
      .map((nom) => ({ nom, n: nom.startsWith(m[1]!) ? Number(nom.slice(m[1]!.length)) : Number.NaN }))
      .filter(({ n }) => Number.isInteger(n) && (sens < 0 ? n > Number(m[2]) : n < Number(m[2])))
      .sort((a, b) => (sens < 0 ? a.n - b.n : b.n - a.n));
    paliers.forEach(({ nom }, rang) => {
      const [hp, sp, lp] = versHsl(sortie[nom]!);
      const borne = l + sens * 0.04 * (rang + 1);
      const lu = sens < 0 ? Math.min(lp, Math.max(0.02, borne)) : Math.max(lp, Math.min(0.98, borne));
      if (lu !== lp) sortie[nom] = versHexa(hp, sp, lu);
    });
  }
  return sortie;
}

/** Les couleurs dont un fond de bouton reste sous le contraste minimal : vide quand chaque bouton se lit. */
export function couleursIllisibles(variables: (teinte: number) => Record<string, string>, regles: readonly RegleDeContraste[], minimum = CONTRASTE_MINIMAL): string[] {
  return (Object.keys(COULEURS) as NomDeCouleur[]).filter((nom) => {
    const vars = variables(COULEURS[nom]);
    return regles.some(({ fond, encre }) => {
      const a = lire(vars, fond);
      const b = lire(vars, encre);
      return !a || !b || contraste(a, b) < minimum;
    });
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
