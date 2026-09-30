// src/moteur/extensions/courriels/noyau/base.ts - les deux tables des courriels (journal et reglages) et chaque requete qui les lit ou les ecrit.
//
// POURQUOI DES TABLES A NOUS ET PAS LE STOCKAGE DES EXTENSIONS : le journal
// doit se lire en SQL (compter les envois du mois, d'une heure, vers une
// adresse) et survivre a l'extension. Deux tables nommees courriels_*, dans
// la base du site (D1 en ligne), creees par `CREATE TABLE IF NOT EXISTS` au
// premier usage ET par le fichier SQL livre avec le patch : les deux sont
// idempotents, l'ordre ne compte pas. Aucune ligne existante n'est touchee.
//
// La base arrive par l'adaptateur (voir ../adaptateur.ts) sous une forme
// minimale : lire et executer, avec des parametres `?`. D1 et node:sqlite (les
// tests) la remplissent tous les deux.
import { debutDuCycle, type Comptes, type Etat, HEURE_MS, JOUR_MS, lireReglages, type Origine, type Reglages, reglagesParDefaut } from "./regles.ts";

export interface Base {
  lire<T = Record<string, unknown>>(sql: string, parametres?: unknown[]): Promise<T[]>;
  executer(sql: string, parametres?: unknown[]): Promise<void>;
}

/** Le schema, une instruction par element : D1 n'execute qu'une instruction par requete preparee. */
export const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS courriels_journal (
  id TEXT PRIMARY KEY,
  quand INTEGER NOT NULL,
  formulaire TEXT NOT NULL,
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  fournisseur TEXT NOT NULL,
  etat TEXT NOT NULL,
  code TEXT,
  erreur TEXT,
  identifiant TEXT,
  message TEXT,
  renvoi_de TEXT
)`,
  "CREATE INDEX IF NOT EXISTS courriels_journal_quand ON courriels_journal (quand)",
  "CREATE INDEX IF NOT EXISTS courriels_journal_etat ON courriels_journal (etat, quand)",
  "CREATE INDEX IF NOT EXISTS courriels_journal_destinataire ON courriels_journal (destinataire, quand)",
  `CREATE TABLE IF NOT EXISTS courriels_reglages (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  modifie_le INTEGER NOT NULL,
  modifie_par TEXT
)`,
];

/** Le fichier SQL livre avec le patch : le meme schema, rejouable sans risque. */
export const SQL_IDEMPOTENT = `-- Courriels du site : journal et reglages. Idempotent : rejouer ce fichier ne change rien.\n${SCHEMA.map((s) => `${s};`).join("\n")}\n`;

const pretes = new WeakMap<Base, Promise<void>>();

/** Cree les tables une fois par base et par isolat. */
export function preparer(base: Base): Promise<void> {
  let promesse = pretes.get(base);
  if (!promesse) {
    promesse = (async () => {
      for (const instruction of SCHEMA) await base.executer(instruction);
    })();
    promesse.catch(() => pretes.delete(base));
    pretes.set(base, promesse);
  }
  return promesse;
}

/* --- Reglages ------------------------------------------------------------ */

const CLE = "reglages";

export async function lireLesReglages(base: Base): Promise<Reglages> {
  await preparer(base);
  const [ligne] = await base.lire<{ valeur: string }>("SELECT valeur FROM courriels_reglages WHERE cle = ?", [CLE]);
  if (!ligne) return reglagesParDefaut();
  try {
    return lireReglages(JSON.parse(ligne.valeur)).reglages;
  } catch {
    return reglagesParDefaut();
  }
}

export async function ecrireLesReglages(base: Base, reglages: Reglages, qui: string, quand: number): Promise<void> {
  await preparer(base);
  await base.executer(
    "INSERT INTO courriels_reglages (cle, valeur, modifie_le, modifie_par) VALUES (?, ?, ?, ?) ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur, modifie_le = excluded.modifie_le, modifie_par = excluded.modifie_par",
    [CLE, JSON.stringify(reglages), quand, qui],
  );
}

/** Qui a modifie les reglages en dernier, et quand : l'ecran l'ecrit sous le formulaire. */
export async function derniereModification(base: Base): Promise<{ quand: number; qui: string } | null> {
  await preparer(base);
  const [ligne] = await base.lire<{ modifie_le: number; modifie_par: string | null }>("SELECT modifie_le, modifie_par FROM courriels_reglages WHERE cle = ?", [CLE]);
  return ligne ? { quand: Number(ligne.modifie_le), qui: ligne.modifie_par ?? "-" } : null;
}

/* --- Le fournisseur du canal d'EmDash ------------------------------------ */

/**
 * L'extension choisie pour livrer les courriels du canal d'EmDash (crochet
 * exclusif email:deliver), telle que le moteur la range dans sa table
 * `options`. En ligne, Courriels est seule a livrer : EmDash la choisit tout
 * seul. En developpement, EmDash ajoute sa "console" et le choix revient a
 * l'administrateur. null : aucun choix, ou table illisible.
 */
export async function fournisseurChoisi(base: Base): Promise<string | null> {
  try {
    const [ligne] = await base.lire<{ value: string }>("SELECT value FROM options WHERE name = ?", ["emdash:exclusive_hook:email:deliver"]);
    if (!ligne) return null;
    const valeur: unknown = JSON.parse(ligne.value);
    return typeof valeur === "string" ? valeur : null;
  } catch {
    return null;
  }
}

/* --- Journal ------------------------------------------------------------- */

/** Le courriel tel qu'il est parti (ou aurait du partir) : de quoi le renvoyer a l'identique. */
export interface Message {
  a: string[];
  sujet: string;
  texte: string;
  html?: string;
  reponse?: string;
  /** Des en-tetes de plus (la lettre d'information : List-Unsubscribe, RFC 8058). */
  entetes?: Record<string, string>;
}

export interface Ligne {
  id: string;
  quand: number;
  formulaire: Origine;
  destinataire: string;
  sujet: string;
  fournisseur: string;
  etat: Etat;
  code: string | null;
  erreur: string | null;
  identifiant: string | null;
  message: Message | null;
  renvoi_de: string | null;
}

/** Le journal garde un peu plus d'un an : assez pour comparer un mois a celui de l'an passe. */
export const CONSERVATION_MS = 400 * JOUR_MS;

/**
 * Une ligne au journal. Une seule fois par identifiant : le crochet qui
 * journalise (email:afterSend) et le repli de l'expediteur peuvent se croiser,
 * le second ne fait alors rien.
 */
export async function inscrire(base: Base, ligne: Ligne): Promise<void> {
  await preparer(base);
  await base.executer(
    "INSERT INTO courriels_journal (id, quand, formulaire, destinataire, sujet, fournisseur, etat, code, erreur, identifiant, message, renvoi_de) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
    [
      ligne.id,
      ligne.quand,
      ligne.formulaire,
      ligne.destinataire,
      ligne.sujet,
      ligne.fournisseur,
      ligne.etat,
      ligne.code,
      ligne.erreur,
      ligne.identifiant,
      ligne.message ? JSON.stringify(ligne.message) : null,
      ligne.renvoi_de,
    ],
  );
  await base.executer("DELETE FROM courriels_journal WHERE quand < ?", [ligne.quand - CONSERVATION_MS]);
}

export function versLigne(brut: Record<string, unknown>): Ligne {
  let message: Message | null = null;
  try {
    message = typeof brut.message === "string" ? (JSON.parse(brut.message) as Message) : null;
  } catch {
    message = null;
  }
  return {
    id: String(brut.id),
    quand: Number(brut.quand),
    formulaire: String(brut.formulaire) as Origine,
    destinataire: String(brut.destinataire),
    sujet: String(brut.sujet),
    fournisseur: String(brut.fournisseur),
    etat: String(brut.etat) as Etat,
    code: brut.code == null ? null : String(brut.code),
    erreur: brut.erreur == null ? null : String(brut.erreur),
    identifiant: brut.identifiant == null ? null : String(brut.identifiant),
    message,
    renvoi_de: brut.renvoi_de == null ? null : String(brut.renvoi_de),
  };
}

export async function uneLigne(base: Base, id: string): Promise<Ligne | null> {
  await preparer(base);
  const [brut] = await base.lire("SELECT * FROM courriels_journal WHERE id = ?", [id]);
  return brut ? versLigne(brut) : null;
}

export interface Filtre {
  etat?: Etat | "";
  formulaire?: Origine | "";
  limite: number;
}

export async function lignes(base: Base, filtre: Filtre): Promise<Ligne[]> {
  await preparer(base);
  const ou: string[] = [];
  const valeurs: unknown[] = [];
  if (filtre.etat) {
    ou.push("etat = ?");
    valeurs.push(filtre.etat);
  }
  if (filtre.formulaire) {
    ou.push("formulaire = ?");
    valeurs.push(filtre.formulaire);
  }
  const clause = ou.length ? `WHERE ${ou.join(" AND ")}` : "";
  const brut = await base.lire(`SELECT * FROM courriels_journal ${clause} ORDER BY quand DESC, id DESC LIMIT ?`, [...valeurs, Math.min(Math.max(filtre.limite, 1), 200)]);
  return brut.map(versLigne);
}

/**
 * Les envois refuses depuis `depuis` qu'aucun renvoi reussi n'a rattrapes, du
 * plus recent au plus ancien : de quoi mettre une carte rouge
 * au tableau de bord tant qu'un courriel n'est pas parti, et l'oter des qu'il
 * l'est.
 */
export async function echecsEnAttente(base: Base, depuis: number, limite = 20): Promise<Ligne[]> {
  await preparer(base);
  const brut = await base.lire(
    "SELECT * FROM courriels_journal j WHERE j.etat = 'refuse' AND j.quand >= ? AND NOT EXISTS (SELECT 1 FROM courriels_journal r WHERE r.renvoi_de = j.id AND r.etat = 'envoye') ORDER BY j.quand DESC, j.id DESC LIMIT ?",
    [depuis, limite],
  );
  return brut.map(versLigne);
}

const compter = async (base: Base, sql: string, valeurs: unknown[]): Promise<number> => {
  const [ligne] = await base.lire<{ n: number }>(sql, valeurs);
  return Number(ligne?.n ?? 0);
};

/** Ce que les plafonds comparent : les envois PARTIS (etat envoye) sur chaque fenetre. */
export async function comptes(base: Base, destinataire: string, maintenant: number, cycle: number): Promise<Comptes> {
  await preparer(base);
  const partis = "SELECT COUNT(*) AS n FROM courriels_journal WHERE etat = 'envoye' AND quand >= ?";
  const [heure, jour, vers, mois] = await Promise.all([
    compter(base, partis, [maintenant - HEURE_MS]),
    compter(base, partis, [maintenant - JOUR_MS]),
    compter(base, `${partis} AND destinataire = ?`, [maintenant - JOUR_MS, destinataire]),
    compter(base, partis, [debutDuCycle(maintenant, cycle)]),
  ]);
  return { heure, jour, destinataire: vers, mois };
}

export interface Bilan {
  envoyes: number;
  echecs: number;
  plafonnes: number;
  dernier: Ligne | null;
  dernierEnvoye: Ligne | null;
}

/** Les chiffres du tableau de bord pour le cycle en cours. */
export async function bilanDuCycle(base: Base, maintenant: number, cycle: number): Promise<Bilan> {
  await preparer(base);
  const debut = debutDuCycle(maintenant, cycle);
  const [parEtat, dernier, dernierEnvoye] = await Promise.all([
    base.lire<{ etat: string; n: number }>("SELECT etat, COUNT(*) AS n FROM courriels_journal WHERE quand >= ? GROUP BY etat", [debut]),
    base.lire("SELECT * FROM courriels_journal ORDER BY quand DESC, id DESC LIMIT 1"),
    base.lire("SELECT * FROM courriels_journal WHERE etat = 'envoye' ORDER BY quand DESC, id DESC LIMIT 1"),
  ]);
  const n = (etat: string) => Number(parEtat.find((l) => l.etat === etat)?.n ?? 0);
  return {
    envoyes: n("envoye"),
    echecs: n("refuse"),
    plafonnes: n("plafonne"),
    dernier: dernier[0] ? versLigne(dernier[0]) : null,
    dernierEnvoye: dernierEnvoye[0] ? versLigne(dernierEnvoye[0]) : null,
  };
}
