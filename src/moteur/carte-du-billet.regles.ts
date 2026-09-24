// src/moteur/carte-du-billet.regles.ts - les regles pures de la carte de partage d'un billet : son format, et l'adresse qui recadre une couverture de la mediatheque.
//
// LA REGLE DE LA MAISON : une carte de partage (og:image, twitter:image) est
// une photo en JPEG 1200x630. Moteur allume, la couverture d'un billet vit
// dans la mediatheque d'EmDash (/_emdash/api/media/file/<cle>) : un WebP a sa
// taille d'origine, jusqu'a 556 Ko et parfois en portrait (1200x1500), que
// les pages d'article donnaient telle quelle comme og:image (mesure en ligne
// le 24 septembre 2026).
//
// POURQUOI PAS /_image. Pour une image de la mediatheque, le point d'entree
// d'images qu'EmDash installe sous Cloudflare ne transmet au liant IMAGES que
// la largeur et la hauteur, jamais `fit` : le liant garde alors les
// proportions (scale-down), et un portrait 1200x1500 sortait en 504x630. La
// carte passe donc par une route du theme (carte-du-billet.ts), qui lit la
// couverture dans le stockage comme EmDash le fait et la recadre en `cover`.
//
// Pur, sans import : le self-check (carte-du-billet.selfcheck.ts) le verifie.

/** Le format d'une carte de partage : celui de public/og/*.jpg (scripts/og.mjs), qualite du build JPEG. */
export const CARTE = { largeur: 1200, hauteur: 630, qualite: 80 } as const;

/** L'adresse des fichiers de la mediatheque d'EmDash. */
const MEDIATHEQUE = "/_emdash/api/media/file/";

/** Une cle de stockage plate, comme EmDash l'exige : ni barre, ni echappement. */
const CLE_SURE = /^[A-Za-z0-9._-]+$/;

/** Le prefixe de la route des cartes. moteur.config.mjs l'injecte sous "/og/billet/[cle].jpg". */
const PREFIXE_DE_LA_CARTE = "/og/billet/";

/** Vrai pour une cle de stockage qu'on peut demander au stockage sans risque. */
export function cleSure(cle: string | undefined): cle is string {
  return typeof cle === "string" && CLE_SURE.test(cle);
}

/**
 * La cle de stockage d'une couverture servie par la mediatheque, absolue ou
 * relative, ou undefined pour toute autre adresse (image distante, fichier du
 * depot) : celle-la n'a pas de carte recadree, et le billet garde la carte
 * par defaut du site.
 */
export function cleDeLaCouverture(src: string): string | undefined {
  let chemin: string;
  try {
    chemin = new URL(src, "http://localhost").pathname;
  } catch {
    return undefined;
  }
  if (!chemin.startsWith(MEDIATHEQUE)) return undefined;
  const cle = chemin.slice(MEDIATHEQUE.length);
  return cleSure(cle) ? cle : undefined;
}

/** L'adresse, relative au site, de la carte recadree d'une couverture de la mediatheque. */
export function adresseDeLaCarte(cle: string): string {
  return `${PREFIXE_DE_LA_CARTE}${cle}.jpg`;
}
