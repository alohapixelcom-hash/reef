// src/moteur/maintenance/regles.ts - ce que l'extension "Maintenance" ecrit et ce que le Worker frontal relit : la cle de l'interrupteur, son option, l'adresse de la page d'attente.
//
// L'interrupteur est une valeur de ctx.kv d'EmDash : la table `options`, sous
// le nom "plugin:<id>:<cle>", en JSON. Le Worker frontal du socle la lit sous
// ce nom exact (frontal/src/frontal/maintenance.ts, OPTION_DE_MAINTENANCE) :
// les deux chaines doivent rester identiques, le self-check le verifie.
//
// La page d'attente est une page du site, rendue par son moteur a
// CHEMIN_DE_LA_PAGE (et /en/... pour l'anglais), avec ses textes de la base :
// le frontal la sert en 503 tant que le site est ferme. Pur, sans importation
// d'EmDash.
import { IDENTITE } from "./identite.mjs";

/** La cle des reglages de la page d'attente dans ctx.kv (titre, sous-titre, fond, date de retour). */
export const CLE_REGLAGES = "reglages";

/** Le nom de la ligne des reglages, relue par frontal/src/frontal/maintenance.ts (OPTION_DES_REGLAGES). */
export const OPTION_DES_REGLAGES = `plugin:${IDENTITE.id}:${CLE_REGLAGES}`;

/** La cle de l'interrupteur dans ctx.kv. */
export const CLE = "actif";

/** Le nom de la ligne de la table `options` que ctx.kv ecrit pour cette cle. */
export const OPTION = `plugin:${IDENTITE.id}:${CLE}`;

/** L'adresse de la page d'attente dans la langue par defaut du site. */
export const CHEMIN_DE_LA_PAGE = "/maintenance-du-site/";

/** L'adresse de la page introuvable, que le moteur rend avec sa barre d'edition. */
export const CHEMIN_DE_LA_404 = "/404/";

/** Vrai seulement pour la valeur `true` : toute autre valeur laisse le site ouvert. */
export function estFerme(valeur: unknown): boolean {
  return valeur === true;
}

/** Ce que l'ecran enregistre ; le frontal le relit et le borne a nouveau (reglagesDe). */
export interface Reglages {
  titre: string;
  sousTitre: string;
  fond: "aucun" | "image" | "video";
  /** Identifiant du media choisi (table media d'EmDash). */
  image: string | null;
  video: string | null;
  /** "AAAA-MM-JJ" ou null. */
  retour: string | null;
}

export const REGLAGES_VIDES: Reglages = { titre: "", sousTitre: "", fond: "aucun", image: null, video: null, retour: null };
export const TITRE_MAX = 120;
export const SOUS_TITRE_MAX = 400;

/** Un refus de saisie, dit au client dans ses mots. */
export class SaisieRefusee extends Error {}

/**
 * Valide les valeurs d'un envoi du formulaire. `permis` : les identifiants
 * des medias proposes dans chaque liste (seul un media de la mediatheque
 * passe). Les messages viennent du dictionnaire de l'ecran.
 */
export function validerLesReglages(
  v: Record<string, unknown>,
  permis: { images: string[]; videos: string[] },
  m: { titreLong: string; sousTitreLong: string; dateIllisible: string; mediaInconnu: string },
): Reglages {
  const texte = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const titre = texte(v.titre);
  const sousTitre = texte(v.sousTitre);
  if (titre.length > TITRE_MAX) throw new SaisieRefusee(m.titreLong);
  if (sousTitre.length > SOUS_TITRE_MAX) throw new SaisieRefusee(m.sousTitreLong);
  const fond = v.fond === "image" || v.fond === "video" ? v.fond : "aucun";
  const image = texte(v.image) || null;
  const video = texte(v.video) || null;
  if (image && !permis.images.includes(image)) throw new SaisieRefusee(m.mediaInconnu);
  if (video && !permis.videos.includes(video)) throw new SaisieRefusee(m.mediaInconnu);
  const brut = texte(v.retour);
  const retour = brut === "" ? null : /^\d{4}-\d{2}-\d{2}/.test(brut) ? brut.slice(0, 10) : undefined;
  if (retour === undefined || (retour && Number.isNaN(Date.parse(`${retour}T00:00:00Z`)))) throw new SaisieRefusee(m.dateIllisible);
  return { titre, sousTitre, fond, image, video, retour };
}

/** Relit ce que ctx.kv rend pour CLE_REGLAGES ; toute autre forme donne les reglages vides. */
export function reglagesLus(valeur: unknown): Reglages {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return REGLAGES_VIDES;
  const o = valeur as Record<string, unknown>;
  const s = (x: unknown) => (typeof x === "string" ? x : "");
  return {
    titre: s(o.titre),
    sousTitre: s(o.sousTitre),
    fond: o.fond === "image" || o.fond === "video" ? o.fond : "aucun",
    image: s(o.image) || null,
    video: s(o.video) || null,
    retour: s(o.retour) || null,
  };
}
