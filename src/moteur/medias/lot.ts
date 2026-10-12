// src/moteur/medias/lot.ts - optimiser les photos deja en base, par lots bornes et reprenables, sans changer l'adresse d'aucune.
//
// L'ADRESSE NE CHANGE PAS : C'EST LE PARTI. Une page qui montre une photo a
// copie dans son contenu l'objet du champ image, avec meta.storageKey (admin
// d'EmDash 0.38, ImageFieldRenderer), et l'adresse se recalcule a partir de
// cette cle : /_emdash/api/media/file/<cle>. Changer la cle casserait chaque
// page, chaque revision et chaque copie du contenu. On remplace donc les
// octets SOUS LA MEME CLE, comme le fait deja EmDash quand on recadre ou
// remplace une image (routes media/[id]/replace : meme cle, meme regle de
// cache). La cle garde son ancienne extension (.jpg) : elle ne sert qu'a
// nommer l'objet ; c'est le type range avec l'objet dans R2 qui part dans
// l'en-tete Content-Type (storage/r2.mjs, download). Le nom affiche dans la
// Mediatheque, lui, prend la bonne extension.
//
// RIEN NE SE PERD : l'original est copie a cote, sous backups/aloha-medias/<cle>,
// avant d'etre remplace. EmDash refuse de servir une cle backups/ (route
// media/file) : la position GPS de l'original ne redevient pas publique, et
// le menage de ses sauvegardes ne touche que backups/emdash-backup-*.
//
// BORNE ET REPRENABLE : un clic traite LOT photos au plus. Chaque photo est
// reservee dans aloha_medias avant d'etre touchee (deux clics simultanes ne
// prennent jamais la meme) et y reste avec son resultat : le clic suivant
// reprend ou le precedent s'est arrete, meme apres une coupure.
import { type Base, candidats, empreinte, type MediaEnBase, mettreAJourLaFiche, noter, reserver } from "./base.ts";
import { convertir, court, type Images } from "./conversion.ts";
import { PREFIXE_DES_ORIGINAUX } from "./identite.mjs";
import { decider, ENTREE_MAX, sorteAnnoncee } from "./regles.ts";

/** Choix de la maison, pas une mesure : assez peu pour qu'un clic reponde vite et reste loin des plafonds du Worker. */
export const LOT = 5;

/** La regle de cache qu'EmDash 0.38 pose sur une image remplacee (MUTABLE_MEDIA_CACHE_CONTROL) : chaque lecture revalide. */
const CACHE_D_UNE_IMAGE = "public, max-age=0, must-revalidate";

/** Le seau des medias, reduit a ce que ce fichier appelle : un seau R2 tel quel, ou un espace KV par seauKV. */
export interface Seau {
  get(cle: string): Promise<{ size: number; arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string; cacheControl?: string } } | null>;
  head(cle: string): Promise<unknown | null>;
  put(cle: string, corps: Uint8Array, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
}

/** Un espace KV de Cloudflare, reduit a ce que seauKV appelle. */
export interface EspaceKV {
  getWithMetadata<M>(cle: string, options: { type: "arrayBuffer" }): Promise<{ value: ArrayBuffer | null; metadata: M | null }>;
  put(cle: string, valeur: ArrayBuffer | Uint8Array, options?: { metadata?: unknown }): Promise<void>;
}

/**
 * Les metadonnees qu'un stockage KV des medias range avec chaque fichier
 * (modele : src/moteur/stockage-kv.ts d'un site client, adaptateur de
 * stockage d'EmDash). Le type part de la dans l'en-tete Content-Type quand
 * EmDash sert le fichier : il doit suivre les octets.
 */
export interface MetadonneesKV {
  contentType: string;
  cacheControl?: string;
  size: number;
  depose: string;
}

/**
 * Le meme Seau sur un espace KV. KV n'a pas d'en-tetes HTTP : le type et la
 * regle de cache vivent dans les metadonnees de la cle, ecrites avec la valeur
 * en une seule operation (jamais d'octets WebP annonces en JPEG). `head` lit
 * la valeur : KV n'a pas de lecture des seules metadonnees, et la copie de
 * l'original n'est cherchee qu'une fois par photo.
 */
export function seauKV(espace: EspaceKV, maintenant: () => number = Date.now): Seau {
  return {
    async get(cle) {
      const lu = await espace.getWithMetadata<MetadonneesKV>(cle, { type: "arrayBuffer" });
      if (!lu.value) return null;
      const octets = lu.value;
      return { size: octets.byteLength, arrayBuffer: async () => octets, httpMetadata: { contentType: lu.metadata?.contentType, cacheControl: lu.metadata?.cacheControl } };
    },
    async head(cle) {
      const lu = await espace.getWithMetadata<MetadonneesKV>(cle, { type: "arrayBuffer" });
      return lu.value ? { size: lu.value.byteLength } : null;
    },
    async put(cle, corps, options) {
      const metadata: MetadonneesKV = {
        contentType: options?.httpMetadata?.contentType ?? "application/octet-stream",
        ...(options?.httpMetadata?.cacheControl ? { cacheControl: options.httpMetadata.cacheControl } : {}),
        size: corps.byteLength,
        depose: new Date(maintenant()).toISOString(),
      };
      await espace.put(cle, corps, { metadata });
      return null;
    },
  };
}

/** Le seau d'une liaison du Worker : R2 (head et put) tel quel, KV (getWithMetadata) par seauKV, sinon null. */
export function seauDe(liaison: unknown): Seau | null {
  if (typeof liaison !== "object" || liaison === null) return null;
  const l = liaison as Record<string, unknown>;
  if (typeof l.head === "function" && typeof l.put === "function" && typeof l.get === "function") return liaison as Seau;
  if (typeof l.getWithMetadata === "function" && typeof l.put === "function") return seauKV(liaison as EspaceKV);
  return null;
}

export interface BilanDuLot {
  examinees: number;
  faites: number;
  gardees: number;
  echecs: number;
  gagnes: number;
}

interface Contexte {
  base: Base;
  seau: Seau;
  images: Images | null | undefined;
  maintenant: () => number;
  avif?: boolean;
}

async function traiter(c: Contexte, m: MediaEnBase, bilan: BilanDuLot): Promise<void> {
  const quand = () => new Date(c.maintenant()).toISOString();
  const ligne = { media_id: m.id, origine: "lot" as const, nom: m.filename, avant: m.size, apres: null, format: null };
  const garder = (detail: string) => noter(c.base, { ...ligne, etat: "garde", detail, quand: quand() }).then(() => void (bilan.gardees += 1));
  const echouer = (detail: string) => noter(c.base, { ...ligne, etat: "echec", detail, quand: quand() }).then(() => void (bilan.echecs += 1));

  // D'abord ce que la fiche dit : un WebP leger se garde sans meme lire le fichier.
  const dimensions = m.width && m.height ? { largeur: m.width, hauteur: m.height } : null;
  const avant = decider({ sorte: sorteAnnoncee(m.mime_type, m.filename), taille: m.size ?? 1, dimensions, anime: false }, { avif: c.avif });
  if (avant.action === "passer") return garder(avant.raison);
  if (!c.images) return garder("sans-liaison");

  const objet = await c.seau.get(m.storage_key);
  if (!objet) return echouer("fichier-absent");
  if (objet.size > ENTREE_MAX) return garder("trop-lourd");
  const original = new Uint8Array(await objet.arrayBuffer());
  const conversion = await convertir(original, m.filename, c.images, { avif: c.avif });
  if (conversion.etat === "passe") return garder(conversion.raison);
  if (conversion.etat === "echec") return echouer(conversion.detail);

  // L'original a l'abri d'abord ; une copie deja la (lot interrompu) n'est pas ecrasee.
  const cleDeLOriginal = PREFIXE_DES_ORIGINAUX + m.storage_key;
  if (!(await c.seau.head(cleDeLOriginal))) {
    await c.seau.put(cleDeLOriginal, original, { httpMetadata: { contentType: objet.httpMetadata?.contentType ?? m.mime_type } });
  }
  const remettre = () => c.seau.put(m.storage_key, original, { httpMetadata: { contentType: objet.httpMetadata?.contentType ?? m.mime_type, cacheControl: CACHE_D_UNE_IMAGE } });
  await c.seau.put(m.storage_key, conversion.octets, { httpMetadata: { contentType: conversion.type, cacheControl: CACHE_D_UNE_IMAGE } });
  let changees = 0;
  try {
    changees = await mettreAJourLaFiche(c.base, {
      id: m.id,
      cle: m.storage_key,
      ancienType: m.mime_type,
      nom: conversion.nom,
      type: conversion.type,
      taille: conversion.apres,
      largeur: conversion.dimensions?.largeur ?? null,
      hauteur: conversion.dimensions?.hauteur ?? null,
      empreinte: await empreinte(conversion.octets),
    });
  } catch (e) {
    await remettre();
    return echouer(`fiche : ${court(e)}`);
  }
  if (changees === 0) {
    // La photo a change entre-temps (remplacee, supprimee) : on rend les octets tels qu'ils etaient.
    await remettre();
    return echouer("fiche-changee");
  }
  await noter(c.base, { ...ligne, etat: "fait", apres: conversion.apres, format: conversion.format, nom: conversion.nom, detail: null, quand: quand() });
  bilan.faites += 1;
  bilan.gagnes += conversion.avant - conversion.apres;
}

/** Traite le lot suivant. Une erreur sur une photo est notee pour elle et n'arrete pas les autres. */
export async function optimiserUnLot(c: Contexte & { taille?: number }): Promise<BilanDuLot> {
  const bilan: BilanDuLot = { examinees: 0, faites: 0, gardees: 0, echecs: 0, gagnes: 0 };
  const lot = await candidats(c.base, c.taille ?? LOT, c.maintenant());
  for (const m of lot) {
    if (!(await reserver(c.base, m.id, c.maintenant()))) continue;
    bilan.examinees += 1;
    try {
      await traiter(c, m, bilan);
    } catch (e) {
      await noter(c.base, { media_id: m.id, origine: "lot", nom: m.filename, avant: m.size, apres: null, format: null, etat: "echec", detail: court(e), quand: new Date(c.maintenant()).toISOString() });
      bilan.echecs += 1;
    }
  }
  return bilan;
}
