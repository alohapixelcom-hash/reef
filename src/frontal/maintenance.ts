// src/frontal/maintenance.ts - le mode maintenance vu du Worker frontal : l'interrupteur lu dans la base, ce qui passe toujours, la page d'attente rendue en 503.
//
// L'INTERRUPTEUR. L'extension "Maintenance" du socle (extensions/maintenance)
// l'ecrit par ctx.kv d'EmDash, donc dans la table `options`, sous le nom
// OPTION_DE_MAINTENANCE, en JSON : `true` ferme le site, toute autre valeur
// (absente, `false`) le laisse ouvert. Un site sans l'extension n'a jamais
// cette ligne : rien ne change pour lui. Lu en une requete, gardee une seconde
// par isolat, comme la version (version.ts).
//
// CE QUI PASSE TOUJOURS, site ferme : le back office et l'API (etape 1 du
// frontal, avant la porte), les fichiers (feuilles, images, favicon,
// robots.txt, plans du site), et toute personne connectee au back office :
// sa session est verifiee par le moteur (/_emdash/api/auth/me), pas devinee
// sur le nom d'un cookie, et le resultat est garde 30 secondes par isolat.
//
// LA PAGE D'ATTENTE est une page du site, rendue par le moteur a
// PAGE_DE_MAINTENANCE (et /en/... pour une adresse anglaise), avec ses textes
// de la base. Le frontal la sert en 503 avec Retry-After et noindex : un moteur
// de recherche repasse plus tard sans rien desindexer. Sa copie est gardee
// 60 secondes par isolat. Si le moteur ne la rend pas, une page minimale de
// secours repond, toujours en 503.
//
// LES REGLAGES DE L'ECRAN (depuis le socle 1.16.0) : un titre, un sous-titre,
// une photo ou une video de la mediatheque, une date de retour, enregistres
// sous OPTION_DES_REGLAGES. Un titre saisi l'emporte : le frontal compose
// alors lui-meme la page (attente.ts), sans demander de page au site, et
// Retry-After vise la date de retour. Sans titre, la page du site, comme avant.
import type { ReglagesDeLAttente } from "./attente.ts";

export const OPTION_DE_MAINTENANCE = "plugin:aloha-maintenance:actif";
export const OPTION_DES_REGLAGES = "plugin:aloha-maintenance:reglages";
export const PAGE_DE_MAINTENANCE = "/maintenance-du-site/";
/** Ce qu'un moteur de recherche lit : repasser dans une heure. */
export const REESSAYER_APRES = "3600";

/** La lecture de la base dont la porte a besoin (la meme forme que version.ts). */
export interface BaseDeMaintenance {
  prepare(requete: string): { first<T = Record<string, unknown>>(): Promise<T | null> };
}

/** Vrai seulement quand l'option vaut le JSON `true`. */
export function estFerme(valeur: unknown): boolean {
  if (typeof valeur !== "string") return false;
  try {
    return JSON.parse(valeur) === true;
  } catch {
    return false;
  }
}

/** Lit l'interrupteur. Une base injoignable laisse le site ouvert : la maintenance ne doit jamais fermer un site par accident. */
export async function lireLaMaintenance(base: BaseDeMaintenance): Promise<boolean> {
  try {
    const ligne = await base.prepare(`SELECT value FROM options WHERE name = '${OPTION_DE_MAINTENANCE}'`).first<{ value: unknown }>();
    return estFerme(ligne?.value);
  } catch {
    return false;
  }
}

/** L'adresse de la page d'attente dans la langue de l'adresse demandee ("/en/..." -> "/en/maintenance-du-site/"). */
export function adresseDeLAttente(chemin: string): string {
  const langue = /^\/([a-z]{2})(?:\/|$)/.exec(chemin)?.[1];
  return langue ? `/${langue}${PAGE_DE_MAINTENANCE}` : PAGE_DE_MAINTENANCE;
}

/** Les bornes de Retry-After quand une date de retour est annoncee : un robot repasse au moins une fois par jour. */
export const RETRY_MIN = 300;
export const RETRY_MAX = 86_400;

/** Les secondes jusqu'a la date de retour (minuit UTC), bornees ; sans date lisible ou deja passee, REESSAYER_APRES. */
export function reessayerApres(retour: string | null | undefined, maintenant: number): string {
  if (!retour || !/^\d{4}-\d{2}-\d{2}$/.test(retour)) return REESSAYER_APRES;
  const vise = Date.parse(`${retour}T00:00:00Z`);
  if (Number.isNaN(vise) || vise <= maintenant) return REESSAYER_APRES;
  return String(Math.min(RETRY_MAX, Math.max(RETRY_MIN, Math.ceil((vise - maintenant) / 1000))));
}

/** Ce que l'ecran enregistre, tel que la base le porte : relu sans lui faire confiance. */
export interface ReglagesBruts {
  titre: string;
  sousTitre: string;
  fond: "aucun" | "image" | "video";
  image: string | null;
  video: string | null;
  retour: string | null;
}

const IDENTIFIANT_DE_MEDIA = /^[A-Za-z0-9_-]{1,64}$/;
const texteBorne = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Relit la valeur de OPTION_DES_REGLAGES (JSON) ; toute forme inattendue donne null. */
export function reglagesDe(valeur: unknown): ReglagesBruts | null {
  let lu: unknown = valeur;
  if (typeof valeur === "string") {
    try {
      lu = JSON.parse(valeur);
    } catch {
      return null;
    }
  }
  if (typeof lu !== "object" || lu === null || Array.isArray(lu)) return null;
  const o = lu as Record<string, unknown>;
  const media = (v: unknown) => (typeof v === "string" && IDENTIFIANT_DE_MEDIA.test(v) ? v : null);
  return {
    titre: texteBorne(o.titre, 120),
    sousTitre: texteBorne(o.sousTitre, 400),
    fond: o.fond === "image" || o.fond === "video" ? o.fond : "aucun",
    image: media(o.image),
    video: media(o.video),
    retour: typeof o.retour === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.retour) ? o.retour : null,
  };
}

/**
 * Les reglages de la page d'attente, le fond resolu en adresse publique, ou
 * null quand aucun titre n'est saisi (la page du site prend alors le relais).
 * Un media introuvable ou du mauvais type laisse le fond uni, jamais d'erreur.
 */
export async function lireLesReglages(base: BaseDeMaintenance): Promise<ReglagesDeLAttente | null> {
  try {
    const ligne = await base.prepare(`SELECT value FROM options WHERE name = '${OPTION_DES_REGLAGES}'`).first<{ value: unknown }>();
    const r = reglagesDe(ligne?.value);
    if (!r || r.titre === "") return null;
    const id = r.fond === "image" ? r.image : r.fond === "video" ? r.video : null;
    let fond: ReglagesDeLAttente["fond"] = null;
    if (id) {
      // L'identifiant est borne par IDENTIFIANT_DE_MEDIA : il entre tel quel dans la requete.
      const m = await base.prepare(`SELECT storage_key, mime_type FROM media WHERE id = '${id}'`).first<{ storage_key: unknown; mime_type: unknown }>();
      const type = typeof m?.mime_type === "string" ? m.mime_type : "";
      if (m && typeof m.storage_key === "string" && type.startsWith(`${r.fond}/`)) {
        fond = { sorte: r.fond as "image" | "video", adresse: `/_emdash/api/media/file/${m.storage_key.split("/").map(encodeURIComponent).join("/")}`, type };
      }
    }
    return { titre: r.titre, sousTitre: r.sousTitre, fond, retour: r.retour };
  } catch {
    return null;
  }
}

/** Les en-tetes de toute reponse du site ferme. */
export function entetesDeLAttente(type: string, reessayer: string = REESSAYER_APRES): Headers {
  return new Headers({
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Retry-After": reessayer,
    "X-Robots-Tag": "noindex",
  });
}

/** La page de secours, quand le moteur ne rend pas la page d'attente. */
export const PAGE_DE_SECOURS =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Maintenance</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;text-align:center;padding:24px"><main><h1 style="font-weight:500">Site en maintenance</h1><p>Revenez dans quelques instants.</p></main></body></html>';
