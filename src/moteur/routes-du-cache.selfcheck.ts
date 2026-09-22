// src/moteur/routes-du-cache.selfcheck.ts - self-check des motifs de cache : une page geree, un motif par langue, et jamais un motif qui avale tout.
// Lancer : node src/moteur/routes-du-cache.selfcheck.ts
import assert from "node:assert/strict";
import { PAGES_GEREES } from "./pages-gerees.mjs";
import { routesDeLaPage, routesDuCache } from "./routes-du-cache.mjs";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

const L = ["en", "fr"];
is(routesDeLaPage("src/pages/[...locale]/index.astro", L, "en"), ["/", "/fr"], "l'accueil : la racine et /fr");
is(routesDeLaPage("src/pages/[...locale]/blog/[id].astro", L, "en"), ["/blog/[id]", "/fr/blog/[id]"], "un billet, par langue");
is(routesDeLaPage("src/pages/[...locale]/blog/[...page].astro", L, "en"), ["/blog/[...page]", "/fr/blog/[...page]"], "l'archive garde son reste");
is(routesDeLaPage("src/pages/[...locale]/topics/index.astro", L, "en"), ["/topics", "/fr/topics"], "un index perd son nom");
is(routesDeLaPage("src/pages/[...locale]/rss.xml.ts", L, "en"), ["/rss.xml", "/fr/rss.xml"], "un flux garde son extension");
is(routesDeLaPage("src/pages/llms.txt.ts", L, "en"), ["/llms.txt"], "une page sans langue : un seul motif");

const regle = { maxAge: 60, swr: 600, tags: ["posts"] };
const routes = routesDuCache(PAGES_GEREES, L, "en", regle);
is(Object.keys(routes).length, PAGES_GEREES.length * 2 - 1, "chaque page geree a deux motifs, sauf llms.txt");
is(routes["/fr/authors/[author]"], regle, "la regle est posee sur chaque motif");
for (const motif of Object.keys(routes)) {
  is(motif.startsWith("/[") || motif.startsWith("/_"), false, `aucun motif ne commence par un parametre ou par une route interne : ${motif}`);
}
is("/[...locale]" in routes, false, "le motif qui avale tout n'existe pas");

console.log(`routes-du-cache.selfcheck : ${checks} verifications passees`);
