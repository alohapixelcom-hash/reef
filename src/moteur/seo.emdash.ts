// src/moteur/seo.emdash.ts - le panneau SEO d'une entree de collection, moteur allume (generique) : relu par getEmDashEntry quand la liste ne l'a pas apporte, ou tire du lot de la requete (seo.lot.ts).
//
// LE DEFAUT D'EMDASH 0.38 (trouve par Koa). Le chargeur ne plie la
// table _emdash_seo (titre, description, image de partage, canonique,
// noindex) que dans la lecture d'UNE entree : une entree rendue par
// getEmDashCollection n'a pas data.seo. Un gabarit qui lit le SEO d'un projet,
// d'un billet ou d'un produit depuis une liste le perd donc sans bruit (la
// fumee l'a vu, ni la couverture ni le guide). Chaque source.emdash.ts qui
// lit une collection a SEO appelle seoDeLEntree, jamais data.seo seul.
//
// UNE LISTE ENTIERE (le plan du site) : des le deuxieme panneau d'une meme
// collection et d'une meme langue dans une requete, tous les panneaux publies
// sont lus en une requete D1 (seo.lot.ts). Jamais en mode edition ni en
// apercu : la lecture d'une entree seule reste la reference.
//
// Moteur allume seulement : ce fichier importe emdash, il n'est lu que par
// les fichiers .emdash du site.
import { getEmDashEntry } from "emdash";
import { getRequestContext } from "emdash/request-context";
import { creerLesLots, indexerLeLot, type PanneauSeo, sqlDuLot } from "./seo.lot.ts";

export type { PanneauSeo };

interface D1 {
  prepare(sql: string): { bind(...valeurs: unknown[]): { all(): Promise<{ results?: unknown[] }> } };
}

/** La base du Worker (liaison DB), ou null hors Worker. */
async function laBase(): Promise<D1 | null> {
  try {
    // Le module n'existe que dans workerd (meme choix que seo/route.ts).
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: { env?: Record<string, unknown> } = await import("cloudflare:workers");
    const db = plateforme.env?.DB as D1 | undefined;
    return db && typeof db.prepare === "function" ? db : null;
  } catch {
    return null;
  }
}

const lots = creerLesLots(async (collection, locale) => {
  const sql = sqlDuLot(collection);
  const db = sql ? await laBase() : null;
  if (!sql || !db) return null;
  const lu = await db.prepare(sql).bind(collection, locale).all();
  return indexerLeLot((lu.results ?? []) as Record<string, unknown>[], locale);
});

const plein = (seo: unknown): seo is PanneauSeo => typeof seo === "object" && seo !== null && Object.keys(seo).length > 0;

/** Le contexte de la requete quand un lot peut servir : ni edition, ni apercu, ni base isolee. */
function requeteOrdinaire(): object | null {
  const ctx = getRequestContext();
  if (!ctx || ctx.editMode || ctx.preview || ctx.dbIsIsolated) return null;
  return ctx;
}

/**
 * Le panneau SEO de l'entree `slug` (dans `locale`) de `collection`, vide
 * s'il n'est pas rempli. `porte` : ce que la liste a deja apporte (data.seo),
 * pris tel quel quand il est rempli, sans relire la base.
 */
export async function seoDeLEntree(collection: string, slug: string, locale: string, porte?: unknown): Promise<PanneauSeo> {
  if (plein(porte)) return porte;
  const duLot = await lots.panneau(requeteOrdinaire(), collection, slug, locale);
  if (duLot !== undefined) return duLot;
  const { entry } = await getEmDashEntry(collection, slug, { locale });
  const seo = (entry?.data as { seo?: unknown } | undefined)?.seo;
  return plein(seo) ? seo : {};
}
