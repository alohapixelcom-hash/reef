// src/moteur/plan-du-site.index.ts - l'index des plans de site, rendu a la demande : /sitemap-index.xml, moteur allume.
//
// POURQUOI. Moteur eteint, l'integration sitemap ecrit cet index au build.
// Moteur allume, depuis la 3.3.0, toutes les pages indexables se rendent a la
// demande (les pages fixes aussi, voir pages-gerees.mjs) : l'integration, qui
// n'inventorie que les pages figees, ne trouve plus rien et n'ecrit plus
// l'index, alors que robots.txt et le head de chaque page le citent. Cette
// route le sert donc, avec le seul plan qui existe alors, celui des pages
// gerees (plan-du-site.ts).
//
// Si une page figee indexable revient un jour, l'integration ecrit de nouveau
// dist/client/sitemap-index.xml, qui declare aussi le plan des pages gerees
// (customSitemaps, astro.config.mjs) : Cloudflare sert ce fichier avant le
// Worker, et cette route n'est plus jamais atteinte.
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const plan = new URL("/sitemap-contenu.xml", site ?? url).href;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${plan}</loc></sitemap></sitemapindex>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
