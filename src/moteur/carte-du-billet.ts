// src/moteur/carte-du-billet.ts - moteur allume : /og/billet/<cle>.jpg, la couverture d'un billet lue dans la mediatheque et recadree en carte de partage JPEG 1200x630 par le liant IMAGES.
//
// Injectee par moteur.config.mjs, rendue a la demande. Le chemin est celui
// du point d'entree d'images d'EmDash (@emdash-cms/cloudflare/image-endpoint),
// a une difference pres, qui est la raison de ce fichier : le recadrage
// `cover` (voir carte-du-billet.regles.ts). La couverture est lue dans le
// stockage du moteur (R2), jamais par une requete HTTP.
//
// Une carte qui ne peut pas etre fabriquee (couverture effacee, fichier qui
// n'est pas une image, liant IMAGES absent ou en echec) renvoie vers la carte
// par defaut du site : un apercu de partage montre toujours une photo.
import siteData from "@config/siteData.json";
import type { APIRoute } from "astro";
import { CARTE, cleSure } from "./carte-du-billet.regles";

export const prerender = false;

/** La seule partie du stockage d'EmDash dont cette route a besoin. */
interface Stockage {
  download(cle: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string }>;
}

/** La seule partie du liant Cloudflare Images dont cette route a besoin. */
interface LiantImages {
  input(corps: ReadableStream<Uint8Array>): {
    transform(options: { width: number; height: number; fit: "cover" }): {
      output(options: { format: "image/jpeg"; quality: number }): Promise<{ response(): Response }>;
    };
  };
}

/** Le liant IMAGES, sous le nom que l'adapter lui a donne, comme le fait EmDash. */
async function liantImages(): Promise<LiantImages | undefined> {
  // Le module n'existe que dans workerd. Son type arrive avec `wrangler
  // types`, que le theme n'embarque pas (voir src/worker.moteur.ts).
  // @ts-ignore -- module de la plateforme, absent du controle de types du theme
  const { env } = (await import("cloudflare:workers")) as { env: Record<string, unknown> };
  const nom = (globalThis as { __ASTRO_IMAGES_BINDING_NAME?: unknown }).__ASTRO_IMAGES_BINDING_NAME;
  return env[typeof nom === "string" && nom ? nom : "IMAGES"] as LiantImages | undefined;
}

export const GET: APIRoute = async ({ params, locals, url }) => {
  const cle = params.cle;
  if (!cleSure(cle)) return new Response("Not Found", { status: 404 });

  const repli = () => Response.redirect(new URL(siteData.defaultImage.src, url), 302);
  const stockage = (locals as { emdash?: { storage?: Stockage | null } }).emdash?.storage;
  const images = await liantImages();
  if (!stockage || !images) return repli();

  try {
    const source = await stockage.download(cle);
    if (!source.contentType.startsWith("image/")) return repli();
    const sortie = await images
      .input(source.body)
      .transform({ width: CARTE.largeur, height: CARTE.hauteur, fit: "cover" })
      .output({ format: "image/jpeg", quality: CARTE.qualite });
    const reponse = sortie.response();
    if (!reponse.ok || !reponse.body) return repli();
    return new Response(reponse.body, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Comme les images de la mediatheque : "Remplacer l'original" peut
        // reecrire la meme cle, une carte ne se fige donc pas dans les caches.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erreur) {
    console.error("[carte-du-billet] carte impossible, repli sur la carte par defaut :", erreur);
    return repli();
  }
};
