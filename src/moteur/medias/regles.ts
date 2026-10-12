// src/moteur/medias/regles.ts - les regles pures de la conversion des photos : reconnaitre un fichier a ses octets, lire ses dimensions, decider s'il se convertit et en quoi, retenir un resultat.
//
// PUR, SANS IMPORT : le self-check (medias.selfcheck.ts) l'essaie sous Node,
// sans EmDash ni Cloudflare.
//
// LES OCTETS FONT FOI, PAS LE TYPE ANNONCE. Un navigateur annonce parfois un
// HEIC en "application/octet-stream" ou en type vide, et le liant Images peut
// rendre un autre format que celui demande (la documentation de Cloudflare dit
// qu'un AVIF trop long a encoder retombe en WebP ou en JPEG). On reconnait
// donc l'entree et la sortie a leur signature.
//
// LES CHIFFRES QUI VIENNENT DE CLOUDFLARE (lus le 11/10/2026) :
// developers.cloudflare.com/images/get-started/limits/ :
//   "the maximum input size for `.input()` is 20 MB" ;
//   "Image dimension, AVIF | 1,200 pixels" ;
//   entrees : PNG, JPEG, GIF, WebP, SVG, AVIF (Enterprise seulement), HEIC.
// Le reste est un choix de la maison, dit comme tel a cote de sa valeur.

export type Sorte = "jpeg" | "png" | "heic" | "webp" | "avif" | "gif" | "svg" | "autre";
export type FormatDeSortie = "avif" | "webp";

/** Demande du client : jamais plus de 2560 px sur le grand cote, jamais d'agrandissement. */
export const GRAND_COTE_MAX = 2560;
/** Cloudflare : dimension maximale d'une image AVIF (page des limites). Au-dela, on ne demande meme pas l'AVIF. */
export const LIMITE_AVIF = 1200;
/** Cloudflare : taille maximale de ce que .input() accepte. */
export const ENTREE_MAX = 20 * 1024 * 1024;
/** Choix de la maison, pas une mesure : un WebP plus lourd que ca est repris meme s'il tient deja dans 2560 px. */
export const WEBP_LOURD = 1024 * 1024;

export const TYPES: Record<FormatDeSortie, string> = { avif: "image/avif", webp: "image/webp" };

const texte = (o: Uint8Array, debut: number, fin: number): string => String.fromCharCode(...o.subarray(debut, fin));
const u16be = (o: Uint8Array, i: number): number => (o[i] << 8) | o[i + 1];
const u16le = (o: Uint8Array, i: number): number => o[i] | (o[i + 1] << 8);
const u24le = (o: Uint8Array, i: number): number => o[i] | (o[i + 1] << 8) | (o[i + 2] << 16);
const u32be = (o: Uint8Array, i: number): number => ((o[i] << 24) >>> 0) + ((o[i + 1] << 16) | (o[i + 2] << 8) | o[i + 3]);

/** Les marques d'un conteneur ISO (HEIF, AVIF) : la principale et les compatibles de la boite ftyp. */
function marques(o: Uint8Array): string[] {
  if (o.length < 16 || texte(o, 4, 8) !== "ftyp") return [];
  const fin = Math.min(u32be(o, 0), o.length);
  const liste = [texte(o, 8, 12)];
  for (let i = 16; i + 4 <= fin; i += 4) liste.push(texte(o, i, i + 4));
  return liste;
}

const MARQUES_HEIC = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/** La sorte d'un fichier lue a ses premiers octets ; le nom et le type annonce ne servent qu'en dernier recours (SVG). */
export function sorteDe(o: Uint8Array): Sorte {
  if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "jpeg";
  if (o.length >= 8 && texte(o, 0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (o.length >= 6 && texte(o, 0, 4) === "GIF8") return "gif";
  if (o.length >= 12 && texte(o, 0, 4) === "RIFF" && texte(o, 8, 12) === "WEBP") return "webp";
  const m = marques(o);
  if (m.includes("avif") || m.includes("avis")) return "avif";
  if (m.some((x) => MARQUES_HEIC.has(x))) return "heic";
  const debut = new TextDecoder().decode(o.subarray(0, 1024)).trimStart().toLowerCase();
  if (debut.startsWith("<svg") || (debut.startsWith("<?xml") && debut.includes("<svg"))) return "svg";
  return "autre";
}

/** Vrai pour un WebP anime (drapeau du bloc VP8X ou bloc ANIM) : il passe tel quel, comme un GIF. */
export function webpAnime(o: Uint8Array): boolean {
  if (sorteDe(o) !== "webp") return false;
  if (o.length > 20 && texte(o, 12, 16) === "VP8X" && (o[20] & 0x02) !== 0) return true;
  for (let i = 12; i + 8 <= o.length; ) {
    if (texte(o, i, i + 4) === "ANIM") return true;
    const longueur = o[i + 4] | (o[i + 5] << 8) | (o[i + 6] << 16) | (o[i + 7] << 24);
    if (longueur < 0) return false;
    i += 8 + longueur + (longueur % 2);
  }
  return false;
}

export interface Dimensions {
  largeur: number;
  hauteur: number;
}

/** Les dimensions d'un JPEG : le premier bloc SOF (hors DHT, JPG et DAC, qui partagent la plage). */
function dimensionsJpeg(o: Uint8Array): Dimensions | null {
  let i = 2;
  while (i + 9 < o.length) {
    if (o[i] !== 0xff) return null;
    const marque = o[i + 1];
    if (marque === 0xff) {
      i += 1;
      continue;
    }
    if (marque >= 0xc0 && marque <= 0xcf && marque !== 0xc4 && marque !== 0xc8 && marque !== 0xcc) {
      return { hauteur: u16be(o, i + 5), largeur: u16be(o, i + 7) };
    }
    if (marque === 0xd8 || (marque >= 0xd0 && marque <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + u16be(o, i + 2);
  }
  return null;
}

/** Les dimensions d'un WebP, selon son premier bloc : VP8 (avec perte), VP8L (sans perte), VP8X (etendu). */
function dimensionsWebp(o: Uint8Array): Dimensions | null {
  const bloc = texte(o, 12, 16);
  if (bloc === "VP8X" && o.length >= 30) return { largeur: u24le(o, 24) + 1, hauteur: u24le(o, 27) + 1 };
  if (bloc === "VP8L" && o.length >= 25) {
    const b = o.subarray(21, 25);
    return { largeur: 1 + (b[0] | ((b[1] & 0x3f) << 8)), hauteur: 1 + ((b[1] >> 6) | (b[2] << 2) | ((b[3] & 0x0f) << 10)) };
  }
  if (bloc === "VP8 " && o.length >= 30) return { largeur: u16le(o, 26) & 0x3fff, hauteur: u16le(o, 28) & 0x3fff };
  return null;
}

/**
 * Les dimensions d'un HEIF ou d'un AVIF : la plus grande boite ispe. Un HEIC
 * d'iPhone est une grille de tuiles, chacune avec sa boite ispe ; la plus
 * grande est celle de l'image entiere.
 */
function dimensionsHeif(o: Uint8Array): Dimensions | null {
  let meilleure: Dimensions | null = null;
  for (let i = 4; i + 16 <= o.length; i += 1) {
    if (o[i] !== 0x69 || texte(o, i, i + 4) !== "ispe") continue;
    const d = { largeur: u32be(o, i + 8), hauteur: u32be(o, i + 12) };
    if (!meilleure || d.largeur * d.hauteur > meilleure.largeur * meilleure.hauteur) meilleure = d;
  }
  return meilleure;
}

/** Les dimensions lues dans les octets, ou null quand la sorte n'en dit rien de lisible ici. */
export function dimensionsDe(o: Uint8Array): Dimensions | null {
  const sorte = sorteDe(o);
  const d =
    sorte === "jpeg" ? dimensionsJpeg(o)
    : sorte === "png" && o.length >= 24 ? { largeur: u32be(o, 16), hauteur: u32be(o, 20) }
    : sorte === "gif" ? { largeur: u16le(o, 6), hauteur: u16le(o, 8) }
    : sorte === "webp" ? dimensionsWebp(o)
    : sorte === "heic" || sorte === "avif" ? dimensionsHeif(o)
    : null;
  return d && d.largeur > 0 && d.hauteur > 0 ? d : null;
}

/** La sorte annoncee par un type MIME ou un nom de fichier, quand on n'a pas encore les octets (demande d'adresse d'envoi). */
export function sorteAnnoncee(type: string | null | undefined, nom: string | null | undefined): Sorte {
  const t = (type ?? "").toLowerCase().split(";")[0].trim();
  const parType: Record<string, Sorte> = {
    "image/jpeg": "jpeg", "image/jpg": "jpeg", "image/pjpeg": "jpeg", "image/png": "png", "image/webp": "webp",
    "image/avif": "avif", "image/gif": "gif", "image/svg+xml": "svg", "image/heic": "heic", "image/heif": "heic",
    "image/heic-sequence": "heic", "image/heif-sequence": "heic",
  };
  if (parType[t]) return parType[t];
  const ext = (nom ?? "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const parExtension: Record<string, Sorte> = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", avif: "avif", gif: "gif", svg: "svg", heic: "heic", heif: "heic" };
  return parExtension[ext] ?? "autre";
}

/** Vrai pour une sorte que la conversion peut prendre : l'aiguillage detourne alors l'envoi en deux temps vers l'envoi en un temps. */
export function peutSeConvertir(sorte: Sorte): boolean {
  return sorte === "jpeg" || sorte === "png" || sorte === "heic" || sorte === "webp";
}

export type Raison =
  | "vide"
  | "pas-une-image"
  | "gif"
  | "svg"
  | "anime"
  | "avif"
  | "webp-leger"
  | "trop-lourd"
  | "sans-liaison"
  | "plus-lourd"
  | "echec";

export interface Entree {
  sorte: Sorte;
  taille: number;
  dimensions: Dimensions | null;
  anime: boolean;
}

export type Decision =
  | { action: "convertir"; formats: FormatDeSortie[]; grandCote: number }
  | { action: "passer"; raison: Raison };

/** Le grand cote apres reduction : jamais plus de GRAND_COTE_MAX, jamais plus que l'original. */
export function grandCoteDeSortie(d: Dimensions | null): number {
  return d ? Math.min(Math.max(d.largeur, d.hauteur), GRAND_COTE_MAX) : GRAND_COTE_MAX;
}

/**
 * Les dimensions de sortie annoncees a l'avance (reduction proportionnelle).
 * Ne sert qu'a decider ; les dimensions ecrites en base sont relues dans les
 * octets rendus, parce que la rotation EXIF peut echanger les deux cotes.
 */
export function dimensionsReduites(d: Dimensions): Dimensions {
  const grand = Math.max(d.largeur, d.hauteur);
  if (grand <= GRAND_COTE_MAX) return d;
  const r = GRAND_COTE_MAX / grand;
  return { largeur: Math.max(1, Math.round(d.largeur * r)), hauteur: Math.max(1, Math.round(d.hauteur * r)) };
}

/**
 * La decision pour une image entrante. `avif: false` (option du site) ne
 * demande jamais l'AVIF. L'AVIF n'est demande que si la sortie tient dans la
 * limite de Cloudflare ; sinon le WebP vient seul, sans transformation perdue.
 */
export function decider(e: Entree, options: { avif?: boolean } = {}): Decision {
  if (e.taille <= 0) return { action: "passer", raison: "vide" };
  if (e.sorte === "gif") return { action: "passer", raison: "gif" };
  if (e.sorte === "svg") return { action: "passer", raison: "svg" };
  if (e.sorte === "autre") return { action: "passer", raison: "pas-une-image" };
  // Cloudflare ne lit l'AVIF en entree que sur l'offre Enterprise : on ne le reprend pas.
  if (e.sorte === "avif") return { action: "passer", raison: "avif" };
  if (e.anime) return { action: "passer", raison: "anime" };
  if (e.taille > ENTREE_MAX) return { action: "passer", raison: "trop-lourd" };
  if (e.sorte === "webp" && e.dimensions && Math.max(e.dimensions.largeur, e.dimensions.hauteur) <= GRAND_COTE_MAX && e.taille <= WEBP_LOURD) {
    return { action: "passer", raison: "webp-leger" };
  }
  const grandCote = grandCoteDeSortie(e.dimensions);
  const avif = options.avif !== false && e.dimensions !== null && grandCote <= LIMITE_AVIF;
  return { action: "convertir", formats: avif ? ["avif", "webp"] : ["webp"], grandCote };
}

export interface Essai {
  demande: FormatDeSortie;
  /** La sorte relue dans les octets rendus, ou null si le liant a echoue. */
  recue: Sorte | null;
  taille: number;
}

/**
 * Vrai si un essai peut remplacer l'original. Le format rendu doit etre celui
 * demande (sinon c'est un repli de Cloudflare, et l'extension mentirait). Il
 * doit peser moins que l'original, sauf pour un HEIC (aucun navigateur
 * courant ne l'affiche) et pour un JPEG (sa position GPS part avec la
 * conversion : la vie privee passe avant quelques octets).
 */
export function essaiRetenu(original: Pick<Entree, "sorte" | "taille">, essai: Essai): boolean {
  if (essai.recue !== essai.demande || essai.taille <= 0) return false;
  if (essai.taille < original.taille) return true;
  // L'AVIF plus lourd que l'original cede toujours la place au WebP.
  if (essai.demande === "avif") return false;
  return original.sorte === "heic" || original.sorte === "jpeg";
}

/** Le nom du fichier avec l'extension du format rendu : "IMG_1234.HEIC" devient "IMG_1234.webp". */
export function nomAvecExtension(nom: string, format: FormatDeSortie): string {
  const base = (nom.split(/[\\/]/).pop() ?? "").replace(/\.[A-Za-z0-9]{1,5}$/, "").trim();
  return `${base || "photo"}.${format}`;
}

/** Une taille en mots du client, en francais ou en anglais : "4,1 Mo", "612 Ko". */
export function poids(octets: number, langue: "fr" | "en" = "fr"): string {
  const [ko, mo] = langue === "fr" ? ["Ko", "Mo"] : ["KB", "MB"];
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} ${ko}`;
  const v = (octets / (1024 * 1024)).toFixed(1);
  return `${langue === "fr" ? v.replace(".", ",") : v} ${mo}`;
}
