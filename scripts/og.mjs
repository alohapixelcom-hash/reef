#!/usr/bin/env node
/**
 * scripts/og.mjs - fabrique les cartes de partage Open Graph du site, au build, a partir des photos du theme.
 *
 * Usage :
 *   pnpm og            ecrit public/og/<slug>.jpg (1200x630) depuis la table CARTES ci-dessous
 *
 * LA REGLE (23 septembre 2026, a vie) : une carte de partage est UNE PHOTO ET
 * RIEN D'AUTRE. Ni degrade, ni grille, ni surtitre, ni titre, ni vague, ni
 * cercles, ni domaine, ni panneau, ni capture d'ecran. La plateforme qui
 * affiche l'apercu (Facebook, LinkedIn, X, iMessage, Slack) ecrit deja le
 * titre et le domaine sous l'image, a partir de og:title et de og:url : les
 * redessiner dans l'image, c'est les lire deux fois, en plus petit, et rogner
 * par la plateforme selon son propre cadrage. Une photo pleine se lit a
 * n'importe quelle taille de vignette.
 *
 * POURQUOI AU BUILD ET PAS VERSIONNEES : chaque carte est un recadrage d'une
 * photo deja rapatriee par scripts/covers.mjs dans src/assets. `pnpm build`
 * lance covers.mjs, puis ce script, puis `astro build` : un depot propre, une
 * CI ou un acheteur qui remplace ses photos obtient des cartes a jour sans
 * rien commiter. Des fichiers versionnes vieillissaient en silence : la carte
 * montrait encore la demo apres un changement de photo. public/og/ est donc
 * ignore par git, et ce script en est le seul proprietaire : il y efface tout
 * fichier qu'il n'a pas fabrique (les anciennes cartes .png des versions
 * precedentes, par exemple).
 *
 * Le recadrage est celui du site de l'agence : sharp, 1200x630, fit "cover",
 * position "attention" (la zone la plus contrastee et la plus saturee reste
 * dans le cadre), JPEG qualite 86, mozjpeg, sans sous-echantillonnage des
 * couleurs (4:4:4), pour que l'ecume et le ciel ne bavent pas.
 *
 * Personnalisation : une page qui veut sa propre carte ajoute une ligne a
 * CARTES et passe image={{ src: "/og/<slug>.jpg", alt }} a sa mise en page.
 * Une carte que plus aucune page ne cite se retire de CARTES.
 */

import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "src/assets");
const OUT = join(ROOT, "public/og");
const LARGEUR = 1200;
const HAUTEUR = 630;

// Une ligne par carte REELLEMENT citee par une page. Aujourd'hui une seule :
// siteData.defaultImage, que toutes les pages utilisent, sauf un billet qui a
// une couverture (ArticlePage prend alors la couverture elle-meme). La photo
// est celle du premier ecran de l'accueil, la vague de Hawaii.
const CARTES = [
  { slug: "default", photo: "reef-hero-vague.webp" },
];

/** Recadre une photo du theme en carte 1200x630 et verifie le resultat. */
export async function fabriquerCarte({ slug, photo }, sortie = OUT) {
  const source = join(ASSETS, photo);
  if (!existsSync(source)) {
    throw new Error(
      `og: la photo src/assets/${photo} manque pour la carte "${slug}". ` +
        "Lancez d'abord `node scripts/covers.mjs` (ou `pnpm covers`), qui rapatrie les photos du theme.",
    );
  }
  mkdirSync(sortie, { recursive: true });
  const fichier = join(sortie, `${slug}.jpg`);
  await sharp(source)
    .resize(LARGEUR, HAUTEUR, { fit: "cover", position: "attention" })
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(fichier);
  const { width, height, format } = await sharp(fichier).metadata();
  if (width !== LARGEUR || height !== HAUTEUR || format !== "jpeg") {
    throw new Error(`og: ${fichier} fait ${width}x${height} (${format}), il faut ${LARGEUR}x${HAUTEUR} en JPEG`);
  }
  return fichier;
}

const fabriquees = [];
for (const carte of CARTES) fabriquees.push(await fabriquerCarte(carte));

// Le dossier appartient a ce script : ce qu'il n'a pas fabrique ce tour-ci
// n'est cite par aucune page et partirait en ligne pour rien.
const attendus = new Set(CARTES.map((c) => `${c.slug}.jpg`));
const retires = readdirSync(OUT).filter((nom) => !attendus.has(nom));
for (const nom of retires) rmSync(join(OUT, nom), { recursive: true, force: true });

console.log(`${fabriquees.length} carte(s) de partage fabriquee(s) dans public/og/ :`);
CARTES.forEach((c, i) => console.log(`  ${fabriquees[i].replace(ROOT + "/", "")} <- src/assets/${c.photo}`));
if (retires.length) console.log(`  retire(s), plus cite(s) par aucune page : ${retires.join(", ")}`);
