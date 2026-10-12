// src/moteur/extensions/courriels/noyau/champs.ts - les champs en plus d'un formulaire du site (prenom, telephone, societe, numero de commande) : declares par le site, lus, nettoyes, bornes, puis ecrits en tete du message garde et du courriel.
//
// POURQUOI DECLARES PAR LE SITE ET PAS LUS TELS QUELS : un champ que la
// declaration ne nomme pas est ignore. Sinon un robot ferait porter au message
// garde et au courriel autant de lignes qu'il veut, sous les libelles de son
// choix. Le site les declare dans configuration.ts (`formulairesDuSite`), avec
// leur libelle dans les deux langues du back office, leur caractere requis et
// leur longueur.
//
// POURQUOI EN TETE DU TEXTE ET PAS DANS DES COLONNES : la table
// courriels_messages existe deja dans la base de chaque site en ligne. Ecrits
// en tete du message, les champs se lisent a l'ecran Messages, dans la
// notification et dans un renvoi, sans migration de base.
//
// ECHAPPES : une valeur tient sur une ligne (aucun saut ni caractere de
// controle : ni injection d'en-tete, ni fausse ligne "Libelle : valeur"), sans
// < > " (le message peut etre relu dans une page HTML), et bornee.
import type { Langue } from "./regles.ts";

export interface ChampEnPlus {
  /** L'attribut name du champ : minuscules, chiffres et tiret bas. */
  nom: string;
  /** Le libelle ecrit devant la valeur, dans la langue du back office. */
  libelle: Readonly<Record<Langue, string>>;
  requis?: boolean;
  /** Longueur gardee, 200 par defaut, 1 000 au plus. */
  max?: number;
}

export interface FormulaireDuSite {
  champs?: readonly ChampEnPlus[];
  /** Faux : le nom n'est pas exige (vrai par defaut, comme avant). */
  nomRequis?: boolean;
  /** Faux : le message n'est pas exige (vrai par defaut, comme avant). */
  messageRequis?: boolean;
}

/** Le champ cache qui dit quel formulaire du site poste (contact-sav, contact-pro...). */
export const CHAMP_FORMULAIRE = "formulaire";
export const MAX_PAR_DEFAUT = 200;
export const MAX_ABSOLU = 1000;
export const CHAMPS_AU_PLUS = 12;
/** Les noms que la route lit deja ou qui portent la mecanique du formulaire. */
export const NOMS_RESERVES: readonly string[] = ["name", "email", "topic", "subject", "message", "retour", "langue", "site_web", CHAMP_FORMULAIRE, "cf-turnstile-response"];

const NOM_DE_CHAMP = /^[a-z][a-z0-9_]{0,39}$/;
const NOM_DE_FORMULAIRE = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** Une valeur sur une ligne, sans caractere de controle ni < > ", bornee. */
export function uneLigne(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/[<>"]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

function champValide(c: unknown): c is ChampEnPlus {
  if (typeof c !== "object" || c === null) return false;
  const o = c as { nom?: unknown; libelle?: unknown };
  if (typeof o.nom !== "string" || !NOM_DE_CHAMP.test(o.nom) || NOMS_RESERVES.includes(o.nom)) return false;
  const l = o.libelle as { fr?: unknown; en?: unknown } | null;
  return typeof l === "object" && l !== null && typeof l.fr === "string" && !!l.fr.trim() && typeof l.en === "string" && !!l.en.trim();
}

/** La declaration d'un formulaire, lue sans confiance : ce qui est mal forme est ecarte, un nom en double aussi. */
export function formulaireDeclare(table: unknown, id: unknown): FormulaireDuSite | null {
  if (typeof id !== "string" || !NOM_DE_FORMULAIRE.test(id)) return null;
  if (typeof table !== "object" || table === null || !Object.hasOwn(table, id)) return null;
  const brut = (table as Record<string, unknown>)[id];
  if (typeof brut !== "object" || brut === null) return null;
  const f = brut as { champs?: unknown; nomRequis?: unknown; messageRequis?: unknown };
  const vus = new Set<string>();
  const champs = (Array.isArray(f.champs) ? f.champs : []).filter((c): c is ChampEnPlus => champValide(c) && !vus.has(c.nom) && !!vus.add(c.nom)).slice(0, CHAMPS_AU_PLUS);
  return { champs, nomRequis: f.nomRequis !== false, messageRequis: f.messageRequis !== false };
}

export interface Valeur {
  nom: string;
  libelle: string;
  valeur: string;
}

/** Les valeurs des champs declares, dans leur ordre ; `manquant` quand un champ requis est vide. */
export function lireLesChampsEnPlus(f: FormulaireDuSite | null, brut: Record<string, unknown>, langue: Langue): { valeurs: Valeur[]; manquant: boolean } {
  const valeurs: Valeur[] = [];
  let manquant = false;
  for (const c of f?.champs ?? []) {
    const max = Math.min(Math.max(Math.floor(Number(c.max ?? MAX_PAR_DEFAUT)) || MAX_PAR_DEFAUT, 1), MAX_ABSOLU);
    const valeur = uneLigne(brut[c.nom], max);
    if (!valeur) {
      if (c.requis) manquant = true;
      continue;
    }
    valeurs.push({ nom: c.nom, libelle: uneLigne(c.libelle[langue], 80), valeur });
  }
  return { valeurs, manquant };
}

/** Le texte garde et envoye : les champs en plus, une ligne chacun, puis le message du visiteur. */
export function corpsDuMessage(valeurs: readonly Valeur[], message: string, langue: Langue): string {
  if (valeurs.length === 0) return message;
  const separateur = langue === "fr" ? " : " : ": ";
  const tete = valeurs.map((v) => `${v.libelle}${separateur}${v.valeur}`).join("\n");
  return message ? `${tete}\n\n${message}` : tete;
}
