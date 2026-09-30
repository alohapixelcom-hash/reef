// src/moteur/extensions/courriels/noyau/regles.ts - les regles pures des courriels : reglages par defaut et leur lecture, plafonds, cycle du mois, masquage, adresses.
//
// POURQUOI UN FICHIER SANS AUCUN EFFET : tout ce qui decide (un envoi passe-t-il
// sous les plafonds, quand le compteur repart-il a zero, comment masquer une
// adresse, un reglage saisi est-il valable) se verifie ici par `pnpm test`,
// sans base, sans reseau et sans moteur. Le reste de l'extension ne porte plus
// que des effets. Aucune adresse n'est ecrite dans ce fichier : les valeurs par
// defaut sont vides, et un formulaire sans destinataire n'envoie rien.

/** Les formulaires qu'un site peut declarer. Koa n'a que `contact`. */
export const FORMULAIRES = ["contact", "lettre", "commande"] as const;
export type Formulaire = (typeof FORMULAIRES)[number];

/**
 * Ce qui part : un formulaire du site, l'accuse de reception au visiteur,
 * l'essai (bouton de "Brancher" ou ecran natif d'EmDash), un courriel du
 * back office lui-meme (lien de connexion, invitation : "systeme", jamais
 * garde en entier, il porte un jeton), ou celui d'une autre extension.
 */
export type Origine = Formulaire | "accuse" | "essai" | "systeme" | "autre";
export const ORIGINES: readonly Origine[] = [...FORMULAIRES, "accuse", "essai", "systeme", "autre"];

/**
 * L'origine d'un courriel d'apres la source que le canal d'EmDash lui donne :
 * "system" pour ses propres courriels (authentification), "admin" pour l'essai
 * de son ecran de reglages, l'identifiant d'une extension sinon, range sous le
 * formulaire que la configuration du site lui donne (Kai : "aloha-commerce"
 * vers "commande").
 */
export function origineDeLaSource(source: string, sources: Readonly<Record<string, Origine>> = {}): Origine {
  if (source === "system") return "systeme";
  if (source === "admin") return "essai";
  return Object.hasOwn(sources, source) ? sources[source]! : "autre";
}

export const LANGUES = ["fr", "en"] as const;
export type Langue = (typeof LANGUES)[number];

export type Etat = "envoye" | "refuse" | "plafonne";
export const ETATS: readonly Etat[] = ["envoye", "refuse", "plafonne"];

export interface Plafonds {
  /** Envois au plus par heure glissante, tous formulaires confondus ; 0 : sans plafond. */
  heure: number;
  /** Envois au plus par 24 heures glissantes. */
  jour: number;
  /** Envois au plus vers une meme adresse par 24 heures glissantes : protege un tiers qu'un robot inscrirait. */
  destinataire: number;
  /** Envois au plus sur le cycle du mois ; 0 : sans plafond (Cloudflare facture alors au-dela des 3 000 inclus). */
  mois: number;
}

export interface Reglages {
  expediteur: string;
  nom: string;
  reponse: string;
  destinataires: Record<Formulaire, string>;
  accuse: { actif: boolean; sujet: Record<Langue, string>; texte: Record<Langue, string> };
  plafonds: Plafonds;
  /** Le jour du mois ou le compteur repart a zero (1 a 28), celui du cycle de facturation Cloudflare. */
  cycle: number;
}

/** Le forfait de Cloudflare Email Sending sur Workers Paid, lu et relu le 28 dans sa documentation. */
export const INCLUS_PAR_MOIS = 3000;
export const PRIX_PAR_MILLE_USD = 0.35;

export const PLAFONDS_PAR_DEFAUT: Plafonds = { heure: 20, jour: 100, destinataire: 5, mois: INCLUS_PAR_MOIS };
const PLAFOND_MAX = 100_000;
const LONGUEUR_TEXTE_MAX = 2000;
const LONGUEUR_SUJET_MAX = 200;
const DESTINATAIRES_MAX = 3;

export const ACCUSE_PAR_DEFAUT: Reglages["accuse"] = {
  actif: false,
  sujet: { fr: "Nous avons bien reçu votre message", en: "We have received your message" },
  texte: {
    fr: "Bonjour {nom},\n\nMerci pour votre message : nous l'avons bien reçu et nous vous répondons au plus vite.\n\n{site}",
    en: "Hello {nom},\n\nThank you for your message: it reached us and we will answer as soon as we can.\n\n{site}",
  },
};

export function reglagesParDefaut(): Reglages {
  return {
    expediteur: "",
    nom: "",
    reponse: "",
    destinataires: { contact: "", lettre: "", commande: "" },
    accuse: structuredClone(ACCUSE_PAR_DEFAUT),
    plafonds: { ...PLAFONDS_PAR_DEFAUT },
    cycle: 1,
  };
}

/* --- Adresses ------------------------------------------------------------ */

// Volontairement simple : une partie locale, une arobase, un domaine a point.
// La liaison de Cloudflare fait la validation fine et son refus est traduit.
const ADRESSE = /^[^\s@<>(),;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function adresseValide(valeur: string): boolean {
  return valeur.length <= 254 && ADRESSE.test(valeur);
}

/** Une saisie libre (adresses separees par virgules, points-virgules ou espaces) en liste propre, doublons retires, minuscules. */
export function listeDAdresses(valeur: string): string[] {
  const vues = new Set<string>();
  for (const morceau of valeur.split(/[\s,;]+/)) {
    const adresse = morceau.trim().toLowerCase();
    if (adresse) vues.add(adresse);
  }
  return [...vues];
}

/**
 * Les messageries grand public. Cloudflare n'envoie que depuis
 * un domaine qu'il gere : une adresse d'expedition en gmail.com ou orange.fr
 * est acceptee par l'ecran puis refusee a chaque envoi, sans que le client
 * comprenne pourquoi (releve du testeur). L'ecran la refuse tout de suite, en
 * disant quoi faire. Les destinataires, eux, peuvent etre n'importe ou.
 */
export const MESSAGERIES = [
  "gmail.com", "googlemail.com", "outlook.com", "outlook.fr", "hotmail.com", "hotmail.fr", "live.com", "live.fr", "msn.com",
  "yahoo.com", "yahoo.fr", "icloud.com", "me.com", "mac.com", "aol.com", "gmx.fr", "gmx.com", "proton.me", "protonmail.com",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "neuf.fr", "bbox.fr", "laposte.net", "numericable.fr",
] as const;

/** Vrai quand l'adresse est chez une messagerie grand public : elle ne peut pas servir d'expediteur. */
export function adresseDeMessagerie(adresse: string): boolean {
  return (MESSAGERIES as readonly string[]).includes(domaineDe(adresse));
}

/** Le domaine d'une adresse, en minuscules ; "" si l'adresse n'en a pas. */
export function domaineDe(adresse: string): string {
  const at = adresse.lastIndexOf("@");
  return at < 0 ? "" : adresse.slice(at + 1).trim().toLowerCase();
}

/**
 * Masque une adresse pour l'affichage : premiere et derniere lettre de la
 * partie locale, le domaine en clair. Le journal garde l'adresse entiere (il
 * en a besoin pour renvoyer) ; l'ecran ne la montre jamais en clair.
 */
export function masquer(adresse: string): string {
  return listeDAdresses(adresse)
    .map((une) => {
      const at = une.lastIndexOf("@");
      if (at < 1) return "***";
      const locale = une.slice(0, at);
      const visible = locale.length <= 2 ? `${locale[0]}*` : `${locale[0]}***${locale[locale.length - 1]}`;
      return `${visible}@${une.slice(at + 1)}`;
    })
    .join(", ");
}

/* --- Lecture des reglages ------------------------------------------------ */

export type ErreurDeReglage =
  | { champ: "expediteur" | "reponse"; raison: "adresse" }
  | { champ: "expediteur"; raison: "messagerie" }
  | { champ: Formulaire; raison: "adresse" | "trop" }
  | { champ: "plafonds"; raison: "nombre" }
  | { champ: "cycle"; raison: "nombre" };

const texte = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Une valeur qui finit dans un en-tete (nom affiche, sujet) : jamais de saut de ligne ni de caractere de controle. */
const enTete = (v: unknown, max: number): string => texte(typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ") : v, max);

function entier(v: unknown, min: number, max: number, defaut: number): number | null {
  if (v === undefined || v === null || v === "") return defaut;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""));
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/**
 * Lit des reglages venus d'ailleurs (la base, un formulaire du back office)
 * sans leur faire confiance. Rend les reglages propres ET la liste des champs
 * refuses : un champ refuse garde la valeur precedente, et l'ecran dit lequel.
 */
export function lireReglages(brut: unknown, avant: Reglages = reglagesParDefaut()): { reglages: Reglages; erreurs: ErreurDeReglage[] } {
  const src = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : {};
  const r = structuredClone(avant);
  const erreurs: ErreurDeReglage[] = [];

  for (const champ of ["expediteur", "reponse"] as const) {
    if (!(champ in src)) continue;
    const valeur = texte(src[champ], 254).toLowerCase();
    if (champ === "expediteur" && valeur !== "" && adresseValide(valeur) && adresseDeMessagerie(valeur)) erreurs.push({ champ, raison: "messagerie" });
    else if (valeur === "" || adresseValide(valeur)) r[champ] = valeur;
    else erreurs.push({ champ, raison: "adresse" });
  }
  if ("nom" in src) r.nom = enTete(src.nom, 80).replace(/["<>]/g, "");

  const dest = typeof src.destinataires === "object" && src.destinataires !== null ? (src.destinataires as Record<string, unknown>) : {};
  for (const f of FORMULAIRES) {
    if (!(f in dest)) continue;
    const liste = listeDAdresses(texte(dest[f], 800));
    if (liste.length > DESTINATAIRES_MAX) erreurs.push({ champ: f, raison: "trop" });
    else if (!liste.every(adresseValide)) erreurs.push({ champ: f, raison: "adresse" });
    else r.destinataires[f] = liste.join(", ");
  }

  const accuse = typeof src.accuse === "object" && src.accuse !== null ? (src.accuse as Record<string, unknown>) : null;
  if (accuse) {
    if ("actif" in accuse) r.accuse.actif = accuse.actif === true;
    for (const cle of ["sujet", "texte"] as const) {
      const parLangue = typeof accuse[cle] === "object" && accuse[cle] !== null ? (accuse[cle] as Record<string, unknown>) : {};
      for (const l of LANGUES) {
        if (!(l in parLangue)) continue;
        const valeur = cle === "sujet" ? enTete(parLangue[l], LONGUEUR_SUJET_MAX) : texte(parLangue[l], LONGUEUR_TEXTE_MAX);
        // Vide : le texte livre revient, un accuse ne part jamais blanc.
        r.accuse[cle][l] = valeur || ACCUSE_PAR_DEFAUT[cle][l];
      }
    }
  }

  const plafonds = typeof src.plafonds === "object" && src.plafonds !== null ? (src.plafonds as Record<string, unknown>) : null;
  if (plafonds) {
    for (const cle of ["heure", "jour", "destinataire", "mois"] as const) {
      if (!(cle in plafonds)) continue;
      const n = entier(plafonds[cle], 0, PLAFOND_MAX, r.plafonds[cle]);
      if (n === null) erreurs.push({ champ: "plafonds", raison: "nombre" });
      else r.plafonds[cle] = n;
    }
  }
  if ("cycle" in src) {
    const n = entier(src.cycle, 1, 28, r.cycle);
    if (n === null) erreurs.push({ champ: "cycle", raison: "nombre" });
    else r.cycle = n;
  }
  return { reglages: r, erreurs };
}

/* --- Plafonds et cycle --------------------------------------------------- */

export const HEURE_MS = 3_600_000;
export const JOUR_MS = 24 * HEURE_MS;

export interface Comptes {
  heure: number;
  jour: number;
  destinataire: number;
  mois: number;
}

export type Plafond = keyof Plafonds;

/** Le premier plafond qu'un envoi de plus depasserait, ou null. 0 veut dire sans plafond. */
export function plafondAtteint(plafonds: Plafonds, comptes: Comptes): Plafond | null {
  for (const cle of ["destinataire", "heure", "jour", "mois"] as const) {
    const limite = plafonds[cle];
    if (limite > 0 && comptes[cle] >= limite) return cle;
  }
  return null;
}

/**
 * Le debut du cycle en cours, a minuit UTC le jour `cycle` du mois. Cloudflare
 * compte les 3 000 envois inclus sur le cycle de facturation du compte : le
 * reglage `cycle` permet de caler ce compteur dessus.
 */
export function debutDuCycle(maintenant: number, cycle: number): number {
  const d = new Date(maintenant);
  const jour = Math.min(Math.max(Math.trunc(cycle) || 1, 1), 28);
  let annee = d.getUTCFullYear();
  let mois = d.getUTCMonth();
  if (d.getUTCDate() < jour) {
    mois -= 1;
    if (mois < 0) {
      mois = 11;
      annee -= 1;
    }
  }
  return Date.UTC(annee, mois, jour);
}

/** Le debut du cycle suivant : la date ou le compteur repart a zero. */
export function finDuCycle(maintenant: number, cycle: number): number {
  const debut = new Date(debutDuCycle(maintenant, cycle));
  return Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() + 1, debut.getUTCDate());
}

/** Ce que coutera le mois si le rythme ne change pas : 0 tant qu'on reste sous les envois inclus. */
export function depassement(envoyes: number): { au_dela: number; dollars: number } {
  const au_dela = Math.max(0, envoyes - INCLUS_PAR_MOIS);
  return { au_dela, dollars: Math.ceil(au_dela / 1000) * PRIX_PAR_MILLE_USD };
}

/** Remplace {nom} et {site} dans un texte d'accuse. */
export function remplir(modele: string, valeurs: { nom: string; site: string }): string {
  return modele.replace(/\{nom\}/g, valeurs.nom).replace(/\{site\}/g, valeurs.site);
}

/**
 * La langue d'une requete du back office, dans l'ordre ou le back office
 * choisit la sienne : le cookie du moteur, puis la langue par defaut du site
 * (null : le navigateur decide), puis le navigateur. Les appels des pages
 * d'extension ne passent pas par la regle de langue du Worker, qui ne touche
 * que la page du back office : on la rejoue donc ici.
 */
export function langueDeLaRequete(cookie: string | null, parDefaut: string | null, acceptLanguage: string | null): Langue {
  const choisie = /(?:^|;\s*)emdash-locale=([a-zA-Z-]+)/.exec(cookie ?? "")?.[1];
  const langue = (choisie ?? parDefaut ?? acceptLanguage ?? "fr").trim().toLowerCase();
  return langue.startsWith("en") ? "en" : "fr";
}

/** Le chemin de retour d'un formulaire : une adresse de ce site, sans requete ni ancre. Tout le reste renvoie a l'accueil. */
export function cheminDeRetour(brut: unknown): string {
  const chemin = typeof brut === "string" ? (brut.split(/[?#]/)[0] ?? "").trim() : "";
  return /^\/(?!\/)[^\s\\]{0,200}$/.test(chemin) ? chemin : "/";
}
