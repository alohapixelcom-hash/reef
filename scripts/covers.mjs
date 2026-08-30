#!/usr/bin/env node
/**
 * scripts/covers.mjs - rapatrie les photographies du theme depuis Pexels,
 * avant le build.
 *
 * Usage :
 *   pnpm covers        telecharge src/assets/*.webp et src/assets/covers/*.webp
 *
 * Pourquoi un script et pas des fichiers versionnes : dix photographies dans
 * un depot, c'est un depot qui grossit a chaque retouche et un utilisateur qui
 * telecharge des octets qu'il remplacera. `pnpm build` appelle donc ce script
 * avant `astro build` : les fichiers arrivent, Astro les optimise comme
 * n'importe quel asset local, et le rendu final reste 100 pour cent statique.
 *
 * Filet de securite : si une adresse ne repond pas ET que le fichier existe
 * deja localement, on garde l'existant et on previent. Un reseau capricieux ne
 * doit pas casser un build. Si le fichier n'existe pas non plus, on arrete :
 * mieux vaut un build rouge qu'une page publiee avec une image manquante.
 *
 * Qui installe le theme remplace ce manifeste par ses propres adresses, ou
 * supprime l'appel dans "build" et depose ses images a la main.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Toutes les photographies viennent de Pexels et sont utilisees sous licence
// Pexels : usage commercial libre, aucune attribution exigee, modification
// autorisee. PHOTOS.md, a la racine, donne pour chaque fichier la page Pexels
// d'ou il vient. L'archive de Reef contient deja ces images : ce script ne sert
// qu'a une compilation faite depuis le depot.
//
// Les parametres de l'adresse ne sont pas decoratifs : fm=webp demande le WebP
// plutot que le JPEG d'origine, et w/h/fit=crop fixent le cadrage exact, celui
// que montre la demonstration. Sans eux, chaque compilation recadrerait un peu
// autrement.
const PEXELS = "https://images.pexels.com/photos";

const MANIFEST = {
  // Le premier ecran : la vague qui se creuse. C'est la photo de la maison, et
  // le logo du theme est une vague.
  "reef-hero-vague.webp": {
    url: `${PEXELS}/29275767/pexels-photo-29275767.jpeg?auto=compress&cs=srgb&fm=webp&w=1920&h=1081&fit=crop`,
    minWidth: 1920,
  },
  // Mesurer chez le lecteur : le soleil pose sur l'horizon donne l'echelle que
  // le large ne donne pas.
  "covers/reef-mesurer-lecteur.webp": {
    url: `${PEXELS}/14281585/pexels-photo-14281585.jpeg?auto=compress&cs=srgb&fm=webp&w=1200&h=1500&fit=crop`,
    minWidth: 1200,
  },
  // Un bon brief : un recif a une structure lisible, chaque chose a sa place.
  "covers/reef-bon-brief.webp": {
    url: `${PEXELS}/29290970/pexels-photo-29290970.jpeg?auto=compress&cs=srgb&fm=webp&w=1536&h=1920&fit=crop`,
    minWidth: 1200,
  },
  // Mode sombre : la meme matiere, la lumiere inversee.
  "covers/reef-mode-sombre.webp": {
    url: `${PEXELS}/35613489/pexels-photo-35613489.jpeg?auto=compress&cs=srgb&fm=webp&w=2500&h=1667&fit=crop`,
    minWidth: 1200,
  },
  // Une collection est un contrat : la tortue tient sa route parce que le
  // recif dessous a une structure.
  "covers/reef-collections-contrat.webp": {
    url: `${PEXELS}/20443161/pexels-photo-20443161.jpeg?auto=compress&cs=srgb&fm=webp&w=1600&h=1067&fit=crop`,
    minWidth: 1200,
  },
  // Le cout d'une police : ce qui parait leger de loin pese de pres.
  "covers/reef-cout-police.webp": {
    url: `${PEXELS}/12810721/pexels-photo-12810721.jpeg?auto=compress&cs=srgb&fm=webp&w=1200&h=1500&fit=crop`,
    minWidth: 1200,
  },
  // Un budget de performance : une vague a un budget avant de casser.
  "covers/reef-budget-performance.webp": {
    url: `${PEXELS}/29275767/pexels-photo-29275767.jpeg?auto=compress&cs=srgb&fm=webp&w=1200&h=1500&fit=crop`,
    minWidth: 1200,
  },
  // Une echelle typographique : des paliers qui s'etagent, et on voit le
  // suivant sans compter.
  "covers/reef-echelle-typo.webp": {
    url: `${PEXELS}/8985046/pexels-photo-8985046.jpeg?auto=compress&cs=srgb&fm=webp&w=1920&h=1500&fit=crop`,
    minWidth: 1200,
  },
  // Du HTML qui vieillit bien : la falaise est toujours la.
  "covers/reef-html-qui-vieillit.webp": {
    url: `${PEXELS}/4321834/pexels-photo-4321834.jpeg?auto=compress&cs=srgb&fm=webp&w=1600&h=1067&fit=crop`,
    minWidth: 1200,
  },
  // Chiffrer une refonte : vue du ciel, on mesure au lieu de deviner.
  "covers/reef-prix-refonte.webp": {
    url: `${PEXELS}/8332588/pexels-photo-8332588.jpeg?auto=compress&cs=srgb&fm=webp&w=1200&h=1500&fit=crop`,
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
