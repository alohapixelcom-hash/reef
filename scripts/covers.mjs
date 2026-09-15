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

import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

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
const MANIFEST = JSON.parse(readFileSync(new URL("./covers.json", import.meta.url), "utf8"));

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

// Le cache associe les octets a leur URL : changer le manifeste invalide l'image.
// Le hash refuse une copie tronquee ou modifiee. --refresh force le reseau.
const cachePath = join(ROOT, "node_modules/.cache/reef-covers.json");
let cache = {};
try { cache = JSON.parse(readFileSync(cachePath, "utf8")); } catch { /* premier build */ }
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const refresh = process.argv.includes("--refresh");
let reutilises = 0;
let telecharges = 0;
let conserves = 0;

for (const [rel, { url, minWidth }] of Object.entries(MANIFEST)) {
  const out = join(ROOT, "src/assets", rel);
  mkdirSync(dirname(out), { recursive: true });
  if (!refresh && cache[rel]?.url === url && existsSync(out)) {
    const local = readFileSync(out);
    if (largeurWebp(local) >= minWidth && hash(local) === cache[rel].sha256) {
      reutilises++;
      continue;
    }
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const large = largeurWebp(buf);
    if (large < minWidth) {
      throw new Error(`${large} px de large, il en faut ${minWidth}`);
    }
    // Valider avant de remplacer la copie existante, puis remplacement atomique.
    writeFileSync(`${out}.tmp`, buf);
    renameSync(`${out}.tmp`, out);
    cache[rel] = { url, sha256: hash(buf) };
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

mkdirSync(dirname(cachePath), { recursive: true });
writeFileSync(cachePath, JSON.stringify(cache));
console.log(`${reutilises} visuels reutilises sans reseau, ${telecharges} visuels rapatries dans src/assets/` +
  (conserves ? `, ${conserves} conserves depuis la copie locale` : ""));
