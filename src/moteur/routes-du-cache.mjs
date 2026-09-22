// src/moteur/routes-du-cache.mjs - traduit la liste des pages gerees en motifs de routeRules d'Astro, une langue a la fois.
//
// POURQUOI PAS LE MOTIF DE LA PAGE TEL QUEL : `/[...locale]/blog/[id]` porte un
// parametre de reste qui accepte n'importe quel prefixe, et `/[...locale]`
// (l'accueil) accepte TOUT. Une regle de cache posee sur ce motif se serait
// appliquee a l'API du moteur et a son administration : mesure le 21
// septembre 2026, la reponse d'un POST sur /_emdash/api/content/posts portait
// `Cloudflare-CDN-Cache-Control: public, max-age=60`. Chaque page geree
// devient donc un motif par langue, avec son prefixe ecrit en clair.
/**
 * "src/pages/[...locale]/blog/[id].astro" avec ["en", "fr"] et "en"
 * -> ["/blog/[id]", "/fr/blog/[id]"].
 * @param {string} page
 * @param {readonly string[]} locales
 * @param {string} defaut
 * @returns {string[]}
 */
export function routesDeLaPage(page, locales, defaut) {
  const reste = page
    .replace(/^src\/pages\//, "")
    .replace(/\.(astro|ts)$/, "")
    .replace(/\/?index$/, "");
  if (!reste.startsWith("[...locale]")) return [`/${reste}`];
  const suffixe = reste.slice("[...locale]".length);
  return locales.map((locale) => (locale === defaut ? suffixe || "/" : `/${locale}${suffixe}`));
}

/**
 * Les routeRules d'Astro pour toutes les pages gerees : la meme regle sur chaque motif.
 * @template R
 * @param {readonly string[]} pages
 * @param {readonly string[]} locales
 * @param {string} defaut
 * @param {R} regle
 * @returns {Record<string, R>}
 */
export function routesDuCache(pages, locales, defaut, regle) {
  const routes = {};
  for (const page of pages) for (const route of routesDeLaPage(page, locales, defaut)) routes[route] = regle;
  return routes;
}
