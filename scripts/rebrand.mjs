#!/usr/bin/env node
/**
 * scripts/rebrand.mjs - repeint tout le theme Reef depuis UNE couleur de marque.
 *
 * Usage :
 *   pnpm rebrand "#7a59ff"                  la couleur d'accent de TA marque
 *   pnpm rebrand "#7a59ff" --dark "#141b27"  en imposant la teinte du neutre
 *   pnpm rebrand --restore                   retour a la palette Reef d'origine
 *
 * Ce que ca fait : regenere les quatre rampes brutes de tokens.css puis reecrit
 * uniquement ces lignes :
 *   - "ink"    : le neutre FROID et sombre (l'eau profonde, la nuit) ;
 *   - "paper"  : le neutre clair, bleute lui aussi, coherent avec l'encre ;
 *   - "coral"  : l'accent de la maison, qui devient TA couleur ;
 *   - "reef"   : le second accent, une aigue-marine franche.
 * Reef a DEUX rampes de neutre, ink (sombre) et paper (clair) : les deux sont
 * regenerees sur la meme teinte d'ancrage pour rester coherentes.
 * Le reste du fichier, et tout le markup du theme, ne bougent pas : le markup
 * ne connait que les alias semantiques (bg-background, bg-primary...).
 *
 * Zero dependance : conversions HSL maison, suffisantes pour des rampes UI.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = join(ROOT, "src/styles/tokens.css");
const BACKUP = join(ROOT, "src/styles/tokens.original.css");

/* ----------------------------- couleur ------------------------------ */

function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Couleur invalide: "${hex}" (attendu #rrggbb)`);
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Rampe d'accent : la meme teinte declinee sur une courbe de luminosite
// eprouvee, avec la saturation qui respire (pleine au centre, douce aux
// extremes). anchorL cale la courbe sur la luminosite reelle de la couleur
// saisie : une marque claire ne doit pas etre assombrie de force, ni l'inverse.
// Le decalage est amorti vers les extremes, sinon un accent tres clair
// emporterait le 900 dans le gris et un accent tres sombre brulerait le 50.
function ramp(h, s, stops, anchorL = null, anchorStep = 400) {
  const out = {};
  const base = stops.find(([step]) => step === anchorStep)?.[1] ?? 0.5;
  const delta = anchorL === null ? 0 : anchorL - base;
  const n = stops.length - 1;
  const iAnchor = stops.findIndex(([step]) => step === anchorStep);
  for (let i = 0; i < stops.length; i++) {
    const [step, l, satMul] = stops[i];
    // Poids 1 sur le pas d'ancrage, decroissant jusqu'a 0.35 aux extremes.
    const poids = 1 - (Math.abs(i - iAnchor) / Math.max(1, n)) * 0.65;
    const lFinal = Math.min(0.985, Math.max(0.03, l + delta * poids));
    out[step] = hslToHex(h, Math.min(1, s * satMul), lFinal);
  }
  return out;
}

// Rampe a saturation FIXE : pour les neutres et le second accent, dont la
// saturation ne suit pas la marque mais reste calee, pas par pas, sur la
// signature du theme. Chaque pas porte sa propre paire (luminosite, saturation)
// mesuree sur la palette Reef d'origine ; seule la teinte est reportee.
function rampeFixe(h, stops) {
  const out = {};
  for (const [step, l, s] of stops) out[step] = hslToHex(h, s, l);
  return out;
}

// Le corail de la maison : L de 97% (50) a 30% (900), saturation pleine en haut
// qui retombe vers 70% en bas. Commun aux cinq themes du catalogue.
const CORAL_STOPS = [
  [50, 0.97, 0.55], [100, 0.93, 0.7], [200, 0.85, 0.85], [300, 0.75, 0.95],
  [400, 0.63, 1.0], [500, 0.55, 1.0], [600, 0.47, 0.95], [700, 0.39, 0.9],
  [800, 0.33, 0.85], [900, 0.28, 0.8],
];

// Ink : le neutre sombre de Reef. Un bleu tres profond, jamais un gris neutre
// et jamais un brun : c'est de l'eau profonde, pas de la terre. La saturation
// (22 a 40 %) monte a mesure qu'on descend, ce qui donne un fond allume de
// l'interieur plutot qu'eteint. Onze pas, du 50 au 950.
// Chaque pas : [pas, luminosite, saturation].
const INK_STOPS = [
  [50, 0.965, 0.4], [100, 0.93, 0.34], [200, 0.85, 0.3], [300, 0.72, 0.26],
  [400, 0.56, 0.22], [500, 0.42, 0.23], [600, 0.32, 0.26], [700, 0.25, 0.27],
  [800, 0.17, 0.3], [900, 0.12, 0.32], [950, 0.06, 0.38],
];

// Paper : le neutre clair. Il porte la meme pointe de bleu que l'encre, pas de
// jaune : quelques points de teinte suffisent a poser le repos, dans le meme
// sens que le reste du theme. Trois pas seulement, du 50 au 200.
const PAPER_STOPS = [
  [50, 0.985, 0.55], [100, 0.96, 0.44], [200, 0.92, 0.38],
];

// Reef : le second accent, la signature du theme. Une aigue-marine franche,
// plus bleue que le lagon vert d'Aloha, saturee (72 a 78 %) : sujets, etats
// "publie", liens deja lus. Jamais en concurrence avec le corail sur un meme
// appel a l'action. Quatre pas seulement, du 300 au 600.
const REEF_STOPS = [
  [300, 0.72, 0.78], [400, 0.56, 0.72], [500, 0.44, 0.77], [600, 0.35, 0.78],
];

/* ------------------------------ cli --------------------------------- */

const args = process.argv.slice(2);

if (args.includes("--restore")) {
  if (!existsSync(BACKUP)) {
    console.error("Aucune sauvegarde trouvee (tokens.original.css). Rien a restaurer.");
    process.exit(1);
  }
  copyFileSync(BACKUP, TOKENS);
  console.log("Palette Reef d'origine restauree.");
  process.exit(0);
}

const accentHex = args.find((a) => !a.startsWith("--"));
if (!accentHex) {
  console.error('Usage: pnpm rebrand "#rrggbb" [--dark "#rrggbb"] | pnpm rebrand --restore');
  process.exit(1);
}

const accent = hexToHsl(accentHex);
const darkArg = args.includes("--dark") ? args[args.indexOf("--dark") + 1] : null;

// Les deux rotations de teinte sont celles de la palette Reef d'origine,
// mesurees sur elle : corail ~12, ink/paper ~217, reef ~193. Soit +205 pour le
// neutre et +181 pour le second accent. Une valeur arbitraire transformerait
// l'aigue-marine en analogue du corail et detruirait le systeme a deux accents
// sur lequel repose toute la direction artistique.
const ROTATION_INK = 205;
const ROTATION_REEF = 181;

// La rampe froide d'ancrage : la teinte de l'accent tournee vers le bleu, tres
// desaturee sur le clair et rallumee sur le sombre. C'est le contraste
// chaud/froid qui fait la direction artistique de Reef.
/**
 * La teinte d'ancrage des neutres. La rotation seule ne suffit pas : depuis un
 * accent deja froid (un violet, un bleu), tourner de +205 retombe dans les
 * jaunes et produit un fond sombre olive. Or toute la DA de Reef repose sur un
 * accent chaud pose sur un fonce FROID et bleute.
 *
 * La regle, dans cet ordre :
 *   1. on tourne ; si le resultat est froid, on le garde ;
 *   2. sinon, si l'accent lui-meme est froid, l'ancrage devient un camaieu
 *      sombre de l'accent, ce qui est toujours juste ;
 *   3. sinon, on ramene sur le bord le plus proche de la bande froide.
 *
 * --dark reste la porte de sortie pour qui veut imposer autre chose.
 */
const FROID_MIN = 150;
const FROID_MAX = 280;
const estFroid = (h) => h >= FROID_MIN && h <= FROID_MAX;

function teinteAncrage(accentH) {
  const tournee = (accentH + ROTATION_INK) % 360;
  if (estFroid(tournee)) return tournee;
  const brut = accentH % 360;
  if (estFroid(brut)) return brut;
  return Math.abs(tournee - FROID_MIN) <= Math.abs(tournee - FROID_MAX) ? FROID_MIN : FROID_MAX;
}

const ancrageH = darkArg ? hexToHsl(darkArg).h : teinteAncrage(accent.h);

const coralRamp = ramp(accent.h, Math.max(0.5, accent.s), CORAL_STOPS, accent.l, 400);
// La couleur de marque est rendue au pixel pres sur le pas 400 : c'est celle
// que l'utilisateur a tapee, elle ne doit pas etre approchee.
coralRamp[400] = accentHex.toLowerCase();
const inkRamp = rampeFixe(ancrageH, INK_STOPS);
const paperRamp = rampeFixe(ancrageH, PAPER_STOPS);
const reefRamp = rampeFixe((accent.h + ROTATION_REEF) % 360, REEF_STOPS);

/* --------------------------- reecriture ----------------------------- */

let css = readFileSync(TOKENS, "utf8");
if (!existsSync(BACKUP)) copyFileSync(TOKENS, BACKUP);

let replaced = 0;
const swap = (family, step, hex) => {
  const re = new RegExp(`(--color-${family}-${step}:\\s*)#[0-9a-fA-F]{6}`);
  if (re.test(css)) {
    css = css.replace(re, `$1${hex}`);
    replaced++;
  }
};

for (const [step, hex] of Object.entries(inkRamp)) swap("ink", step, hex);
for (const [step, hex] of Object.entries(paperRamp)) swap("paper", step, hex);
for (const [step, hex] of Object.entries(coralRamp)) swap("coral", step, hex);
for (const [step, hex] of Object.entries(reefRamp)) swap("reef", step, hex);

writeFileSync(TOKENS, css);
console.log(`Rebrand applique : ${replaced} tokens reecrits depuis ${accentHex}.`);
console.log(
  `Accent ${accentHex} pose exactement sur coral-400. Neutres ink-*/paper-* ancres sur la teinte froide ${Math.round(ancrageH)} (${darkArg ? "--dark" : `auto +${ROTATION_INK}`}), second accent reef-* a +${ROTATION_REEF}.`,
);
console.log("Retour arriere : pnpm rebrand --restore");
