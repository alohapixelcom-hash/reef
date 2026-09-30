// src/moteur/extensions/gestion/regles.ts - les regles pures de la gestion des listes : le CSV d'un export, les adresses suspectes, les phrases de confirmation.
//
// SANS EFFET, pour se verifier par `pnpm test` (gestion.selfcheck.ts) sans
// base ni navigateur. Les ecrans (admin/*.tsx) et les routes (extension.ts)
// ne portent que des effets.

/** Une cellule CSV : entre guillemets quand il le faut, guillemets doubles. Une formule (=, +, -, @) est desamorcee pour un tableur. */
export function cellule(valeur: unknown): string {
  let texte = valeur == null ? "" : String(valeur);
  if (/^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`;
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

/**
 * Un fichier CSV lisible par Excel en francais : point-virgule entre les
 * colonnes, fins de ligne CRLF, marque d'ordre des octets UTF-8 en tete
 * (sans elle, Excel lit les accents de travers).
 */
export function csv(entetes: readonly string[], lignes: readonly (readonly unknown[])[]): string {
  return `﻿${[entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n")}\r\n`;
}

/** "abonnes-2026-09-30.csv" : le nom d'un export, date du jour a Paris. */
export function nomDuFichier(prefixe: string, instant: number): string {
  const jour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
  return `${prefixe.replace(/[^a-z0-9-]/g, "")}-${jour}.csv`;
}

/** Des domaines d'adresses jetables, les plus courants : une inscription depuis l'un d'eux n'est presque jamais une vraie personne. */
export const DOMAINES_JETABLES: readonly string[] = [
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "sharklasers.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "yopmail.com", "yopmail.fr", "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com",
  "mailnesia.com", "mintemail.com", "spamgourmet.com", "emailondeck.com", "moakt.com", "tempr.email", "discard.email", "mohmal.com",
];

export type Raison = "jamais-confirme" | "jetable" | "aleatoire" | "rafale";

export interface Candidat {
  id: string;
  adresse: string;
  etat: string;
  demande_le: number;
  confirme_le: number | null;
}

const HEURE = 3_600_000;

/** Une partie locale qui ressemble a une suite tiree au hasard : longue, sans voyelle ou pleine de chiffres. */
export function localAleatoire(adresse: string): boolean {
  const local = adresse.split("@")[0] ?? "";
  if (local.length < 10) return false;
  const chiffres = (local.match(/\d/g) ?? []).length;
  const voyelles = (local.match(/[aeiouy]/gi) ?? []).length;
  return chiffres >= 5 || voyelles / local.length < 0.12 || /[a-z]\d[a-z]\d[a-z]\d/i.test(local);
}

/**
 * Les raisons de tenir une inscription pour suspecte, en regles simples et
 * expliquees a l'ecran : jamais confirmee depuis plus de 24 heures, domaine
 * jetable, adresse tiree au hasard, ou dix inscriptions et plus du meme
 * domaine en une heure (un robot qui remplit le formulaire). Un abonne qui a
 * confirme lui-meme n'est jamais suspect.
 */
export function suspects<T extends Candidat>(liste: readonly T[], maintenant: number): { abonne: T; raisons: Raison[] }[] {
  const parDomaineEtHeure = new Map<string, number>();
  const cle = (c: Candidat) => `${(c.adresse.split("@")[1] ?? "").toLowerCase()}|${Math.floor(c.demande_le / HEURE)}`;
  for (const c of liste) if (c.confirme_le == null) parDomaineEtHeure.set(cle(c), (parDomaineEtHeure.get(cle(c)) ?? 0) + 1);
  const sortie: { abonne: T; raisons: Raison[] }[] = [];
  for (const c of liste) {
    if (c.confirme_le != null) continue;
    const raisons: Raison[] = [];
    if (c.etat === "attente" && maintenant - c.demande_le > 24 * HEURE) raisons.push("jamais-confirme");
    if (DOMAINES_JETABLES.includes((c.adresse.split("@")[1] ?? "").toLowerCase())) raisons.push("jetable");
    if (localAleatoire(c.adresse)) raisons.push("aleatoire");
    if ((parDomaineEtHeure.get(cle(c)) ?? 0) >= 10) raisons.push("rafale");
    if (raisons.length) sortie.push({ abonne: c, raisons });
  }
  return sortie;
}

export const RAISONS_FR: Record<Raison, string> = {
  "jamais-confirme": "jamais confirmée",
  jetable: "adresse jetable",
  aleatoire: "adresse tirée au hasard",
  rafale: "rafale d'inscriptions",
};

/** "1 abonné", "250 abonnés" : un nombre et son nom accordes. */
export function compte(n: number, un: string, plusieurs: string): string {
  return `${new Intl.NumberFormat("fr-FR").format(n)} ${n > 1 ? plusieurs : un}`;
}
