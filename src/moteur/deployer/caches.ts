// src/moteur/deployer/caches.ts - vide les caches du contenu avec les fonctions d'EmDash et de la plateforme, et rend un bilan qui ne pretend rien.
//
// POURQUOI RIEN N'EST INVENTE ICI. Une publication invalide deja deux etages
// (voir les routes /_emdash/api/content/... du moteur) :
//   1. le cache d'objets (lectures de la base gardees dans KV) : EmDash avance
//      l'epoque de l'espace concerne, et tout ce qui etait garde devient
//      inatteignable. Ce fichier appelle les MEMES fonctions publiques, sur
//      TOUS les espaces au lieu d'un seul ;
//   2. le cache de routes (Workers Cache) : le fournisseur d'Astro appelle
//      `cache.purge({ tags })` de la plateforme. "Tout" s'ecrit
//      `cache.purge({ purgeEverything: true })`, la forme que documente EmDash.
//
// Ce qui n'est pas configure n'est pas vide, et le bilan le dit : un bouton qui
// annonce "caches vides" sur un site sans cache apprend a ne plus le croire.
import { CacheNamespace, invalidateCollectionCache, invalidateObjectCache, SchemaRegistry } from "emdash";
import { getDb } from "emdash/runtime";

export type BilanObjets = { etat: "aucun" } | { etat: "vide"; espaces: number };
export type BilanRoutes =
  | { etat: "aucun" }
  | { etat: "vide" }
  | { etat: "inconnu"; fournisseur: string }
  | { etat: "echec"; detail: string };

export interface BilanCaches {
  objets: BilanObjets;
  routes: BilanRoutes;
}

/** La seule partie de `cloudflare:workers` dont ce fichier a besoin. */
interface Plateforme {
  cache?: { purge(options: { purgeEverything: true }): Promise<{ success: boolean; errors: { message: string }[] }> };
}

async function viderLesObjets(): Promise<BilanObjets> {
  if (__ALOHA_CACHES__.objets === null) return { etat: "aucun" };
  // Les espaces partages (reglages, menus, taxonomies, signatures, schema,
  // commentaires), puis un espace par collection de contenu.
  const partages = Object.values(CacheNamespace);
  for (const espace of partages) invalidateObjectCache(espace);
  // Le registre de schemas d'EmDash connait les collections ; EmDash 0.38 ne
  // les expose pas encore au contexte des extensions.
  const collections = await new SchemaRegistry(await getDb()).listCollections();
  for (const collection of collections) invalidateCollectionCache(collection.slug);
  return { etat: "vide", espaces: partages.length + collections.length };
}

async function viderLesRoutes(): Promise<BilanRoutes> {
  const fournisseur = __ALOHA_CACHES__.routes;
  if (fournisseur === null) return { etat: "aucun" };
  // Astro ne sait invalider que par etiquette ou par chemin. Seule la
  // plateforme Cloudflare offre "tout" : un autre fournisseur est nomme, pas
  // pretendu vide.
  if (fournisseur !== "cloudflare") return { etat: "inconnu", fournisseur };
  try {
    // Le module n'existe que dans workerd. Son type arrive avec `wrangler
    // types`, que le theme n'embarque pas (voir src/worker.moteur.ts).
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: Plateforme = await import("cloudflare:workers");
    if (typeof plateforme.cache?.purge !== "function") {
      return { etat: "echec", detail: "cache.purge indisponible sur cette plateforme" };
    }
    const resultat = await plateforme.cache.purge({ purgeEverything: true });
    if (resultat.success) return { etat: "vide" };
    return { etat: "echec", detail: resultat.errors.map((erreur) => erreur.message).join(" ; ") || "purge refusee" };
  } catch (erreur) {
    return { etat: "echec", detail: erreur instanceof Error ? erreur.message : "purge impossible" };
  }
}

export async function viderLesCaches(): Promise<BilanCaches> {
  return { objets: await viderLesObjets(), routes: await viderLesRoutes() };
}
