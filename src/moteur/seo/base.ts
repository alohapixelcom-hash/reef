// src/moteur/seo/base.ts - ce que l'extension SEO lit et ecrit dans la base du site (D1 en ligne, SQLite dans les essais) : entrees publiees, panneau SEO, redirections, reglage robots.txt d'EmDash, table aloha_seo.
//
// SQL BRUT ET NON LE KYSELY D'EMDASH : l'aiguillage tourne en tete du
// Worker, avant EmDash, et le Worker de la boutique (alohapixel.app) lit la
// meme base par une autre liaison, sans EmDash du tout. La base arrive donc
// sous une forme minimale (lire, executer) que D1 et node:sqlite remplissent.
//
// LES TABLES D'EMDASH 0.38 LUES ICI (relues dans son dist) :
//   ec_<collection>      status, deleted_at, slug, locale, translation_group, updated_at
//   _emdash_seo          collection, content_id, seo_no_index, seo_image, seo_canonical
//   _emdash_redirects    source, is_pattern, enabled
//   options              name = "site:seo", value JSON { robotsTxt, ... }, revision
// Rien n'est jamais ecrit dans une table d'EmDash, sauf la cle robotsTxt de
// "site:seo" : c'est la que l'ecran Parametres > SEO d'EmDash range le meme
// texte, et une seule source vaut mieux que deux.
//
// LA TABLE A NOUS, aloha_seo : le texte de llms.txt, la trace de la derniere
// modification de robots.txt (date, auteur, empreinte), et le resume du
// dernier calcul du plan (nom "plan") que l'ecran SEO affiche.

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

/** Une liaison D1 reconnue dans un environnement de Worker, ou null. */
export function d1De(env: Record<string, unknown> | undefined, nom: string): Base | null {
  const v = env?.[nom];
  return typeof v === "object" && v !== null && typeof (v as D1).prepare === "function" ? baseD1(v as D1) : null;
}

export const SCHEMA = `CREATE TABLE IF NOT EXISTS aloha_seo (
  nom TEXT PRIMARY KEY,
  contenu TEXT,
  empreinte TEXT,
  maj INTEGER NOT NULL,
  maj_par TEXT
)`;

const pretes = new WeakMap<Base, Promise<void>>();

/** Cree la table une fois par base et par isolat (idempotent). */
export function preparer(base: Base): Promise<void> {
  let p = pretes.get(base);
  if (!p) {
    p = base.executer(SCHEMA).then(() => undefined);
    p.catch(() => pretes.delete(base));
    pretes.set(base, p);
  }
  return p;
}

/** Une entree publiee d'une collection, telle que le plan la lit. */
export interface EntreePubliee {
  collection: string;
  id: string;
  slug: string;
  locale: string | null;
  groupe: string | null;
  majLe: string | null;
  noindex: boolean;
  image: string | null;
  canonique: string | null;
}

const IDENTIFIANT = /^[a-z][a-z0-9_]*$/;

/**
 * Les entrees publiees de chaque collection demandee, avec leur panneau SEO.
 * Une collection absente de la base (pas encore creee) est sautee : elle est
 * rendue dans `manquantes`, jamais une erreur du plan entier.
 */
export async function lireLesEntrees(base: Base, collections: string[]): Promise<{ entrees: EntreePubliee[]; manquantes: string[] }> {
  // Une requete par collection, toutes lancees ensemble : sur D1, chaque
  // aller-retour coute de 50 a 200 ms, et le plan les payait l'un apres l'autre.
  const lues = await Promise.all(
    collections.map(async (collection): Promise<EntreePubliee[] | null> => {
      // Le nom de la table entre dans le SQL : seul un identifiant propre passe.
      if (!IDENTIFIANT.test(collection)) return null;
      try {
        const lignes = await base.lire<Record<string, unknown>>(
          `SELECT c.id, c.slug, c.locale, c.translation_group, c.updated_at, s.seo_no_index, s.seo_image, s.seo_canonical
           FROM "ec_${collection}" c
           LEFT JOIN _emdash_seo s ON s.collection = ? AND s.content_id = c.id
           WHERE c.status = 'published' AND c.deleted_at IS NULL AND c.slug IS NOT NULL AND TRIM(c.slug) <> ''`,
          [collection],
        );
        return lignes.map((l) => ({
          collection,
          id: String(l.id),
          slug: String(l.slug),
          locale: l.locale ? String(l.locale) : null,
          groupe: l.translation_group ? String(l.translation_group) : null,
          majLe: l.updated_at ? String(l.updated_at) : null,
          noindex: Number(l.seo_no_index ?? 0) === 1,
          image: l.seo_image ? String(l.seo_image) : null,
          canonique: l.seo_canonical ? String(l.seo_canonical) : null,
        }));
      } catch {
        return null;
      }
    }),
  );
  const entrees: EntreePubliee[] = [];
  const manquantes: string[] = [];
  lues.forEach((lot, i) => {
    if (lot) entrees.push(...lot);
    else manquantes.push(collections[i]!);
  });
  return { entrees, manquantes };
}

/** Les sources des redirections actives d'EmDash (menu Redirections). Table absente : aucune. */
export async function lireLesRedirections(base: Base): Promise<{ source: string; motif: boolean }[]> {
  try {
    const lignes = await base.lire<{ source: unknown; is_pattern: unknown }>("SELECT source, is_pattern FROM _emdash_redirects WHERE enabled = 1");
    return lignes.map((l) => ({ source: String(l.source), motif: Number(l.is_pattern) === 1 }));
  } catch {
    return [];
  }
}

/* --- robots.txt : la cle robotsTxt du reglage "site:seo" d'EmDash ---------- */

interface ReglageSeo {
  valeur: Record<string, unknown>;
  /** La valeur telle que la base la porte : la condition de l'ecriture quand la colonne revision manque. */
  brut: string | null;
  revision: string | null;
  lisible: boolean;
}

async function lireReglageSeo(base: Base): Promise<ReglageSeo> {
  const l = (await base.lire<{ value: unknown; revision?: unknown }>("SELECT * FROM options WHERE name = 'site:seo'"))[0];
  if (!l) return { valeur: {}, brut: null, revision: null, lisible: true };
  const brut = String(l.value);
  const revision = l.revision === undefined || l.revision === null ? null : String(l.revision);
  try {
    const lu = JSON.parse(brut) as unknown;
    if (typeof lu === "object" && lu !== null && !Array.isArray(lu)) return { valeur: lu as Record<string, unknown>, brut, revision, lisible: true };
  } catch {
    // Illisible : traitee comme vide a la lecture, jamais reecrite (ecrireRobots refuse).
  }
  return { valeur: {}, brut, revision, lisible: false };
}

/** Le texte de robots.txt saisi dans le back office, ou null (texte par defaut du site). */
export async function lireRobots(base: Base): Promise<string | null> {
  const { valeur } = await lireReglageSeo(base);
  return typeof valeur.robotsTxt === "string" && valeur.robotsTxt.trim() !== "" ? valeur.robotsTxt : null;
}

/**
 * Ecrit robotsTxt (ou l'efface quand `texte` vaut null) en gardant les autres
 * cles du reglage (separateur de titre, verifications, image de partage).
 * L'ecriture ne passe que si la revision lue est encore la : un enregistrement
 * fait entre-temps dans Parametres > SEO n'est jamais ecrase sans le savoir.
 */
export async function ecrireRobots(base: Base, texte: string | null): Promise<"ecrit" | "conflit" | "illisible"> {
  const lu = await lireReglageSeo(base);
  if (!lu.lisible) return "illisible";
  const valeur = { ...lu.valeur };
  if (texte === null) delete valeur.robotsTxt;
  else valeur.robotsTxt = texte;
  const json = JSON.stringify(valeur);
  const revision = crypto.randomUUID();
  let n: number;
  if (lu.brut === null) n = await base.executer("INSERT INTO options (name, value) VALUES ('site:seo', ?) ON CONFLICT(name) DO NOTHING", [json]);
  else if (lu.revision === null) n = await base.executer("UPDATE options SET value = ? WHERE name = 'site:seo' AND value = ?", [json, lu.brut]);
  else n = await base.executer("UPDATE options SET value = ?, revision = ? WHERE name = 'site:seo' AND revision = ?", [json, revision, lu.revision]);
  return n === 1 ? "ecrit" : "conflit";
}

/* --- La table aloha_seo ----------------------------------------------------- */

export interface Ligne {
  nom: string;
  contenu: string | null;
  empreinte: string | null;
  maj: number;
  maj_par: string | null;
}

export async function lireLigne(base: Base, nom: string): Promise<Ligne | null> {
  await preparer(base);
  const l = (await base.lire<Ligne>("SELECT nom, contenu, empreinte, maj, maj_par FROM aloha_seo WHERE nom = ?", [nom]))[0];
  return l ? { ...l, maj: Number(l.maj) } : null;
}

export async function ecrireLigne(base: Base, l: Ligne): Promise<void> {
  await preparer(base);
  await base.executer(
    "INSERT INTO aloha_seo (nom, contenu, empreinte, maj, maj_par) VALUES (?, ?, ?, ?, ?) ON CONFLICT(nom) DO UPDATE SET contenu = excluded.contenu, empreinte = excluded.empreinte, maj = excluded.maj, maj_par = excluded.maj_par",
    [l.nom, l.contenu, l.empreinte, l.maj, l.maj_par],
  );
}

export async function effacerLigne(base: Base, nom: string): Promise<void> {
  await preparer(base);
  await base.executer("DELETE FROM aloha_seo WHERE nom = ?", [nom]);
}

/** Une empreinte courte d'un texte (FNV-1a 32 bits) : dit si robots.txt a change ailleurs depuis le dernier enregistrement d'ici. */
export function empreinte(texte: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
