#!/usr/bin/env node
/**
 * scripts/covers.mjs - rapatrie la photographie du theme depuis la mediatheque
 * d'alohapixel.com, avant le build.
 *
 * Usage :
 *   pnpm covers        telecharge src/assets/*.webp et src/assets/covers/*.webp
 *
 * Pourquoi un script et pas des fichiers versionnes : les visuels de la demo
 * sont ceux de la maison, ils vivent sur alohapixel.com, et c'est la qu'ils
 * sont mis a jour. Les dupliquer dans le depot, c'est garantir qu'une des deux
 * copies sera fausse un jour. `pnpm build` appelle donc ce script avant
 * `astro build` : les fichiers arrivent, Astro les optimise comme n'importe
 * quel asset local, et le rendu final reste 100 pour cent statique.
 *
 * Filet de securite : si une adresse ne repond pas ET que le fichier existe
 * deja localement, on garde l'existant et on previent. Un reseau capricieux ne
 * doit pas casser un build. Si le fichier n'existe pas non plus, on arrete :
 * mieux vaut un build rouge qu'une page publiee avec une image manquante.
 *
 * Qui achete le theme remplace ce manifeste par ses propres adresses, ou
 * supprime l'appel dans "build" et depose ses images a la main.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = "https://alohapixel.com/wp-content/uploads";

// Chemin local (sous src/assets) -> adresse de la mediatheque, et largeur
// minimale exigee.
//
// La largeur minimale n'est pas une precaution de principe : le premier ecran
// est servi en `sizes="100vw"` avec une variante 1920, donc une source de
// 1200 pixels y est etiree et se voit immediatement. Une couverture d'article,
// elle, ne depasse jamais 700 pixels de large dans la grille. Chaque entree
// declare donc ce dont elle a besoin, et le script refuse une image trop
// petite au lieu de publier du flou.
//
// Le rapprochement photo / sujet n'est pas decoratif non plus : chaque image
// dit quelque chose du texte qu'elle annonce, et c'est note ici pour que le
// prochain qui en change une sache ce qu'il casse.
const MANIFEST = {
  // Le premier ecran : la vague qui deroule devant la cote verte. C'est la
  // photo de la maison, et le logo du theme est une vague.
  "reef-hero-vague.webp": {
    url: `${MEDIA}/2024/10/mountains-to-the-sea-scaled.webp`,
    minWidth: 1920,
  },

  // Mesurer chez le lecteur : des trains de houle, ca se compte au rivage.
  "covers/reef-mesurer-lecteur.webp": {
    url: `${MEDIA}/2026/08/ap-longue-plage-et-trains-de-houle.webp`,
    minWidth: 1200,
  },
  // Un bon brief : la ligne d'ecume dit ou s'arrete le lagon et ou commence le large.
  "covers/reef-bon-brief.webp": {
    url: `${MEDIA}/2026/08/ap-ecume-et-lagon-turquoise-vus-du-ciel.webp`,
    minWidth: 1200,
  },
  // Mode sombre : le meme lieu, la lumiere inversee.
  "covers/reef-mode-sombre.webp": {
    url: `${MEDIA}/2026/08/ap-grotte-lagon-poster.webp`,
    minWidth: 1200,
  },
  // Une collection est un contrat : une pepiniere declare sa structure avant de pousser.
  "covers/reef-collections-contrat.webp": {
    url: `${MEDIA}/2026/08/ap-pepiniere-de-coraux-sous-la-surface.webp`,
    minWidth: 1200,
  },
  // Le cout d'une police : ce qui parait leger de loin pese de pres.
  "covers/reef-cout-police.webp": {
    url: `${MEDIA}/2026/08/ap-jardin-de-corail-banc-poissons-orange.webp`,
    minWidth: 1200,
  },
  // Un budget de performance : une vague a un budget avant de casser.
  "covers/reef-budget-performance.webp": {
    url: `${MEDIA}/2026/08/ap-vague-turquoise-qui-se-creuse.webp`,
    minWidth: 1200,
  },
  // Une echelle typographique : un escalier, et on voit la marche suivante.
  "covers/reef-echelle-typo.webp": {
    url: `${MEDIA}/2026/08/ap-escalier-colimacon-phare-vue-plongeante-1.webp`,
    minWidth: 1200,
  },
  // Du HTML qui vieillit bien : la falaise est toujours la.
  "covers/reef-html-qui-vieillit.webp": {
    url: `${MEDIA}/2026/08/ap-falaises-vertes-plongeant-dans-la-mer.webp`,
    minWidth: 1200,
  },
  // Chiffrer une refonte : vue du ciel, on mesure au lieu de deviner.
  "covers/reef-prix-refonte.webp": {
    url: `${MEDIA}/2026/05/Na-Pali-Coast-scaled.webp`,
    minWidth: 1200,
  },
};

// Largeur d'un WebP, lue dans l'en-tete. Trois formes existent et il faut les
// trois : VP8 pour le compresse avec perte, VP8L pour le sans perte, VP8X pour
// le format etendu (transparence, animation). Aucune dependance ajoutee pour
// autant : c'est vingt lignes.
function largeurWebp(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF") return 0;
  const type = buf.toString("ascii", 12, 16);
  if (type === "VP8X") return (buf.readUIntLE(24, 3) & 0xffffff) + 1;
  if (type === "VP8 ") return buf.readUInt16LE(26) & 0x3fff;
  if (type === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return (bits & 0x3fff) + 1;
  }
  return 0;
}

let telecharges = 0;
let conserves = 0;

for (const [rel, { url, minWidth }] of Object.entries(MANIFEST)) {
  const out = join(ROOT, "src/assets", rel);
  mkdirSync(dirname(out), { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const large = largeurWebp(buf);
    if (large && large < minWidth) {
      throw new Error(`${large} px de large, il en faut ${minWidth}`);
    }
    writeFileSync(out, buf);
    telecharges++;
  } catch (err) {
    if (existsSync(out) && largeurWebp(readFileSync(out)) >= minWidth) {
      conserves++;
      console.warn(`  ! ${rel} : ${err.message}, copie locale conservee`);
      continue;
    }
    throw new Error(`${rel} : ${err.message} (source ${url})`);
  }
}

console.log(`${telecharges} visuels rapatries dans src/assets/` +
  (conserves ? `, ${conserves} conserves depuis la copie locale` : ""));
