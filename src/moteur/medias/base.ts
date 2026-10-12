// src/moteur/medias/base.ts - ce que l'extension Medias lit et ecrit dans la base du site (D1 en ligne, SQLite dans le self-check) : la table media d'EmDash et le journal aloha_medias.
//
// SQL BRUT ET NON LE KYSELY D'EMDASH : l'aiguillage tourne en tete du
// Worker, avant EmDash. La base arrive donc sous une forme minimale (lire,
// executer) que D1 et node:sqlite remplissent, comme dans l'extension seo.
//
// LA TABLE D'EMDASH 0.38 LUE ET ECRITE ICI (relue dans son dist, migrations
// 001 et 002) : media(id, filename, mime_type, size, width, height,
// storage_key, content_hash, status, created_at). On n'y change, et seulement
// pour une photo deja en base qu'on optimise, que filename, mime_type, size,
// width, height et content_hash ; jamais storage_key : c'est l'adresse
// /_emdash/api/media/file/<cle> que les pages ont copiee dans leur contenu.
//
// LA TABLE A NOUS, aloha_medias : une ligne par photo traitee (a l'envoi ou
// par lot), creee au premier usage. Elle est le journal de la carte du
// tableau de bord et la memoire du lot : une photo qui y figure n'est pas
// reprise, ce qui rend le lot reprenable apres une coupure.

export interface Base {
  lire<T = Record<string, unknown>>(sql: string, parametres?: unknown[]): Promise<T[]>;
  /** Rend le nombre de lignes changees. */
  executer(sql: string, parametres?: unknown[]): Promise<number>;
}

/** La forme d'une base D1, reduite a ce que ce fichier appelle. */
export interface D1 {
  prepare(sql: string): { bind(...valeurs: unknown[]): { all(): Promise<{ results?: unknown[] }>; run(): Promise<{ meta?: { changes?: number } }> } };
}

const bases = new WeakMap<object, Base>();

/** La Base d'une liaison D1, une par liaison et par isolat. */
export function baseD1(d1: D1): Base {
  let base = bases.get(d1);
  if (!base) {
    base = {
      lire: async <T>(sql: string, p: unknown[] = []) => ((await d1.prepare(sql).bind(...p).all()).results ?? []) as T[],
      executer: async (sql: string, p: unknown[] = []) => (await d1.prepare(sql).bind(...p).run()).meta?.changes ?? 0,
    };
    bases.set(d1, base);
  }
  return base;
}

/** La Base de la liaison `nom` de l'environnement, ou null si elle n'y est pas. */
export function d1De(env: Record<string, unknown> | null | undefined, nom = "DB"): Base | null {
  const d1 = env?.[nom] as D1 | undefined;
  return d1 && typeof d1.prepare === "function" ? baseD1(d1) : null;
}

export type EtatDuTraitement = "en-cours" | "fait" | "garde" | "echec";

export interface Ligne {
  media_id: string;
  etat: EtatDuTraitement;
  origine: "envoi" | "lot";
  nom: string | null;
  avant: number | null;
  apres: number | null;
  format: string | null;
  detail: string | null;
  quand: string;
}

const preparees = new WeakSet<Base>();

/** Cree la table une fois par base et par isolat. */
export async function preparer(base: Base): Promise<void> {
  if (preparees.has(base)) return;
  await base.executer(
    `CREATE TABLE IF NOT EXISTS aloha_medias (
      media_id TEXT PRIMARY KEY,
      etat TEXT NOT NULL,
      origine TEXT NOT NULL,
      nom TEXT,
      avant INTEGER,
      apres INTEGER,
      format TEXT,
      detail TEXT,
      quand TEXT NOT NULL
    )`,
  );
  await base.executer("CREATE INDEX IF NOT EXISTS idx_aloha_medias_quand ON aloha_medias (quand)");
  preparees.add(base);
}

/** Ecrit (ou remplace) la ligne d'une photo. */
export async function noter(base: Base, l: Ligne): Promise<void> {
  await preparer(base);
  await base.executer(
    `INSERT INTO aloha_medias (media_id, etat, origine, nom, avant, apres, format, detail, quand)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(media_id) DO UPDATE SET etat = excluded.etat, origine = excluded.origine, nom = excluded.nom,
       avant = excluded.avant, apres = excluded.apres, format = excluded.format, detail = excluded.detail, quand = excluded.quand`,
    [l.media_id, l.etat, l.origine, l.nom, l.avant, l.apres, l.format, l.detail, l.quand],
  );
}

/** Une reservation "en-cours" plus vieille que ca est reputee abandonnee (Worker coupe en plein lot) et se reprend. */
export const RESERVATION_MS = 10 * 60 * 1000;

/**
 * Reserve une photo pour le lot. Rend vrai si la reservation est a nous :
 * deux clics simultanes ne traitent jamais la meme photo, et une reservation
 * abandonnee se reprend apres RESERVATION_MS.
 */
export async function reserver(base: Base, id: string, maintenant: number): Promise<boolean> {
  await preparer(base);
  const quand = new Date(maintenant).toISOString();
  const perimee = new Date(maintenant - RESERVATION_MS).toISOString();
  const changes = await base.executer(
    `INSERT INTO aloha_medias (media_id, etat, origine, quand) VALUES (?, 'en-cours', 'lot', ?)
     ON CONFLICT(media_id) DO UPDATE SET quand = excluded.quand
     WHERE aloha_medias.etat = 'en-cours' AND aloha_medias.quand <= ?`,
    [id, quand, perimee],
  );
  return changes > 0;
}

export interface MediaEnBase {
  id: string;
  filename: string;
  mime_type: string;
  size: number | null;
  width: number | null;
  height: number | null;
  storage_key: string;
}

/** Les types que le lot peut reprendre ; l'AVIF, le GIF et le SVG n'y sont pas (voir regles.ts). */
export const TYPES_A_REPRENDRE = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function filtreDesCandidats(maintenant: number): { sql: string; parametres: unknown[] } {
  const perimee = new Date(maintenant - RESERVATION_MS).toISOString();
  return {
    sql: `FROM media m
      WHERE m.status = 'ready' AND m.mime_type IN (${TYPES_A_REPRENDRE.map(() => "?").join(", ")})
      AND NOT EXISTS (SELECT 1 FROM aloha_medias a WHERE a.media_id = m.id AND (a.etat <> 'en-cours' OR a.quand > ?))`,
    parametres: [...TYPES_A_REPRENDRE, perimee],
  };
}

/** Les prochaines photos du lot, les plus anciennes d'abord. */
export async function candidats(base: Base, limite: number, maintenant: number): Promise<MediaEnBase[]> {
  await preparer(base);
  const { sql, parametres } = filtreDesCandidats(maintenant);
  return base.lire<MediaEnBase>(
    `SELECT m.id, m.filename, m.mime_type, m.size, m.width, m.height, m.storage_key ${sql} ORDER BY m.created_at, m.id LIMIT ?`,
    [...parametres, limite],
  );
}

/** Combien de photos restent a examiner. */
export async function restantes(base: Base, maintenant: number): Promise<number> {
  await preparer(base);
  const { sql, parametres } = filtreDesCandidats(maintenant);
  const [r] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n ${sql}`, parametres);
  return Number(r?.n ?? 0);
}

/** Les dernieres lignes du journal, les plus recentes d'abord (sans les reservations en cours). */
export async function derniers(base: Base, combien: number): Promise<Ligne[]> {
  await preparer(base);
  return base.lire<Ligne>("SELECT * FROM aloha_medias WHERE etat <> 'en-cours' ORDER BY quand DESC LIMIT ?", [combien]);
}

/** Le bilan : combien de photos converties, et les octets gagnes. */
export async function bilan(base: Base): Promise<{ faites: number; gagnes: number }> {
  await preparer(base);
  const [r] = await base.lire<{ n: number; g: number | null }>(
    "SELECT COUNT(*) AS n, SUM(avant - apres) AS g FROM aloha_medias WHERE etat = 'fait'",
  );
  return { faites: Number(r?.n ?? 0), gagnes: Number(r?.g ?? 0) };
}

export interface NouvelleFiche {
  id: string;
  cle: string;
  ancienType: string;
  nom: string;
  type: string;
  taille: number;
  largeur: number | null;
  hauteur: number | null;
  empreinte: string;
}

/**
 * Met a jour la fiche d'une photo optimisee, a cle inchangee. La condition sur
 * la cle et l'ancien type refuse d'ecrire si la photo a change entre-temps
 * (remplacee, supprimee) : rend 0, et l'appelant remet l'original.
 */
export async function mettreAJourLaFiche(base: Base, f: NouvelleFiche): Promise<number> {
  return base.executer(
    `UPDATE media SET filename = ?, mime_type = ?, size = ?, width = COALESCE(?, width), height = COALESCE(?, height), content_hash = ?
     WHERE id = ? AND storage_key = ? AND mime_type = ? AND status = 'ready'`,
    [f.nom, f.type, f.taille, f.largeur, f.hauteur, f.empreinte, f.id, f.cle, f.ancienType],
  );
}

/** L'empreinte qu'EmDash 0.38 ecrit dans media.content_hash (src/utils/hash.ts) : SHA-1 en hexadecimal, prefixe "sha1:". */
export async function empreinte(octets: Uint8Array): Promise<string> {
  const copie = new Uint8Array(octets.byteLength);
  copie.set(octets);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-1", copie.buffer));
  return `sha1:${Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
