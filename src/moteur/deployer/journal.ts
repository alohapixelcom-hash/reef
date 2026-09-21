// src/moteur/deployer/journal.ts - le journal des clics sur "Tout deployer" : qui, quand, avec quel resultat.
//
// OU IL VIT : dans le stockage de l'extension (collection `journal`), donc dans
// la base du site, a cote du contenu. Pas de service en plus, pas de fichier :
// qui sauvegarde la base sauvegarde le journal. La garde d'une minute et le
// dernier declenchement vivent dans le KV de l'extension, qui sait comparer
// avant d'ecrire : deux clics simultanes ne passent pas tous les deux.
import type { PluginContext, StorageCollection } from "emdash";
import { attente } from "./regles";

export type Build =
  /** Le hook a repondu : `code` porte sa reponse, 2xx ou non. */
  | "declenche"
  /** Le hook n'a pas repondu (reseau, delai depasse). */
  | "injoignable"
  /** Clic refuse par la garde d'une minute : rien n'a ete fait. */
  | "refuse"
  /** ALOHA_DEPLOY_HOOK absente : seuls les caches ont ete traites. */
  | "sans-hook"
  /** ALOHA_DEPLOY_HOOK illisible : seuls les caches ont ete traites. */
  | "hook-invalide";

export interface Passage {
  quand: string;
  qui: string;
  caches: string;
  build: Build;
  /** Code HTTP rendu par le hook ; null quand aucune reponse n'est arrivee ou qu'aucune requete n'est partie. */
  code: number | null;
  /** L'horodatage du build servi au moment du clic : s'il change ensuite, le redeploiement est prouve. */
  construit: string;
}

// Le journal sert a repondre "qui a deploye hier", pas a archiver : au-dela,
// les plus anciens partent.
const TAILLE_MAX = 50;
const CLE_GARDE = "garde:declenchement";
const CLE_DERNIER = "etat:dernier-declenchement";

function collection(ctx: PluginContext): StorageCollection<Passage> {
  const journal = ctx.storage.journal;
  if (!journal) throw new Error("Collection `journal` non declaree dans l'extension.");
  return journal as StorageCollection<Passage>;
}

export async function inscrire(ctx: PluginContext, passage: Passage): Promise<void> {
  const journal = collection(ctx);
  await journal.put(`${Date.parse(passage.quand)}-${crypto.randomUUID().slice(0, 8)}`, passage);
  if (passage.build === "declenche" || passage.build === "injoignable") await ctx.kv.set(CLE_DERNIER, passage);
  const total = await journal.count();
  if (total <= TAILLE_MAX) return;
  const anciens = await journal.query({ orderBy: { quand: "asc" }, limit: Math.min(total - TAILLE_MAX, 100) });
  await journal.deleteMany(anciens.items.map((item) => item.id));
}

export async function derniers(ctx: PluginContext, combien: number): Promise<Passage[]> {
  const page = await collection(ctx).query({ orderBy: { quand: "desc" }, limit: combien });
  return page.items.map((item) => item.data);
}

/** Le dernier clic qui a reellement envoye une requete au hook, meme s'il est sorti des cinq lignes affichees. */
export function dernierDeclenchement(ctx: PluginContext): Promise<Passage | null> {
  return ctx.kv.get<Passage>(CLE_DERNIER);
}

/**
 * Prend la garde d'une minute. Rend 0 quand elle est prise, sinon le nombre
 * de millisecondes a attendre. L'ecriture est conditionnelle : si un autre
 * clic l'a prise entre la lecture et l'ecriture, celui-ci est refuse.
 */
export async function prendreLaGarde(ctx: PluginContext, maintenant: number): Promise<number> {
  const actuelle = await ctx.kv.getVersioned<number>(CLE_GARDE);
  const reste = attente(actuelle?.value ?? null, maintenant);
  if (reste > 0) return reste;
  const pose = await ctx.kv.compareAndSet(CLE_GARDE, actuelle?.revision ?? null, maintenant);
  return pose.applied ? 0 : attente(maintenant, maintenant);
}

/** Rend la garde quand aucune requete n'a atteint le hook : on doit pouvoir reessayer tout de suite. */
export async function rendreLaGarde(ctx: PluginContext): Promise<void> {
  await ctx.kv.delete(CLE_GARDE);
}
