// src/moteur/cache-routes.ts - le fournisseur du cache de routes "cloudflare" du theme : celui de l'adapter, dont la purge ne fait jamais echouer une publication.
//
// POURQUOI UN DETOUR : le fournisseur de @astrojs/cloudflare appelle
// `cache.purge` de `cloudflare:workers` a chaque invalidation. Dans le workerd
// local, cette fonction n'existe pas, et EmDash invalide le cache APRES avoir
// ecrit : mesure le 22 septembre 2026, chaque creation de billet repondait 404
// avec un corps vide alors que le billet etait bien en base. Ici, la purge qui
// echoue est ecrite dans le journal du Worker et la reponse repart entiere.
// En ligne, avec Workers Cache active dans wrangler.moteur.jsonc, la purge
// passe ; sans lui, la page "Tout deployer" dit que le cache n'a PAS ete vide.
//
// Les en-tetes (Cloudflare-CDN-Cache-Control, Cache-Tag) restent ceux de
// l'adapter : ce fichier ne change que la reaction a une purge impossible.
import fournisseurCloudflare from "@astrojs/cloudflare/cache/provider";
import type { CacheProviderFactory } from "astro";

const fabrique: CacheProviderFactory = (config) => {
  const base = fournisseurCloudflare(config);
  return {
    ...base,
    async invalidate(options) {
      try {
        await base.invalidate(options);
      } catch (erreur) {
        const detail = erreur instanceof Error ? erreur.message : String(erreur);
        console.warn(`[moteur] cache de routes : purge impossible (${detail}) ; la page suivante peut rester en cache jusqu a une minute.`);
      }
    },
  };
};

export default fabrique;
