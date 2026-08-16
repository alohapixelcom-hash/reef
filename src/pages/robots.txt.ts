// src/pages/robots.txt.ts - robots.txt dynamique : tout est autorise sauf la recherche interne, sitemap en URL absolue.
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  // L'URL du sitemap est absolue, derivee de "site" dans astro.config : une
  // seule edition la corrige en meme temps que canonical, OG et llms.txt.
  const base = site ?? url;
  const sitemap = new URL("/sitemap-index.xml", base).href;

  // La recherche est interdite aux robots pour la meme raison qu'elle est en
  // noindex : elle ne produit aucune page qui leur soit utile, et laisser
  // explorer des URLs a parametres dilue le site dans son propre bruit.
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /search/",
    "Disallow: /*/search/",
    "",
    `Sitemap: ${sitemap}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
