// src/moteur/accueil/tuiles.selfcheck.ts - self-check du tableau de bord en tuiles (generique) : quelles tuiles selon les ecrans du site, leurs mots, leurs nombres et leurs adresses.
// Lancer : node src/moteur/accueil/tuiles.selfcheck.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adressesDuPlan, COLLECTIONS_DU_BLOG, depuis, type Manifeste, plansDeLIndex, tuilesDuSite } from "./tuiles.ts";

let checks = 0;
const ok = (v: unknown, m: string) => {
  assert.ok(v, m);
  checks += 1;
};
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

// Des manifestes a la forme de /_emdash/api/manifest d'EmDash 0.38 (seuls les champs lus).
const col = (label: string, hidden = false) => ({ label, hidden });
const ext = (...pages: string[]) => ({ enabled: true, adminPages: pages.map((path) => ({ path })) });
const VITRINE: Manifeste = {
  collections: { posts: col("Articles de blog"), sections: col("Textes des pages"), pages: col("Pages"), site: col("Réglages par langue") },
  plugins: { "aloha-gestion": ext("/messages", "/journal"), "aloha-deployer": ext("/"), "aloha-champs": ext() },
};
const BOUTIQUE: Manifeste = {
  collections: { products: col("Produits"), sections: col("Textes des pages"), carnet: col("Articles de blog") },
  plugins: { "aloha-gestion": ext("/messages"), "aloha-commerce": ext("/", "/commandes", "/clients"), "aloha-deployer": ext("/"), "aloha-seo": ext("/") },
};
const NU: Manifeste = { collections: { pages: col("Pages") }, plugins: {} };
const ids = (t: { id: string }[]) => t.map((x) => x.id);

// --- Une tuile n'existe que si son ecran existe ---------------------------------
const v = tuilesDuSite(VITRINE);
is(ids(v.actions), ["messages"], "vitrine : Messages a traiter, pas de Commandes sans boutique");
is(ids(v.gestes), ["ecrire", "photos", "page", "site", "publier"], "vitrine : les cinq gestes du quotidien, dans l'ordre");
is(ids(v.etat), [], "rien de mesure : aucune tuile d'etat");
const b = tuilesDuSite(BOUTIQUE);
is(ids(b.actions), ["messages", "commandes"], "boutique : Messages puis Commandes");
is(ids(b.gestes), ["produit", "ecrire", "photos", "page", "site", "publier"], "boutique : Ajouter un produit en tete des gestes");
is(b.gestes[0]?.vers, "/content/products/new", "Ajouter un produit ouvre une fiche neuve");
const d = tuilesDuSite({ ...VITRINE, plugins: { ...VITRINE.plugins, "aloha-design": ext("/") } });
is(ids(d.gestes), ["ecrire", "photos", "page", "design", "site", "publier"], "avec la page Design : sa tuile, avant Voir le site");
is(d.gestes.find((t) => t.id === "design")?.vers, "/plugins/aloha-design/", "la tuile Design ouvre la page Design");
const n = tuilesDuSite(NU);
is([ids(n.actions), ids(n.gestes)], [[], ["photos", "page", "site"]], "site nu : ni Messages, ni blog, ni bouton de publication");
is(n.gestes.find((t) => t.id === "page")?.vers, "/content/pages", "sans textes des pages, Modifier une page ouvre les pages");
is(v.gestes.find((t) => t.id === "page")?.vers, "/content/sections", "avec les textes des pages, c'est eux qu'on modifie");
is(tuilesDuSite({ ...VITRINE, plugins: { ...VITRINE.plugins, "aloha-gestion": { ...ext("/messages"), enabled: false } } }).actions, [], "une extension desactivee n'a pas de tuile");
is(ids(tuilesDuSite({ ...NU, collections: { posts: col("Articles de blog", true) } }).gestes).includes("ecrire"), false, "une collection cachee n'a pas de tuile");
is(ids(tuilesDuSite({ ...NU, plugins: { "aloha-deployer": { enabled: true, adminPages: [{ path: "/" }] } } }).gestes).at(-1), "publier", "Mettre le site a jour vient en dernier");

// --- Le blog, sous chacun de ses noms -------------------------------------------
for (const c of COLLECTIONS_DU_BLOG) {
  const t = tuilesDuSite({ collections: { [c]: col("Articles de blog") }, plugins: {} }).gestes.find((x) => x.id === "ecrire");
  is(t?.vers, `/content/${c}/new`, `la collection ${c} ouvre un nouvel article`);
}
is(b.gestes.find((t) => t.id === "ecrire")?.titre, "Écrire un article", "le geste dit Ecrire un article, quel que soit le nom de la collection");

// --- Les nombres : lus, ou absents, jamais inventes -----------------------------
const lu = tuilesDuSite(BOUTIQUE, { nonLus: 1, aPreparer: 3 });
const [msg, cmd] = lu.actions;
is([msg.nombre, msg.attention, msg.detail], [1, true, "1 message à lire"], "un message non lu : le nombre, l'accent, le singulier");
ok(!`/_emdash/admin${msg.vers}`.endsWith("/plugins/aloha-gestion/messages"), "la tuile Messages echappe a la pastille du rail (selecteur a[href$=messages] de la gestion)");
is([cmd.nombre, cmd.attention, cmd.detail, cmd.vers], [3, true, "3 commandes à préparer", "/plugins/aloha-commerce/commandes?filtre=a_preparer"], "trois commandes : le pluriel et la liste filtree");
const zero = tuilesDuSite(BOUTIQUE, { nonLus: 0, aPreparer: 0 });
is(zero.actions.map((t) => [t.nombre, t.attention, t.detail]), [[0, false, "Aucun nouveau message"], [0, false, "Aucune commande à préparer"]], "zero : dit en toutes lettres, sans accent de couleur");
is(zero.actions[1].vers, "/plugins/aloha-commerce/commandes", "rien a preparer : toute la liste");
for (const illisible of [undefined, null, -1, Number.NaN]) {
  const t = tuilesDuSite(VITRINE, { nonLus: illisible }).actions[0];
  is(["nombre" in t, t.attention, t.detail], [false, false, "Les messages du formulaire de contact"], `un nombre illisible (${illisible}) laisse la tuile sans nombre`);
}

// --- L'etat du site --------------------------------------------------------------
const maintenant = Date.parse("2026-10-11T12:00:00Z");
const etat = tuilesDuSite(BOUTIQUE, { maintenant, publication: { titre: "Le café de saison", quand: "2026-10-11T09:00:00Z", collection: "carnet", id: "01ABC" }, plan: { adresses: 42 } }).etat;
is(ids(etat), ["publication", "plan"], "derniere publication puis plan du site");
is([etat[0].detail, etat[0].vers], ["Le café de saison, il y a 3 h", "/content/carnet/01ABC"], "la publication : son titre, quand, et son ecran");
is([etat[1].detail, etat[1].vers, etat[1].externe], ["42 adresses données aux moteurs de recherche", "/plugins/aloha-seo/", undefined], "avec l'extension SEO, le plan ouvre son ecran");
const sansSeo = tuilesDuSite(VITRINE, { plan: { adresses: 1 } }).etat[0];
is([sansSeo.detail, sansSeo.vers, sansSeo.externe], ["1 adresse donnée aux moteurs de recherche", "/sitemap-index.xml", true], "sans l'extension SEO, le plan lui-meme");
const absent = tuilesDuSite(VITRINE, { plan: "absent" }).etat[0];
ok(absent.attention && absent.detail.startsWith("Introuvable"), "un plan qui ne repond pas se signale");
is(tuilesDuSite(VITRINE, { plan: null, publication: null }).etat, [], "illisible : pas de tuile plutot qu'une tuile fausse");
is(tuilesDuSite(VITRINE, { maintenant, publication: { titre: "", quand: "x", collection: "posts", id: "1" } }).etat[0].detail, "Sans titre", "sans titre ni date lisible : dit sobrement");

// --- Les dates dites comme on les dirait ----------------------------------------
const il = (minutes: number) => depuis(new Date(maintenant - minutes * 60_000).toISOString(), maintenant);
is([il(0), il(5), il(90), il(60 * 30), il(60 * 24 * 3)], ["à l'instant", "il y a 5 min", "il y a 2 h", "hier", "il y a 3 jours"], "minutes, heures, hier, jours");
is(depuis("2026-10-01T10:00:00Z", maintenant), "le 1 octobre", "au-dela d'une semaine : la date");
is(depuis("2026-10-11 09:00:00", maintenant), "il y a 3 h", "une date SQLite sans fuseau se lit en UTC");

// --- Le plan du site --------------------------------------------------------------
is(adressesDuPlan('<?xml version="1.0"?><urlset xmlns="x"><url><loc>/a</loc></url><url><loc>/b</loc></url></urlset>'), 2, "un plan simple : ses adresses");
is(adressesDuPlan("<sitemapindex><sitemap><loc>/s.xml</loc></sitemap></sitemapindex>"), null, "un index ne se compte pas lui-meme");
is(plansDeLIndex("<sitemapindex><sitemap><loc>https://www.exemple.fr/sitemap-0.xml</loc></sitemap><sitemap><loc> /sitemap-moteur.xml </loc></sitemap></sitemapindex>"), ["/sitemap-0.xml", "/sitemap-moteur.xml"], "les plans de l'index, ramenes au chemin (le back office peut tourner sur une autre origine)");

// --- Ce que la maison interdit, et le rail -----------------------------------------
// Les tirets interdits, construits par leur point de code pour ne pas en ecrire un ici.
const TIRETS = [0x2012, 0x2013, 0x2014, 0x2015, 0x00ad].map((c) => String.fromCharCode(c));
const toutes = [...lu.actions, ...lu.gestes, ...etat, absent];
for (const t of toutes) {
  ok(t.vers.startsWith("/"), `${t.id} : une adresse du site ou du back office`);
  ok(![...TIRETS].some((x) => `${t.titre}${t.detail}`.includes(x)) && !/\p{Extended_Pictographic}/u.test(`${t.titre}${t.detail}`), `${t.id} : ni tiret long, ni emoji`);
}
const rail = readFileSync(new URL("../back-office-rail.css", import.meta.url), "utf8");
for (const c of COLLECTIONS_DU_BLOG) ok(rail.includes(`a[href="/_emdash/admin/content/${c}"]`), `le rail range la collection ${c} avec le blog`);

console.log(`tuiles.selfcheck : ${checks} verifications passees`);
