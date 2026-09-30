// src/moteur/plan-du-site.index.ts - l'index des plans de site, rendu a la demande : /sitemap-index.xml, moteur allume.
//
// Moteur eteint, l'integration sitemap ecrit cet index au build. Moteur
// allume, toutes les pages indexables se rendent a la demande,
// l'integration n'est pas posee (astro.config.mjs), et robots.txt pointe
// toujours ici : l'index declare le seul plan qui existe alors, celui des
// pages gerees (plan-du-site.ts).
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const plan = new URL("/sitemap-contenu.xml", site ?? url).href;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${plan}</loc></sitemap></sitemapindex>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
