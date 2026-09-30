// src/moteur/extensions/courriels/noyau/messages.ts - les messages recus par le formulaire de contact : la table courriels_messages et chaque requete qui la lit ou l'ecrit.
//
// POURQUOI GARDER LE MESSAGE ICI, EN PLUS DU COURRIEL : le proprietaire du
// site doit pouvoir le relire, le classer et y repondre depuis SON back
// office, meme si la notification n'est pas partie (liaison absente,
// destinataire pas encore regle). Le message est inscrit AVANT l'envoi de la
// notification : il n'est jamais perdu.
//
// Quatre statuts : nouveau (non lu), lu, repondu, archive. Supprimer efface
// la ligne (geste confirme a l'ecran, nombre affiche). Aucune adresse IP ni
// navigateur n'est garde : le nom, l'adresse, le sujet, le message, la langue
// et la page d'ou il vient.
import type { Base } from "./base.ts";

export const SCHEMA_MESSAGES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS courriels_messages (
  id TEXT PRIMARY KEY,
  recu_le INTEGER NOT NULL,
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  sujet TEXT NOT NULL,
  message TEXT NOT NULL,
  langue TEXT NOT NULL,
  page TEXT,
  statut TEXT NOT NULL DEFAULT 'nouveau',
  lu_le INTEGER,
  repondu_le INTEGER,
  reponse TEXT
)`,
  "CREATE INDEX IF NOT EXISTS courriels_messages_statut ON courriels_messages (statut, recu_le)",
];

/** Le fichier SQL livre avec la version : le meme schema, rejouable sans risque. */
export const SQL_MESSAGES = `-- Messages du formulaire de contact. Idempotent : rejouer ce fichier ne change rien.\n${SCHEMA_MESSAGES.map((s) => `${s};`).join("\n")}\n`;

export const STATUTS = ["nouveau", "lu", "repondu", "archive"] as const;
export type Statut = (typeof STATUTS)[number];

export interface MessageRecu {
  id: string;
  recu_le: number;
  nom: string;
  adresse: string;
  sujet: string;
  message: string;
  langue: "fr" | "en";
  page: string | null;
  statut: Statut;
  lu_le: number | null;
  repondu_le: number | null;
  reponse: string | null;
}

const pretes = new WeakMap<Base, Promise<void>>();

export function preparerLesMessages(base: Base): Promise<void> {
  let promesse = pretes.get(base);
  if (!promesse) {
    promesse = (async () => {
      for (const instruction of SCHEMA_MESSAGES) await base.executer(instruction);
    })();
    promesse.catch(() => pretes.delete(base));
    pretes.set(base, promesse);
  }
  return promesse;
}

const statutLu = (v: unknown): Statut => ((STATUTS as readonly unknown[]).includes(v) ? (v as Statut) : "nouveau");
const nombreOuNul = (v: unknown): number | null => (v == null ? null : Number(v));

function versMessage(b: Record<string, unknown>): MessageRecu {
  return {
    id: String(b.id),
    recu_le: Number(b.recu_le),
    nom: String(b.nom ?? ""),
    adresse: String(b.adresse ?? ""),
    sujet: String(b.sujet ?? ""),
    message: String(b.message ?? ""),
    langue: b.langue === "fr" ? "fr" : "en",
    page: b.page == null ? null : String(b.page),
    statut: statutLu(b.statut),
    lu_le: nombreOuNul(b.lu_le),
    repondu_le: nombreOuNul(b.repondu_le),
    reponse: b.reponse == null ? null : String(b.reponse),
  };
}

export interface Nouveau {
  nom: string;
  adresse: string;
  sujet: string;
  message: string;
  langue: "fr" | "en";
  page: string | null;
}

export async function garderLeMessage(base: Base, m: Nouveau, quand: number, id: string): Promise<void> {
  await preparerLesMessages(base);
  await base.executer("INSERT INTO courriels_messages (id, recu_le, nom, adresse, sujet, message, langue, page, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nouveau') ON CONFLICT (id) DO NOTHING", [id, quand, m.nom, m.adresse, m.sujet, m.message, m.langue, m.page]);
}

/** Un filtre de la boite : un statut, "boite" (tout sauf l'archive), ou "tous". */
export type Filtre = Statut | "boite" | "tous";

export interface Recherche {
  filtre?: Filtre;
  q?: string;
  /** Le nombre deja affiche : la page suivante commence la. */
  depuis?: number;
  limite?: number;
}

/** Echappe un motif LIKE : % et _ cherches tels quels. */
export const motif = (q: string): string => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function clause(r: Recherche): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const f = r.filtre ?? "boite";
  if (f === "boite") conditions.push("statut <> 'archive'");
  else if (f !== "tous") {
    conditions.push("statut = ?");
    params.push(f);
  }
  const q = (r.q ?? "").trim().slice(0, 120);
  if (q) {
    conditions.push("(nom LIKE ? ESCAPE '\\' OR adresse LIKE ? ESCAPE '\\' OR sujet LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')");
    const m = motif(q.toLowerCase());
    params.push(m, m, m, m);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listeDesMessages(base: Base, r: Recherche): Promise<{ items: MessageRecu[]; suite: number | null; total: number }> {
  await preparerLesMessages(base);
  const { where, params } = clause(r);
  const limite = Math.min(Math.max(r.limite ?? 50, 1), 5000);
  const depuis = Math.max(r.depuis ?? 0, 0);
  const brut = await base.lire(`SELECT * FROM courriels_messages ${where} ORDER BY recu_le DESC, id DESC LIMIT ? OFFSET ?`, [...params, limite + 1, depuis]);
  const [compte] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_messages ${where}`, params);
  const items = brut.slice(0, limite).map(versMessage);
  return { items, suite: brut.length > limite ? depuis + limite : null, total: Number(compte?.n ?? 0) };
}

export async function compterLesMessages(base: Base): Promise<Record<Statut, number>> {
  await preparerLesMessages(base);
  const lignes = await base.lire<{ statut: string; n: number }>("SELECT statut, COUNT(*) AS n FROM courriels_messages GROUP BY statut");
  const n = (s: Statut) => Number(lignes.find((l) => l.statut === s)?.n ?? 0);
  return { nouveau: n("nouveau"), lu: n("lu"), repondu: n("repondu"), archive: n("archive") };
}

export async function unMessage(base: Base, id: string): Promise<MessageRecu | null> {
  await preparerLesMessages(base);
  const [brut] = await base.lire("SELECT * FROM courriels_messages WHERE id = ?", [id]);
  return brut ? versMessage(brut) : null;
}

/** Au plus 5 000 identifiants par geste, chacun court et sans doublon. */
export function identifiants(brut: unknown): string[] {
  if (!Array.isArray(brut)) return [];
  return [...new Set(brut.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 80))].slice(0, 5000);
}

const marques = (n: number): string => Array.from({ length: n }, () => "?").join(", ");

/** Par paquets de 90 : D1 refuse une requete de plus de 100 parametres. */
async function parPaquets(ids: readonly string[], faire: (paquet: string[]) => Promise<number>): Promise<number> {
  let n = 0;
  for (let i = 0; i < ids.length; i += 90) n += await faire(ids.slice(i, i + 90));
  return n;
}

/** Classe des messages ; rend le nombre de lignes changees. "lu" pose la date de lecture la premiere fois. */
export async function classer(base: Base, ids: readonly string[], statut: Statut, quand: number): Promise<number> {
  if (!ids.length) return 0;
  await preparerLesMessages(base);
  return parPaquets(ids, async (p) => {
    const [avant] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_messages WHERE id IN (${marques(p.length)}) AND statut <> ?`, [...p, statut]);
    await base.executer(`UPDATE courriels_messages SET statut = ?, lu_le = CASE WHEN ? <> 'nouveau' THEN COALESCE(lu_le, ?) ELSE lu_le END WHERE id IN (${marques(p.length)})`, [statut, statut, quand, ...p]);
    return Number(avant?.n ?? 0);
  });
}

export async function supprimerDesMessages(base: Base, ids: readonly string[]): Promise<number> {
  if (!ids.length) return 0;
  await preparerLesMessages(base);
  return parPaquets(ids, async (p) => {
    const [avant] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_messages WHERE id IN (${marques(p.length)})`, p);
    await base.executer(`DELETE FROM courriels_messages WHERE id IN (${marques(p.length)})`, p);
    return Number(avant?.n ?? 0);
  });
}

export async function noterLaReponse(base: Base, id: string, texte: string, quand: number): Promise<void> {
  await preparerLesMessages(base);
  await base.executer("UPDATE courriels_messages SET statut = 'repondu', repondu_le = ?, reponse = ?, lu_le = COALESCE(lu_le, ?) WHERE id = ?", [quand, texte, quand, id]);
}
