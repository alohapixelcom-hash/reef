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

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = "https://alohapixel.com/wp-content/uploads";

// Chemin local (sous src/assets) -> adresse de la mediatheque.
// Le rapprochement n'est pas decoratif : chaque photo dit quelque chose du
// texte qu'elle annonce, et c'est note ici pour que le prochain qui change une
// image sache ce qu'il casse.
const MANIFEST = {
  // Le premier ecran et la scene de rappel.
  "reef-hero-vague.webp": `${MEDIA}/2026/08/ap-tube-de-vague-turquoise-translucide.webp`,
  "reef-hero-corail.webp": `${MEDIA}/2026/08/ap-recif-corallien-lumiere-de-fin-de-journee.webp`,

  // Mesurer chez le lecteur : des trains de houle, ca se compte au rivage.
  "covers/reef-mesurer-lecteur.webp": `${MEDIA}/2026/08/ap-longue-plage-et-trains-de-houle.webp`,
  // Un bon brief : la ligne d'ecume dit ou s'arrete le lagon et ou commence le large.
  "covers/reef-bon-brief.webp": `${MEDIA}/2026/08/ap-ecume-et-lagon-turquoise-vus-du-ciel.webp`,
  // Mode sombre : le meme lieu, la lumiere inversee.
  "covers/reef-mode-sombre.webp": `${MEDIA}/2026/08/ap-grotte-lagon-poster.webp`,
  // Une collection est un contrat : une pepiniere declare sa structure avant de pousser.
  "covers/reef-collections-contrat.webp": `${MEDIA}/2026/08/ap-pepiniere-de-coraux-sous-la-surface.webp`,
  // Le cout d'une police : ce qui parait leger de loin pese de pres.
  "covers/reef-cout-police.webp": `${MEDIA}/2026/08/ap-jardin-de-corail-banc-poissons-orange.webp`,
  // Un budget de performance : une vague a un budget avant de casser.
  "covers/reef-budget-performance.webp": `${MEDIA}/2026/08/ap-vague-turquoise-qui-se-creuse.webp`,
  // Une echelle typographique : un escalier, et on voit la marche suivante.
  "covers/reef-echelle-typo.webp": `${MEDIA}/2026/08/ap-escalier-colimacon-phare-vue-plongeante-1.webp`,
  // Du HTML qui vieillit bien : la falaise est toujours la.
  "covers/reef-html-qui-vieillit.webp": `${MEDIA}/2026/08/ap-falaises-vertes-plongeant-dans-la-mer.webp`,
  // Chiffrer une refonte : vue du ciel, on mesure au lieu de deviner.
  "covers/reef-prix-refonte.webp": `${MEDIA}/2026/05/Na-Pali-Coast-scaled.webp`,
};

let telecharges = 0;
let conserves = 0;

for (const [rel, url] of Object.entries(MANIFEST)) {
  const out = join(ROOT, "src/assets", rel);
  mkdirSync(dirname(out), { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1024) throw new Error("reponse trop courte");
    writeFileSync(out, buf);
    telecharges++;
  } catch (err) {
    if (existsSync(out)) {
      conserves++;
      console.warn(`  ! ${rel} : ${err.message}, copie locale conservee`);
      continue;
    }
    throw new Error(`${rel} introuvable et non telechargeable depuis ${url} : ${err.message}`);
  }
}

console.log(`${telecharges} visuels rapatries dans src/assets/` +
  (conserves ? `, ${conserves} conserves depuis la copie locale` : ""));
