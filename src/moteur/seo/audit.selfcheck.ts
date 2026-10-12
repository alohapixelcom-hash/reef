// src/moteur/seo/audit.selfcheck.ts - self-check de l'audit SEO : lecture d'une page, controles, note, doublons, apercu Google, donnees structurees, inventaire et audit d'une page sur un faux site.
// Lancer : node --experimental-strip-types src/moteur/seo/audit.selfcheck.ts
import assert from "node:assert/strict";
import { apercuGoogle, controler, corrections, decoder, doublons, lirePage, noter, plier } from "./audit.ts";
import { auditer, inventaire, lireLes404, sorteDe } from "./audit.serveur.ts";
import type { Base } from "./base.ts";
import { controlerLesDonnees, noeuds } from "./donnees.ts";

let n = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  n += 1;
};
const O = "https://cafe.test";
const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const produit = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Moka",
  image: "/p.jpg",
  offers: { "@type": "Offer", price: "12.50", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
};
const fil = { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Accueil", item: O }, { "@type": "ListItem", position: 2, name: "Moka" }] };
const texte = Array.from({ length: 320 }, (_, i) => `mot${i}`).join(" ");
const bonne = `<!doctype html><html lang="fr"><head><title>Café moka d'Éthiopie, torréfié à Pau | La Brûlerie</title>
<meta name="description" content="Notre moka d'Éthiopie, torréfié chaque semaine à Pau : notes florales, mouture au choix, livraison en 48 h.">
<link rel="canonical" href="${O}/produit/moka/"><meta property="og:image" content="${O}/og.jpg">
<link rel="alternate" hreflang="fr" href="${O}/produit/moka/"><link rel="alternate" hreflang="x-default" href="${O}/produit/moka/">
${ld(produit)}${ld({ "@context": "https://schema.org", "@graph": [fil] })}</head>
<body><nav><a href="/">Accueil</a></nav><main><h1>Café moka d'Éthiopie</h1><p>Le café moka &amp; ses notes. ${texte}</p>
<h2>Origine</h2><img src="/a.jpg" alt="Sac de moka"><img src="/deco.svg" alt=""><img src="/vague.svg" aria-hidden="true"><img src="/ecume.webp"  alt sizes="100vw"><a href="/boutique/">Boutique</a> <a href="/rayon/cafes/">Cafés</a> <a href="https://ailleurs.test/">Ailleurs</a></main>
<footer><a href="/mentions/">Mentions</a></footer><script>var x = "<h1>pas un titre</h1>";</script></body></html>`;

// 1. Lecture.
const l = lirePage(bonne, O);
is([l.langue, l.title, l.canonique, l.titres.map((h) => h.niveau), l.images.length, l.liensInternes, l.liensExternes], ["fr", "Café moka d'Éthiopie, torréfié à Pau | La Brûlerie", `${O}/produit/moka/`, [1, 2], 4, 2, 1], "title, canonique, titres hors script, images, liens du contenu principal");
is(l.mots > 300 && l.premierParagraphe.startsWith("Le café moka & ses notes"), true, "mots comptes et entites decodees");
is([l.hreflang.length, noeuds(l.donnees).map((x) => x["@type"])], [2, ["Product", "Offer", "BreadcrumbList", "ListItem", "ListItem"]], "hreflang et noeuds JSON-LD, @graph compris");
is(l.images.find((i) => i.src === "/ecume.webp")?.alt, "", "un alt nu (ecrit par Astro pour alt=\"\") vaut alt vide");
is(lirePage('<body><img class="a alt b" src="x.jpg"></body>', O).images[0]?.alt, null, "le mot alt dans une classe n'est pas un attribut");
is(decoder("&#233;t&eacute;"), "ét&eacute;", "entites numeriques");
is(plier("  Café  Éthiopie "), "cafe ethiopie", "pliage sans accents ni casse");

// 2. Controles d'une bonne page : rien de bloquant ni d'important.
const ctx = { adresse: `${O}/produit/moka/`, statut: 200, robotsEntete: null, dansLePlan: true, sorte: "produit" as const, motCle: "café moka" };
const k = controler(l, ctx);
is(corrections(k).filter((x) => x.gravite !== "conseil").map((x) => x.id), [], "bonne page : aucun defaut bloquant ni important");
is([k.find((x) => x.id === "alt")?.ok, k.find((x) => x.id === "alt-decoratif")?.gravite], [true, "conseil"], "image aria-hidden sans alt : conseil, pas un defaut important");
is(k.find((x) => x.id === "mot-cle")?.ok, true, "mot cle dans le titre et le H1, sans accents ni casse");
is(noter(k) >= 90, true, "bonne page : note haute");

const apercu = controler(l, { ...ctx, adresse: "https://cafe.pages.dev/produit/moka/" });
is([apercu.find((x) => x.id === "canonique")?.ok, apercu.find((x) => x.id === "hreflang")?.ok], [true, true], "un apercu pages.dev porte la canonique du domaine final : juste");

// 3. Une page fautive.
const mauvaise = lirePage(`<html><head><title>Accueil</title><meta name="robots" content="noindex"><link rel="canonical" href="/autre/"></head><body><h1>A</h1><h1>B</h1><h4>C</h4><img src="x.jpg"><p>court</p></body></html>`, O);
const km = controler(mauvaise, { ...ctx, dansLePlan: false });
const echecs = corrections(km).map((x) => x.id);
for (const id of ["indexable", "canonique", "title-longueur", "description", "h1", "hierarchie", "alt", "contenu", "jsonld-produit", "mot-cle"]) is(echecs.includes(id), true, `defaut ${id} releve`);
is(echecs.includes("plan"), false, "une page noindex hors du plan n'est pas un defaut de plus");
is(corrections(km)[0]?.gravite, "bloquant", "le bloquant passe devant");
is(noter(km) <= 40, true, "un bloquant plafonne la note a 40");
is(noter([]), 0, "aucun controle : 0");
is(controler(lirePage("", O), { ...ctx, statut: 503 }).find((x) => x.id === "statut")?.ok, false, "site en maintenance : statut releve");

// 4. Donnees structurees.
const sansDispo = controlerLesDonnees([{ ...produit, offers: { price: "12", priceCurrency: "EUR" } }], 0, "produit");
is(sansDispo.find((x) => x.id === "jsonld-produit-champs")?.constat, "Manque : offers.availability.", "produit sans disponibilite");
is(controlerLesDonnees([], 1, "page").find((x) => x.id === "jsonld-lisible")?.ok, false, "bloc illisible signale");
is(controlerLesDonnees([{ "@type": "BlogPosting", headline: "T", image: "i", datePublished: "2026-01-01", author: { name: "J" } }], 0, "article").filter((x) => !x.ok).map((x) => x.id), ["jsonld-fil"], "article complet, fil manquant en conseil");
is(controlerLesDonnees([{ "@type": ["CafeOrCoffeeShop"], name: "La Brûlerie", url: O }], 0, "accueil").find((x) => x.id === "jsonld-organisation-champs")?.constat, "Manque : address, telephone.", "commerce local sans adresse ni telephone");
is(controlerLesDonnees([{ "@type": "OnlineStore", name: "Atelier", url: O, logo: "/l.png" }], 0, "accueil").every((x) => x.ok), true, "une boutique en ligne (OnlineStore) est une organisation");
is(controlerLesDonnees([{ "@type": "FAQPage", mainEntity: [{ name: "Q", acceptedAnswer: {} }] }], 0, "page").find((x) => x.id === "jsonld-faq")?.ok, false, "FAQ sans reponse");

// 5. Doublons et apercu.
const d = doublons([
  { adresse: "/a/", title: "Café Pau", description: "x" },
  { adresse: "/b/", title: "café pau ", description: "y" },
  { adresse: "/c/", title: "Autre", description: null },
]);
is([d.titles.length, d.titles[0]?.adresses, d.descriptions.length], [1, ["/a/", "/b/"], 0], "titres en double, sans casse ni espaces");
const g = apercuGoogle("x".repeat(80), null, `${O}/produit/moka/`);
is([g.titre.length <= 62, g.fil, g.description.startsWith("(sans description")], [true, "cafe.test > produit > moka", true], "apercu coupe et fil d'Ariane");

// 6. Sortes de page.
is([sorteDe(null, "/"), sorteDe(null, "/en/"), sorteDe("products", "/p/"), sorteDe("posts", "/x/"), sorteDe(null, "/nos-produits/cafes/"), sorteDe("pages", "/contact/"), sorteDe(null, "/shop/board-leash/"), sorteDe(null, "/en/product/baliste/"), sorteDe(null, "/shop/")], ["accueil", "accueil", "produit", "article", "rayon", "page", "produit", "produit", "page"], "sorte d'apres collection ou adresse");

// 7. Inventaire et audit sur un faux site.
const demandes: string[] = [];
globalThis.fetch = (async (entree: string | URL | Request) => {
  const u = new URL(String(entree instanceof Request ? entree.url : entree));
  demandes.push(u.pathname);
  if (u.pathname === "/sitemap-moteur.xml") return new Response(`<urlset><url><loc>${O}/</loc></url><url><loc>${O}/produit/moka/</loc></url></urlset>`, { headers: { "Content-Type": "application/xml" } });
  if (u.pathname === "/produit/moka/") return new Response(bonne, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  if (u.pathname === "/ancien/") return new Response(null, { status: 301, headers: { Location: "/produit/moka/" } });
  return new Response("<html><head><title>x</title></head><body></body></html>", { headers: { "Content-Type": "text/html" } });
}) as typeof fetch;
const base: Base = {
  lire: async <T>(sql: string) => {
    if (sql.includes('"ec_products"')) return [{ id: "1", slug: "moka", locale: "fr", translation_group: null, updated_at: "2026-10-01", seo_no_index: 0 }, { id: "2", slug: "cache", locale: "fr", seo_no_index: 1 }] as T[];
    if (sql.includes("_emdash_404_log")) throw new Error("no such table");
    throw new Error("no such table");
  },
  executer: async () => 0,
};
const inv = await inventaire(base, O, { collections: { products: { adresse: (e) => `/produit/${e.slug}/` } } });
is(inv.planLisible, true, "plan lu a l'adresse publique");
is(inv.pages.map((p) => [p.chemin, p.sorte, p.dansLePlan, p.noindexEnBase]), [["/", "accueil", true, false], ["/produit/cache/", "produit", false, true], ["/produit/moka/", "produit", true, false]], "plan et base reunis, hors plan et noindex signales");
const audites = await auditer(O, [...inv.pages, { chemin: "/ancien/", collection: null, sorte: "page", dansLePlan: false, noindexEnBase: false }], { "/produit/moka/": "moka" });
is(audites.map((p) => [p.chemin, p.statut]), [["/", 200], ["/produit/cache/", 200], ["/produit/moka/", 200], ["/ancien/", 301]], "chaque page demandee a l'adresse publique, redirection non suivie");
is([audites[3]?.redirigeVers, audites[3]?.note <= 40, audites[2]?.h1], ["/produit/moka/", true, "Café moka d'Éthiopie"], "redirection relevee, note plafonnee ; H1 lu");
is(await lireLes404(base), null, "sans table des 404 : releve indisponible, pas d'erreur");

console.log(`audit.selfcheck : ${n} verifications, lecture, controles, note, doublons, apercu, donnees structurees, inventaire : tout passe.`);
