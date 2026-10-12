// src/moteur/rail.selfcheck.ts - self-check du rail du back office range par importance (generique) : chaque ecran a son rang, les rangs suivent l'ordre de la maison, un rail d'EmDash rejoue sort dans cet ordre.
// Lancer : node src/moteur/rail.selfcheck.ts
//
// La feuille back-office-rail.css est lue telle qu'elle part dans le back
// office, et ses regles sont rejouees comme le navigateur le ferait : pour un
// lien, la derniere regle qui le designe donne son rang (meme poids, toutes en
// `!important`), a defaut le rang des entrees inconnues. Les pages des
// extensions de la maison sont relues dans leur identite.mjs, dans le depot du
// socle comme dans un site : une page sans rang fait echouer ce controle.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

let checks = 0;
const ok = (v: unknown, m: string) => {
  assert.ok(v, m);
  checks += 1;
};
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

const A = "/_emdash/admin";
const feuille = readFileSync(new URL("./back-office-rail.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// --- Les regles de la feuille --------------------------------------------------
type Regle = { adresse: string; prefixe: boolean; rang: number };
const regles: Regle[] = [];
const RANG = /\[data-sidebar="content"\] \[data-sidebar="menu-item"\]:has\(([^{]*)\)\s*\{\s*order:\s*(\d+)\s*!important;\s*\}/g;
for (const m of feuille.matchAll(RANG)) {
  for (const a of m[1].matchAll(/> a\[href(\^?)="([^"]+)"\]/g)) regles.push({ adresse: a[2], prefixe: a[1] === "^", rang: Number(m[2]) });
}
const parDefaut = Number(/\[data-sidebar="content"\] \[data-sidebar="menu-item"\]\s*\{\s*order:\s*(\d+)\s*!important;/.exec(feuille)?.[1]);
ok(Number.isFinite(parDefaut), "la feuille donne un rang aux entrees inconnues");
ok(regles.length > 30, `la feuille range les ecrans un par un (${regles.length} adresses lues)`);

/** Le rang d'un lien du rail, comme le navigateur le calcule. */
function rang(href: string): number {
  let r = parDefaut;
  for (const g of regles) if (g.prefixe ? href.startsWith(g.adresse) : href === g.adresse) r = g.rang;
  return r;
}

// --- La structure : une seule colonne, intitules caches -------------------------
ok(/\[data-sidebar="content"\] \[data-sidebar="group"\],\s*\[data-sidebar="content"\] \[data-sidebar="menu"\]\s*\{\s*display:\s*contents !important;/.test(feuille), "groupes et listes passent en display: contents");
ok(/\[data-sidebar="content"\] \[data-sidebar="group-label"\]\s*\{\s*display:\s*none !important;/.test(feuille), "les intitules des groupes sont caches");

// --- L'ordre de la maison (REGLES-DE-LA-MAISON, section 6) ----------------------
// Ecrit ici a part de la feuille : la feuille doit le suivre, pas l'inverse.
const P = `${A}/plugins`;
const ORDRE: [string, string][] = [
  ["Tableau de bord", `${A}/`],
  ["Messages", `${P}/aloha-gestion/messages`],
  ["Commandes", `${P}/aloha-commerce/commandes`],
  ["Clients", `${P}/aloha-commerce/clients`],
  ["Livraison", `${P}/aloha-commerce/livraison`],
  ["Produits", `${A}/content/products`],
  ["Stock", `${P}/aloha-stock`],
  ["Codes promo", `${P}/aloha-commerce/codes`],
  ["Cartes cadeaux", `${P}/aloha-commerce/cartes`],
  ["Fidelite", `${P}/aloha-fidelite`],
  ["Ventes (tableau de bord de la boutique)", `${P}/aloha-commerce`],
  ["Statistiques de la boutique", `${P}/aloha-commerce/statistiques`],
  ["Articles de blog", `${A}/content/posts`],
  ["Categories du blog", `${A}/taxonomies/category`],
  ["Une collection propre au site", `${A}/content/projets`],
  ["Pages", `${A}/content/pages`],
  ["Textes des pages", `${A}/content/sections`],
  ["Medias", `${A}/media`],
  ["Medias (extension)", `${P}/aloha-medias`],
  ["Design", `${P}/aloha-design`],
  ["Menus", `${A}/menus`],
  ["SEO", `${P}/aloha-seo`],
  ["Redirections", `${A}/redirects`],
  ["Courriels", `${P}/aloha-courriels`],
  ["Abonnes de la lettre", `${P}/aloha-gestion/abonnes`],
  ["Journal des courriels", `${P}/aloha-gestion/journal`],
  ["Reglages de boutique", `${P}/aloha-commerce/reglages`],
  ["Stripe", `${P}/aloha-commerce/stripe`],
  ["Colissimo", `${P}/aloha-colissimo`],
  ["Brevo", `${P}/aloha-brevo`],
  ["Parametres", `${A}/settings`],
  ["Utilisateurs", `${A}/users`],
  ["Maintenance", `${P}/aloha-maintenance`],
  ["Mettre le site a jour", `${P}/aloha-deployer`],
];
for (const [nom, href] of ORDRE) ok(rang(href) !== parDefaut, `${nom} (${href}) a son rang dans la feuille`);
for (let i = 1; i < ORDRE.length; i++) {
  const [a, ha] = ORDRE[i - 1];
  const [b, hb] = ORDRE[i];
  ok(rang(ha) < rang(hb), `${a} (${rang(ha)}) passe avant ${b} (${rang(hb)})`);
}
// L'administration reste sous toute entree inconnue, le reste au-dessus.
ok(rang(`${A}/content/site`) > parDefaut && rang(`${A}/settings`) > parDefaut, "Reglages par langue et Parametres restent sous une entree inconnue");
ok(rang(`${P}/aloha-commerce/livraison`) < parDefaut, "la livraison passe avant une entree inconnue");
is(rang(`${A}/content/une-collection-nouvelle`), 65, "une collection que la liste ne connait pas se range avec les contenus, avant les pages");
for (const c of ["rubriques", "sujets"]) is(rang(`${A}/content/${c}`), rang(`${A}/taxonomies/category`), `la collection ${c} se range comme les categories du blog`);
is(rang(`${P}/une-extension-nouvelle`), parDefaut, "une page d'extension inconnue prend le rang d'attente");
is(rang(`${A}/`), rang(A), "le tableau de bord, avec ou sans barre finale");
is(rang(`${P}/aloha-stock/`), rang(`${P}/aloha-stock`), "la racine d'une extension, avec ou sans barre finale");
// Le blog, sous chacun des six noms que house.mjs reconnait ; aloha-medias, racine comme sous-page.
for (const c of ["posts", "blog", "articles", "billets", "carnet", "journal"]) is(rang(`${A}/content/${c}`), rang(`${A}/content/posts`), `la collection ${c} se range comme le blog`);
is(rang(`${P}/aloha-medias/`), rang(`${P}/aloha-medias`), "aloha-medias, avec ou sans barre finale");
is(rang(`${P}/aloha-commerce/colissimo`), rang(`${P}/aloha-colissimo`), "l'ecran Colissimo de la boutique prend le rang de celui de l'extension (jamais les deux au rail)");
is(rang(`${P}/aloha-medias/dossiers`), rang(`${P}/aloha-medias`), "une sous-page d'aloha-medias reste pres de Medias");
ok(rang(`${P}/aloha-gestion/messages`) === Math.min(...ORDRE.slice(1).map(([, h]) => rang(h))), "Messages vient juste apres le tableau de bord, boutique comprise");
is(rang(`${A}/taxonomies/category?locale=fr`), rang(`${A}/taxonomies/category`), "les categories, langue dans l'adresse comprise");
ok(rang(`${A}/plugins/marketplace`) > rang(`${A}/users`), "le catalogue d'extensions reste dans l'administration");

// --- Chaque page des extensions de la maison a son rang -------------------------
// Dans le depot du socle (extensions/<nom>/src/moteur/...) ou dans un site
// (src/moteur/...) : on lit ce qui est la.
async function identite(chemins: string[]): Promise<Record<string, unknown> | null> {
  for (const c of chemins) {
    const u = new URL(c, import.meta.url);
    if (existsSync(u)) return (await import(u.href)) as Record<string, unknown>;
  }
  return null;
}
type Page = { path: string; label: string };
const pagesDe = async (chemins: string[], lire: (m: Record<string, unknown>) => Page[]) => {
  const m = await identite(chemins);
  return m ? { id: (m.IDENTITE as { id: string }).id, pages: lire(m) } : null;
};
const extensions = [
  await pagesDe(["../../../commerce/src/moteur/extensions/commerce/identite.mjs", "./extensions/commerce/identite.mjs"], (m) => m.PAGES as Page[]),
  await pagesDe(["../../../courriels/src/moteur/extensions/courriels/identite.mjs", "./extensions/courriels/identite.mjs"], (m) => [...(m.PAGES as Page[]), m.PAGE_LETTRE as Page]),
  await pagesDe(["../../../gestion/src/moteur/extensions/gestion/identite.mjs", "./extensions/gestion/identite.mjs"], (m) => [m.PAGE_MESSAGES, m.PAGE_ABONNES, m.PAGE_JOURNAL] as Page[]),
  await pagesDe(["../../../stock/src/moteur/stock/identite.mjs", "./stock/identite.mjs"], (m) => m.PAGES as Page[]),
  await pagesDe(["../../../deployer/src/moteur/deployer/identite.mjs", "./deployer/identite.mjs"], () => [{ path: "/", label: "Mettre le site a jour" }]),
  await pagesDe(["../../../fidelite/src/moteur/fidelite/identite.mjs", "./fidelite/identite.mjs"], (m) => m.PAGES as Page[]),
  await pagesDe(["../../../colissimo/src/moteur/colissimo/identite.mjs", "./colissimo/identite.mjs"], (m) => m.PAGES as Page[]),
  await pagesDe(["../../../seo/src/moteur/seo/identite.mjs", "./seo/identite.mjs"], (m) => [m.PAGE_SEO] as Page[]),
  await pagesDe(["../../../maintenance/src/moteur/maintenance/identite.mjs", "./maintenance/identite.mjs"], () => [{ path: "/", label: "Maintenance" }]),
  await pagesDe(["../../../medias/src/moteur/medias/identite.mjs", "./medias/identite.mjs"], (m) => (m.PAGES as Page[] | undefined) ?? []),
  await pagesDe(["../../../brevo/src/moteur/brevo/identite.mjs", "./brevo/identite.mjs"], (m) => m.PAGES as Page[]),
  await pagesDe(["../../../design/src/moteur/design/identite.mjs", "./design/identite.mjs"], (m) => [m.PAGE_DESIGN] as Page[]),
].filter((e) => e !== null);
let pagesVues = 0;
for (const e of extensions) {
  for (const p of e.pages) {
    // L'adresse telle que Sidebar.tsx d'EmDash 0.38 l'ecrit dans le lien :
    // `/plugins/${pluginId}${page.path}`, donc une barre finale pour la racine.
    const href = `${P}/${e.id}${p.path}`;
    ok(rang(href) !== parDefaut, `${e.id}${p.path} (${p.label}) n'a pas de rang dans back-office-rail.css : lui en donner un`);
    is(rang(href), rang(href.replace(/\/$/, "")), `${e.id}${p.path} : meme rang avec ou sans barre finale`);
    pagesVues += 1;
  }
}

// --- Un rail d'EmDash rejoue ----------------------------------------------------
// L'ordre dans lequel Sidebar.tsx d'EmDash 0.38 sort les liens d'une boutique
// (tableau de bord, collections dans l'ordre de la graine, medias, Gerer,
// Administration, pages d'extensions dans l'ordre de moteur.config.mjs), puis
// celui que le navigateur affiche une fois les rangs appliques (tri stable).
const rejoue = (liens: string[]) =>
  liens
    .map((h, i) => ({ h, i, r: rang(h) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.h.replace(A, "") || "/");
const BOUTIQUE = [
  `${A}/`,
  ...["products", "sections", "rayons", "pages", "site", "posts"].map((c) => `${A}/content/${c}`),
  `${A}/media`,
  `${A}/menus`,
  `${A}/redirects`,
  `${A}/content-types`,
  `${A}/users`,
  `${A}/plugins-manager`,
  `${A}/settings`,
  `${P}/aloha-deployer`,
  ...["", "/statistiques", "/commandes", "/clients", "/codes", "/cartes", "/reglages", "/livraison", "/stripe", "/journal"].map((p) => `${P}/aloha-commerce${p}`),
  `${P}/aloha-brevo/`,
  `${P}/aloha-stock`,
  `${P}/aloha-stock/factures`,
  ...["", "/lettre", "/brancher", "/reglages"].map((p) => `${P}/aloha-courriels${p}`),
  ...["/messages", "/abonnes", "/journal"].map((p) => `${P}/aloha-gestion${p}`),
  `${P}/aloha-fidelite`,
  `${P}/aloha-colissimo`,
  `${P}/aloha-maintenance`,
  `${P}/aloha-design/`,
];
is(
  rejoue(BOUTIQUE),
  [
    "/",
    "/plugins/aloha-gestion/messages",
    "/plugins/aloha-commerce/commandes",
    "/plugins/aloha-commerce/clients",
    "/plugins/aloha-commerce/livraison",
    "/content/products",
    "/content/rayons",
    "/plugins/aloha-stock",
    "/plugins/aloha-stock/factures",
    "/plugins/aloha-commerce/codes",
    "/plugins/aloha-commerce/cartes",
    "/plugins/aloha-fidelite",
    "/plugins/aloha-commerce",
    "/plugins/aloha-commerce/statistiques",
    "/content/posts",
    "/content/pages",
    "/content/sections",
    "/media",
    "/plugins/aloha-design/",
    "/menus",
    "/redirects",
    "/plugins/aloha-courriels",
    "/plugins/aloha-courriels/lettre",
    "/plugins/aloha-gestion/abonnes",
    "/plugins/aloha-gestion/journal",
    "/plugins/aloha-commerce/reglages",
    "/plugins/aloha-commerce/stripe",
    "/plugins/aloha-colissimo",
    "/plugins/aloha-brevo/",
    "/plugins/aloha-courriels/brancher",
    "/plugins/aloha-courriels/reglages",
    "/content/site",
    "/settings",
    "/users",
    "/plugins/aloha-maintenance",
    "/plugins/aloha-commerce/journal",
    "/content-types",
    "/plugins-manager",
    "/plugins/aloha-deployer",
  ],
  "le rail d'une boutique sort dans l'ordre de la maison",
);
// Un site vitrine : pas de boutique, ses collections a lui.
const VITRINE = [
  `${A}/`,
  ...["blog", "integrations", "sections", "pages", "site", "offres", "rubriques", "auteurs"].map((c) => `${A}/content/${c}`),
  `${A}/media`,
  `${A}/menus`,
  `${A}/redirects`,
  `${A}/users`,
  `${A}/settings`,
  `${P}/aloha-deployer`,
  `${P}/aloha-seo`,
  `${P}/aloha-courriels`,
  `${P}/aloha-gestion/messages`,
  `${P}/aloha-gestion/journal`,
];
is(
  rejoue(VITRINE),
  [
    "/",
    "/plugins/aloha-gestion/messages",
    "/content/blog",
    "/content/rubriques",
    "/content/auteurs",
    "/content/integrations",
    "/content/offres",
    "/content/pages",
    "/content/sections",
    "/media",
    "/menus",
    "/plugins/aloha-seo",
    "/redirects",
    "/plugins/aloha-courriels",
    "/plugins/aloha-gestion/journal",
    "/content/site",
    "/settings",
    "/users",
    "/plugins/aloha-deployer",
  ],
  "le rail d'un site vitrine saute les ecrans absents et garde l'ordre",
);

// --- Les rubriques (back-office-rubriques.css, socle 2.0.0) ---------------------
const rubriques = readFileSync(new URL("./back-office-rubriques.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const intitules = [...rubriques.matchAll(/:nth-of-type\((\d)\)::(before|after) \{\s*order: (\d+);\s*content: "([^"]+)";/g)].map((m) => ({ nom: m[4], rang: Number(m[3]) }));
is(intitules.map((r) => r.nom), ["Boutique", "Contenu", "Apparence", "Courriels", "Réglages"], "cinq rubriques, dans l'ordre du rail");
const entre = (nom: string, avant: string, apres: string) => {
  const r = intitules.find((x) => x.nom === nom)!.rang;
  ok(rang(avant) < r && r < rang(apres), `la rubrique ${nom} (${r}) se pose entre ${avant} et ${apres}`);
};
entre("Boutique", `${P}/aloha-gestion/messages`, `${P}/aloha-commerce/commandes`);
entre("Contenu", `${P}/aloha-commerce/statistiques`, `${A}/content/posts`);
entre("Apparence", `${P}/aloha-medias`, `${P}/aloha-design`);
entre("Courriels", `${A}/redirects`, `${P}/aloha-courriels`);
entre("Réglages", `${P}/aloha-gestion/journal`, `${P}/aloha-commerce/reglages`);
for (const technique of ["/content-types", "/plugins-manager"]) ok(new RegExp(`a\\[href="${A}${technique}"\\][^{]*\\{\\s*display: none !important;`).test(rubriques), `${technique} quitte le rail`);
ok(/taxonomies\/tag"\]\) ~ \[data-sidebar="menu-item"\]/.test(rubriques), "une taxonomie servie deux fois ne sort qu'une fois");

console.log(`rail.selfcheck : ${checks} verifications passees (${regles.length} adresses rangees, ${pagesVues} pages d'extension relues)`);
