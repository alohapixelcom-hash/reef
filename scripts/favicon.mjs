#!/usr/bin/env node
/**
 * scripts/favicon.mjs - fabrique les fichiers de favicon du site, au build.
 *
 * Usage :
 *   pnpm favicon       ecrit public/favicon.svg, public/favicon.ico,
 *                      public/favicon-96.png et public/apple-touch-icon.png
 *
 * POURQUOI DES FICHIERS, ET PAS UNE DATA-URI
 *
 * Le favicon a longtemps ete un SVG en data-uri, pose directement dans le
 * <head> : aucun fichier a servir, aucune requete de plus, et le dessin suivait
 * un `pnpm rebrand` sans rien regenerer. C'etait elegant et c'etait faux, pour
 * une raison qui ne se voit ni dans un navigateur ni dans un audit de page :
 *
 *   Google ne montre un favicon dans ses resultats que s'il peut le CRAWLER,
 *   et il ne lit que des images matricielles. Sa documentation liste BMP, GIF,
 *   ICO, PNG, JPEG, PPM et TIFF. Le SVG n'y est pas, et une data-uri n'est pas
 *   une adresse a crawler. Un site livre ainsi sort dans les resultats avec le
 *   globe gris generique, a cote de concurrents qui ont leur marque. Constate
 *   sur alohapixel.app le 2 septembre 2026, dans une vraie page de resultats.
 *
 * D'ou ce script, et d'ou l'inversion : le DESSIN vit ici et nulle part
 * ailleurs. BaseHead.astro ne fabrique plus d'icone, il pointe les fichiers.
 * Deux endroits qui dessinent la meme marque finissent par en dessiner deux.
 *
 * Les couleurs sont lues dans tokens.css a chaque execution, et le script
 * tourne au build : `pnpm rebrand` repeint donc le favicon comme il repeint le
 * reste, sans edition manuelle. Les fichiers produits sont versionnes, pour
 * qu'un `pnpm dev` sans build prealable ne serve pas une icone manquante.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");
const tokens = readFileSync(join(ROOT, "src/styles/tokens.css"), "utf8");

/* Le resolveur de jetons, le meme que celui de BaseHead.astro : il suit les
 * var() a travers les trois etages de tokens.css et LEVE une erreur s'il
 * n'aboutit pas, parce qu'un build qui echoue vaut mieux qu'un favicon qui
 * ment. C'est le seul morceau volontairement present des deux cotes : la barre
 * du navigateur en a besoin dans le <head>, le favicon en a besoin ici. Il est
 * mecanique et stable ; le dessin, lui, n'existe qu'ici. */
const cssBlock = (pattern) => pattern.exec(tokens)?.[1] ?? "";
const themeBlock = cssBlock(/@theme\s*\{([\s\S]*?)\n\}/);
const inlineBlock = cssBlock(/@theme inline\s*\{([\s\S]*?)\n\}/);
const lightBlock = cssBlock(/\n:root\s*\{([\s\S]*?)\n\}/);
const darkBlock = cssBlock(/\n\.dark[^{]*\{([\s\S]*?)\n\}/);

function resolveToken(name, scope, depth = 0) {
  if (depth > 8) throw new Error(`tokens.css : chaine de var() circulaire sur --${name}`);
  for (const source of [scope, inlineBlock, themeBlock, lightBlock]) {
    const hit = new RegExp(`--${name}:\\s*([^;]+);`).exec(source);
    if (!hit) continue;
    const value = hit[1].trim();
    const indirect = /^var\(--([a-z0-9-]+)\)$/.exec(value);
    return indirect ? resolveToken(indirect[1], scope, depth + 1) : value;
  }
  throw new Error(`tokens.css : jeton --${name} introuvable, le favicon ne peut pas etre peint`);
}

const groundDark = resolveToken("color-background", darkBlock);
const wave = resolveToken("color-accent", darkBlock);
const crest = resolveToken("color-primary", darkBlock);

/* Le dessin de la marque. Une ancre schematique posee sur sa ligne d'horizon. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${groundDark}"/><path d="M32 52V26" stroke="${wave}" stroke-width="7" stroke-linecap="round"/><path d="M32 34 22 24M32 38l10-10" stroke="${wave}" stroke-width="6" stroke-linecap="round"/><path d="M14 52h36" stroke="${crest}" stroke-width="5" stroke-linecap="round" opacity="0.9"/></svg>`;

/**
 * Assemble un .ico a partir de PNG deja encodes.
 *
 * Le format est un entete de 6 octets, puis une entree de 16 octets par taille,
 * puis les images bout a bout. Depuis Windows Vista, une entree peut contenir
 * un PNG tel quel plutot qu'un bitmap : c'est ce qu'on fait, donc aucune
 * dependance de plus, et sharp reste le seul outil. Une dimension de 256
 * s'ecrit 0 dans l'entete, qui ne lui reserve qu'un octet.
 */
function ico(images) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([head, ...entries, ...images.map((i) => i.data)]);
}

const png = (size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

mkdirSync(OUT, { recursive: true });

// Le SVG, pour les navigateurs qui savent le lire : net sur un ecran retine.
writeFileSync(join(OUT, "favicon.svg"), svg);

// L'ICO multi-tailles. C'est le fichier que les navigateurs demandent d'eux
// memes a /favicon.ico, et celui que Googlebot-Image sait lire. 16 et 32 pour
// l'onglet, 48 parce que Google recommande au-dela de 48 et prend la plus
// grande entree disponible.
const [i16, i32, i48] = await Promise.all([png(16), png(32), png(48)]);
writeFileSync(
  join(OUT, "favicon.ico"),
  ico([
    { size: 16, data: i16 },
    { size: 32, data: i32 },
    { size: 48, data: i48 },
  ]),
);

// L'icone iOS, posee sur l'ecran d'accueil quand on ajoute le site. 180 est la
// taille demandee par Safari ; pas de coins a arrondir, le systeme les decoupe.
writeFileSync(join(OUT, "apple-touch-icon.png"), await png(180));

// Une PNG carree de 96 : le format que la documentation de Google cite en
// exemple, et il coute deux kilo-octets.
writeFileSync(join(OUT, "favicon-96.png"), await png(96));

console.log("Favicon : favicon.svg, favicon.ico (16/32/48), favicon-96.png, apple-touch-icon.png");
