// src/moteur/version.ts - /version.json, rendu a la demande : la version que le site sert a cet instant, et l'heure de son build.
//
// POURQUOI CETTE ROUTE : un bouton "Tout deployer" qui repond "c'est parti" ne
// prouve rien. L'horodatage ci-dessous est fige au build (define de Vite, voir
// moteur.config.mjs) : tant que l'ancien Worker repond, il ne bouge pas ; des
// que le nouveau est en ligne, il change. C'est la preuve qu'on montre, et
// n'importe qui peut la relire sans ouvrir le back office.
import type { APIRoute } from "astro";

export const prerender = false;

/** La meme valeur pour la route publique et pour la page du back office : un seul Worker, une seule verite. */
export const versionServie = {
  version: __ALOHA_VERSION__,
  construit: __ALOHA_CONSTRUIT__,
  moteur: "emdash",
} as const;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(versionServie), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Une preuve mise en cache ne prouve plus rien. Sans cet en-tete, un
      // cache de bord garderait la reponse deux heures par heuristique.
      "Cache-Control": "no-store",
    },
  });
