// src/moteur/seo/seo.selfcheck.ts - verifie le moteur SEO : union des trois sources, noindex et redirections retires, XML echappe, hreflang et x-default, anciens plans en 301, robots.txt et llms.txt, manifeste du build, sur une vraie base SQLite.
// Lancer : node src/moteur/seo/seo.selfcheck.ts (Node 22.18 ou plus)
import type { APIContext } from "astro";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { aiguillerLeSeo } from "./aiguillage.ts";
import { type Base, ecrireRobots, lireLesEntrees, lireLesRedirections, lireRobots } from "./base.ts";
import { avecLePlan, enregistrer, lireLeFichier, revenirAuDefaut, TexteRefuse, valider } from "./fichiers.ts";
import { ADRESSES_DU_SEO } from "./identite.mjs";
import { lireLaPage, lireLeBuild, sourcesDesRedirections } from "./integration.mjs";
import { assembler, devinerLesLangues, entreesDepuisXml, estUnAncienPlan, motifDeRedirection, redirections, versW3C, xmlDeLIndex, xmlDuPlan } from "./plan.ts";
import { calculerLePlan, type Manifeste, planVivant } from "./route.ts";

let n = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  n++;
};
const ok = (v: unknown, m: string) => {
  assert.ok(v, m);
  n++;
};

const O = "https://exemple.test";
const LANGUES = { parDefaut: "en", prefixes: { fr: "/fr" } };

/* --- 1. Le coeur : union, retraits, XML ------------------------------------ */
{
  const figees = [{ chemin: "/a/", lastmod: "2026-10-01T00:00:00.000Z" }, { chemin: "/b/" }];
  const site = [{ chemin: "/b/", lastmod: "2026-10-05T00:00:00.000Z" }, { chemin: "/c/" }];
  const base = [{ chemin: "/d/", images: ["/_emdash/api/media/file/x.webp"] }];
  const { entrees, retirees } = assembler([figees, site, base], {
    noindex: ["/c/"],
    redirections: redirections([
      { source: "/d/", syntaxe: "emdash" },
      { source: "/vieux/*", syntaxe: "cloudflare" },
    ]),
  });
  is(entrees.map((e) => e.chemin), ["/a/", "/b/"], "union des trois sources, sans doublon, moins noindex et redirections");
  is(entrees.find((e) => e.chemin === "/b/")?.lastmod, "2026-10-05T00:00:00.000Z", "deux vues d'une adresse : la date la plus recente");
  is(retirees, [{ chemin: "/c/", raison: "noindex" }, { chemin: "/d/", raison: "redirigee" }], "les retraits sont dits, avec leur raison");
  const datees = assembler([[{ chemin: "/a/" }]], {}, [{ chemin: "/a/", lastmod: "2026-01-01T00:00:00.000Z" }, { chemin: "/z/" }]);
  is(datees.entrees.map((e) => [e.chemin, e.lastmod]), [["/a/", "2026-01-01T00:00:00.000Z"]], "une source qui date n'ajoute aucune adresse");
}
{
  ok(motifDeRedirection("/blog/[...reste]", "emdash")!.test("/blog/2024/x/"), "motif EmDash [...reste]");
  ok(!motifDeRedirection("/p/[id]", "emdash")!.test("/p/a/b"), "motif EmDash [id] : un seul segment");
  ok(motifDeRedirection("/tag/:nom/", "cloudflare")!.test("/tag/seo/"), "motif _redirects :nom");
  is(motifDeRedirection("/exacte/", "cloudflare"), null, "une source exacte n'est pas un motif");
  ok(motifDeRedirection("/a.b/*", "cloudflare")!.test("/a.b/c") && !motifDeRedirection("/a.b/*", "cloudflare")!.test("/aXb/c"), "le point d'une source est litteral");
}
{
  const xml = xmlDuPlan([{ chemin: "/r&d/<x>/", images: ["/i?a=1&b=2"] }], O);
  ok(xml.includes("<loc>https://exemple.test/r&amp;d/%3Cx%3E/</loc>"), "l'adresse est echappee pour le XML");
  ok(xml.includes("<image:loc>https://exemple.test/i?a=1&amp;b=2</image:loc>") && xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), "image echappee, espace image declare");
  ok(!xmlDuPlan([{ chemin: "/" }], O).includes("xmlns:image"), "sans image, pas d'espace image");
  ok(xmlDuPlan([{ chemin: "/'\"/" }], O).includes("/%27%22/") || xmlDuPlan([{ chemin: "/'\"/" }], O).includes("&apos;"), "guillemets jamais bruts dans le XML");
}
{
  const devinees = devinerLesLangues(["/contact/", "/fr/contact/", "/seule/"], LANGUES);
  const xml = xmlDuPlan(devinees, O, LANGUES);
  ok(xml.includes('<url><loc>https://exemple.test/contact/</loc><xhtml:link rel="alternate" hreflang="en" href="https://exemple.test/contact/"/><xhtml:link rel="alternate" hreflang="fr" href="https://exemple.test/fr/contact/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://exemple.test/contact/"/></url>'), "hreflang des deux langues et x-default vers la langue par defaut");
  ok(/<url><loc>https:\/\/exemple\.test\/seule\/<\/loc><\/url>/.test(xml), "une page sans soeur n'a pas d'alternatives");
  const tete = xmlDuPlan([{ chemin: "/fr/x/", alternatives: [{ langue: "fr", href: "/fr/x/" }, { langue: "en", href: "/x/" }, { langue: "x-default", href: "/fr/x/" }] }], O, LANGUES);
  is((tete.match(/x-default/g) ?? []).length, 1, "le x-default du head est garde, jamais double");
  is(entreesDepuisXml(xml, O).find((e) => e.chemin === "/fr/contact/")?.alternatives?.length, 3, "un plan relu garde ses alternatives (route existante reprise)");
  ok(xmlDeLIndex(O).includes("<loc>https://exemple.test/sitemap-moteur.xml</loc>") && (xmlDeLIndex(O).match(/<sitemap>/g) ?? []).length === 1, "l'index ne cite que le plan vivant");
  is(versW3C("2026-10-11 08:30:00"), "2026-10-11T08:30:00.000Z", "date SQLite sans fuseau lue en UTC");
}

/* --- 2. Les anciens noms : 301 vers l'index -------------------------------- */
for (const ancien of ["/sitemap.xml", "/sitemap-0.xml", "/sitemap-12.xml", "/sitemap-contenu.xml", "/sitemap-blog.xml", "/sitemap-pages.xml"]) {
  ok(estUnAncienPlan(ancien), `${ancien} est un ancien plan`);
  const r = await aiguillerLeSeo(new Request(`${O}${ancien}`), { base: null });
  ok(r?.status === 301 && r.headers.get("location") === `${O}/sitemap-index.xml`, `${ancien} repond 301 vers /sitemap-index.xml`);
}
ok(!estUnAncienPlan("/sitemap-index.xml") && !estUnAncienPlan("/sitemap-moteur.xml"), "l'index et le plan vivant ne sont pas d'anciens noms");
{
  const index = await aiguillerLeSeo(new Request(`${O}/sitemap-index.xml`), { base: null });
  ok(index?.status === 200 && index.headers.get("content-type") === "application/xml; charset=utf-8" && index.headers.get("cache-control") === "public, max-age=300", "l'index part en XML, garde cinq minutes");
  is(await aiguillerLeSeo(new Request(`${O}/sitemap-moteur.xml`), { base: null }), null, "le plan vivant passe a Astro");
  const transmis = await aiguillerLeSeo(new Request(`${O}/sitemap-moteur.xml`), { base: null, moteur: { fetch: async () => new Response("plan", { headers: { "Server-Timing": "db.count;dur=16", "Cache-Control": "public, max-age=300" } }) } });
  is(transmis?.headers.get("server-timing") ?? null, null, "le plan relaye sort sans Server-Timing");
  is(transmis?.headers.get("cache-control"), "public, max-age=300", "le plan relaye garde ses autres en-tetes");
  is(await transmis?.text(), "plan", "sans Astro, le plan vivant est demande au Worker du moteur");
  is(await aiguillerLeSeo(new Request(`${O}/contact/`), { base: null }), null, "une page n'est pas l'affaire du SEO");
  is(await aiguillerLeSeo(new Request(`${O}/robots.txt`, { method: "POST" }), { base: null }), null, "seuls GET et HEAD");
  ok(ADRESSES_DU_SEO.test("/sitemap-0.xml") && ADRESSES_DU_SEO.test("/llms.txt") && !ADRESSES_DU_SEO.test("/blog/sitemap.xml"), "les adresses du SEO, pour run_worker_first et le frontal");
}

/* --- 3. Une vraie base SQLite, aux tables d'EmDash 0.38 --------------------- */
const db = new DatabaseSync(":memory:");
const base: Base = {
  lire: async <T>(sql: string, p: unknown[] = []) => db.prepare(sql).all(...(p as never[])) as T[],
  executer: async (sql: string, p: unknown[] = []) => Number(db.prepare(sql).run(...(p as never[])).changes),
};
db.exec(`CREATE TABLE options (name TEXT PRIMARY KEY, value TEXT NOT NULL, revision TEXT NOT NULL DEFAULT '0');
CREATE TABLE _emdash_seo (collection TEXT NOT NULL, content_id TEXT NOT NULL, seo_title TEXT, seo_description TEXT, seo_image TEXT, seo_canonical TEXT, seo_no_index INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (collection, content_id));
CREATE TABLE _emdash_redirects (id TEXT PRIMARY KEY, source TEXT NOT NULL, destination TEXT NOT NULL, type INTEGER NOT NULL DEFAULT 301, is_pattern INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE ec_pages (id TEXT PRIMARY KEY, slug TEXT, status TEXT, deleted_at TEXT, locale TEXT, translation_group TEXT, updated_at TEXT, published_at TEXT);`);
const page = db.prepare("INSERT INTO ec_pages VALUES (?, ?, ?, ?, ?, ?, ?, NULL)");
page.run("p1", "offre", "published", null, "en", "g1", "2026-10-02 10:00:00");
page.run("p2", "offre", "published", null, "fr", "g1", "2026-10-03 10:00:00");
page.run("p3", "brouillon", "draft", null, "en", "g3", "2026-10-04 10:00:00");
page.run("p4", "jetee", "published", "2026-10-05", "en", "g4", "2026-10-04 10:00:00");
page.run("p5", "cachee", "published", null, "en", "g5", "2026-10-04 10:00:00");
page.run("p6", "ancienne", "published", null, "en", "g6", "2026-10-04 10:00:00");
page.run("p7", "photo", "published", null, "en", "g7", "2026-10-06 10:00:00");
db.prepare("INSERT INTO _emdash_seo (collection, content_id, seo_no_index) VALUES ('pages', 'p5', 1)").run();
db.prepare("INSERT INTO _emdash_seo (collection, content_id, seo_image) VALUES ('pages', 'p7', '01KS9.webp')").run();
db.prepare("INSERT INTO _emdash_redirects (id, source, destination) VALUES ('r1', '/ancienne/', '/offre/')").run();
db.prepare("INSERT INTO _emdash_redirects (id, source, destination, is_pattern) VALUES ('r2', '/archives/[...reste]', '/', 1)").run();
db.prepare("INSERT INTO _emdash_redirects (id, source, destination, enabled) VALUES ('r3', '/eteinte/', '/', 0)").run();
{
  const { entrees, manquantes } = await lireLesEntrees(base, ["pages", "absente", "x;drop"]);
  is(entrees.map((e) => e.id).sort(), ["p1", "p2", "p5", "p6", "p7"], "seules les entrees publiees, hors corbeille");
  is(manquantes, ["absente", "x;drop"], "une collection absente ou un nom douteux est saute, jamais une erreur");
  is((await lireLesRedirections(base)).map((r) => r.source), ["/ancienne/", "/archives/[...reste]"], "seules les redirections actives");
}
{
  const manifeste: Manifeste = {
    construit: "2026-10-01T12:00:00.000Z",
    pages: [{ chemin: "/legal/", alternatives: [{ langue: "en", href: "/legal/" }, { langue: "fr", href: "/fr/mentions/" }] }, { chemin: "/fr/mentions/" }, { chemin: "/archives/2020/" }],
    aLaDemande: ["/", "/fr/"],
    redirections: ["/fr/mentions/", "/bouge/*"],
    ecartees: [{ chemin: "/recherche/", raison: "noindex" }],
  };
  const options = {
    langues: LANGUES,
    collections: { pages: (e: { slug: string; locale: string | null }) => `${e.locale === "fr" ? "/fr" : ""}/${e.slug}/` },
    horsDuPlan: /^\/brouillon\//,
  };
  const { entrees, retirees, resume } = await calculerLePlan({ base, manifeste, duSite: ["/contact/", "/fr/contact/", "/brouillon/"], options, origine: O });
  const chemins = entrees.map((e) => e.chemin);
  is(chemins, ["/", "/contact/", "/fr/", "/fr/contact/", "/fr/offre/", "/legal/", "/offre/", "/photo/"], "union : pages figees, accueils a la demande, adresses du site, entrees publiees");
  ok(!chemins.includes("/cachee/"), "une entree en noindex sort du plan");
  ok(!chemins.includes("/ancienne/") && !chemins.includes("/archives/2020/"), "les sources des redirections EmDash (exactes et a motif) sortent du plan");
  ok(!chemins.includes("/fr/mentions/"), "une source de _redirects sort du plan");
  ok(!chemins.includes("/brouillon/"), "horsDuPlan du site est respecte");
  is(entrees.find((e) => e.chemin === "/offre/")?.lastmod, "2026-10-02T10:00:00.000Z", "lastmod = updated_at de l'entree");
  is(entrees.find((e) => e.chemin === "/legal/")?.lastmod ?? null, null, "une page figee n'est pas datee du build (pas de lastmod invente)");
  is(entrees.find((e) => e.chemin === "/photo/")?.images, ["/_emdash/api/media/file/01KS9.webp"], "l'image du panneau SEO part en image:image");
  is(entrees.find((e) => e.chemin === "/legal/")?.alternatives?.map((a) => a.href), ["/legal/"], "une alternative vers une adresse retiree tombe");
  const xml = xmlDuPlan(entrees, O, LANGUES);
  ok(xml.includes('<loc>https://exemple.test/fr/offre/</loc><lastmod>2026-10-03T10:00:00.000Z</lastmod><xhtml:link rel="alternate" hreflang="en" href="https://exemple.test/offre/"/><xhtml:link rel="alternate" hreflang="fr" href="https://exemple.test/fr/offre/"/><xhtml:link rel="alternate" hreflang="x-default" href="https://exemple.test/offre/"/>'), "les traductions d'une entree sont ses alternatives, x-default vers la langue par defaut");
  is(retirees.map((r) => `${r.chemin} ${r.raison}`), ["/ancienne/ redirigee", "/archives/2020/ redirigee", "/brouillon/ hors du plan", "/cachee/ noindex", "/fr/mentions/ redirigee"], "le resume dit chaque adresse retiree");
  is([resume.adresses, resume.manifeste], [8, "2026-10-01T12:00:00.000Z"], "le resume compte les adresses du plan");
  const sansAjout = await calculerLePlan({ base, manifeste: null, duSite: ["/offre/"], options: { ...options, collections: { pages: { adresse: options.collections.pages, ajoute: false } } }, origine: O });
  is(sansAjout.entrees.map((e) => [e.chemin, e.lastmod]), [["/offre/", "2026-10-02T10:00:00.000Z"]], "ajoute: false date sans ajouter");
}

/* --- 4. robots.txt et llms.txt ------------------------------------------- */
{
  const refuse = (nom: "robots" | "llms", texte: unknown, m: string) => {
    assert.throws(() => valider(nom, texte, O), TexteRefuse, m);
    n++;
  };
  refuse("llms", "Sans titre", "llms.txt sans titre # en tete est refuse");
  refuse("llms", `# T\n${"x".repeat(64_001)}`, "llms.txt de plus de 64 000 caracteres est refuse");
  refuse("llms", "# T\nbip\u0007", "un caractere de controle est refuse");
  refuse("robots", "   ", "un texte vide est refuse");
  refuse("robots", `User-agent: *\n#${"x".repeat(4_990)}`, "robots.txt de plus de 5 000 caracteres, ligne Sitemap comprise, est refuse (plafond d'EmDash 0.38)");
  ok(valider("llms", `# T\n${"x".repeat(63_000)}`, O).length < 64_000, "llms.txt sous 64 000 caracteres passe");
  is(valider("llms", "# Titre  \r\n\r\nTexte\t\r\n", O), "# Titre\n\nTexte\n", "retours a la ligne et espaces de fin normalises");
  is(valider("robots", "User-agent: *\nAllow: /", O), "User-agent: *\nAllow: /\n\nSitemap: https://exemple.test/sitemap-index.xml\n", "la ligne Sitemap absolue est ajoutee si elle manque");
  is(avecLePlan("sitemap: https://a.test/x.xml\n", O), "sitemap: https://a.test/x.xml\n", "une ligne Sitemap existante est gardee");
}
{
  db.prepare("INSERT INTO options (name, value, revision) VALUES ('site:seo', ?, 'r0')").run(JSON.stringify({ titleSeparator: "|", googleVerification: "abc" }));
  const fichiers = { fetch: async (r: Request) => new Response(new URL(r.url).pathname === "/llms.txt" ? "# Defaut\n" : "User-agent: *\n") };
  let r = (await aiguillerLeSeo(new Request(`${O}/llms.txt`), { base, fichiers }))!;
  is([r.headers.get("x-aloha-seo"), await r.text()], ["defaut", "# Defaut\n"], "llms.txt sans texte en base : le fichier du build, x-aloha-seo: defaut");
  is(await enregistrer(base, "llms", valider("llms", "# Aloha\n", O), "admin@exemple.test", 1000), "ecrit", "llms.txt s'enregistre");
  r = (await aiguillerLeSeo(new Request(`${O}/llms.txt`), { base, fichiers }))!;
  is([r.headers.get("x-aloha-seo"), r.headers.get("content-type"), await r.text()], ["base", "text/plain; charset=utf-8", "# Aloha\n"], "llms.txt servi depuis la base, x-aloha-seo: base");
  is(await enregistrer(base, "robots", valider("robots", "User-agent: *\nDisallow: /prive/", O), "admin@exemple.test", 2000), "ecrit", "robots.txt s'enregistre");
  const reglage = JSON.parse(String((db.prepare("SELECT value FROM options WHERE name = 'site:seo'").get() as { value: string }).value));
  is([reglage.titleSeparator, reglage.googleVerification, reglage.robotsTxt.startsWith("User-agent")], ["|", "abc", true], "robots.txt va dans site:seo.robotsTxt sans toucher aux autres reglages d'EmDash");
  r = (await aiguillerLeSeo(new Request(`${O}/robots.txt`), { base, fichiers }))!;
  ok(r.headers.get("x-aloha-seo") === "base" && (await r.text()).includes("Sitemap: https://exemple.test/sitemap-index.xml"), "robots.txt servi depuis la base, avec son plan");
  const etat = await lireLeFichier(base, "robots");
  is([etat.maj, etat.par, etat.modifieAilleurs], [2000, "admin@exemple.test", false], "date et auteur de la derniere modification");
  db.prepare("UPDATE options SET value = ?, revision = 'r9' WHERE name = 'site:seo'").run(JSON.stringify({ ...reglage, robotsTxt: "User-agent: *\n" }));
  is((await lireLeFichier(base, "robots")).modifieAilleurs, true, "un texte change dans Parametres > SEO est vu");
  is(await revenirAuDefaut(base, "robots", "admin@exemple.test"), "ecrit", "robots.txt revient au texte par defaut");
  is(await lireRobots(base), null, "plus de texte saisi : le site sert son defaut");
  r = (await aiguillerLeSeo(new Request(`${O}/robots.txt`), { base, fichiers }))!;
  is([r.headers.get("x-aloha-seo"), await r.text()], ["defaut", "User-agent: *\n"], "robots.txt par defaut : le fichier du build");
  db.prepare("UPDATE options SET value = 'pas du json' WHERE name = 'site:seo'").run();
  is(await ecrireRobots(base, "x"), "illisible", "un reglage illisible n'est jamais ecrase");
  const sansFichier = { fetch: async () => new Response("absent", { status: 404 }) };
  const rendu = { fetch: async () => new Response("# Rendu par le site\n") };
  db.prepare("DELETE FROM aloha_seo WHERE nom = 'llms'").run();
  const parLeSite = (await aiguillerLeSeo(new Request(`${O}/llms.txt`), { base, fichiers: sansFichier, rendu }))!;
  is([parLeSite.headers.get("x-aloha-seo"), await parLeSite.text()], ["defaut", "# Rendu par le site\n"], "llms.txt que le build ne fige pas : la route du site, x-aloha-seo: defaut");
  const tete = (await aiguillerLeSeo(new Request(`${O}/llms.txt`, { method: "HEAD" }), { base, fichiers }))!;
  is([tete.status, await tete.text()], [200, ""], "HEAD : les en-tetes sans le corps");
  const panne: Base = { lire: async () => Promise.reject(new Error("D1 muette")), executer: async () => 0 };
  is((await aiguillerLeSeo(new Request(`${O}/llms.txt`), { base: panne, fichiers }))!.headers.get("x-aloha-seo"), "defaut", "base en panne : le texte par defaut, jamais une erreur");
}

/* --- 5. Le manifeste du build ------------------------------------------- */
{
  const tete = (corps: string) => `<!doctype html><html><head>${corps}</head><body><a href="/x/">x</a></body></html>`;
  is(lireLaPage(tete('<meta content="noindex, follow" name="robots">'), "/r/", O), { indexable: false, raison: "noindex" }, "noindex lu quel que soit l'ordre des attributs");
  is(lireLaPage(tete('<link rel="canonical" href="https://exemple.test/autre/">'), "/r/", O), { indexable: false, raison: "canonique ailleurs" }, "canonique ailleurs : ecartee");
  is(lireLaPage(tete('<meta http-equiv="refresh" content="0;url=/b/">'), "/r/", O), { indexable: false, raison: "redirection" }, "page de redirection : ecartee");
  is(sourcesDesRedirections("# c\n/a /b 301\n/c/* /d 302\n/e /f 200\n"), ["/a", "/c/*"], "_redirects : sources, sans les reecritures 200");
  const dossier = mkdtempSync(join(tmpdir(), "seo-build-"));
  try {
    const ecrire = (chemin: string, html: string) => {
      mkdirSync(join(dossier, chemin), { recursive: true });
      writeFileSync(join(dossier, chemin, "index.html"), html);
    };
    ecrire("", tete('<link rel="canonical" href="https://exemple.test/"><link rel="alternate" hreflang="en" href="https://exemple.test/"><link hreflang="fr" rel="alternate" href="https://exemple.test/fr/"><link rel="alternate" hreflang="x-default" href="https://exemple.test/">'));
    ecrire("fr", tete('<link rel="canonical" href="https://exemple.test/fr/">'));
    ecrire("recherche", tete('<meta name="robots" content="noindex">'));
    ecrire("404", tete(""));
    ecrire("_emdash/admin", tete(""));
    ecrire("cache", tete(""));
    writeFileSync(join(dossier, "_redirects"), "/vieux /fr/ 301\n");
    const m = lireLeBuild(dossier, { site: O, exclure: /^\/cache\/$/, aLaDemande: ["/contact", "/fr", "/404"], construit: "2026-10-11T00:00:00.000Z" });
    is(m.pages.map((p: { chemin: string }) => p.chemin), ["/", "/fr/"], "pages figees indexables, hors 404, hors adresses internes");
    is(m.pages[0]?.alternatives, [{ langue: "en", href: "/" }, { langue: "fr", href: "/fr/" }, { langue: "x-default", href: "/" }], "hreflang relus dans le head, x-default compris");
    is(m.ecartees, [{ chemin: "/cache/", raison: "exclue par le site" }, { chemin: "/recherche/", raison: "noindex" }], "les pages ecartees sont notees avec leur raison");
    is(m.aLaDemande, ["/contact/"], "pages sans parametre a la demande : barre finale, sans doublon d'une page figee ni 404");
    is(m.redirections, ["/vieux"], "les sources de _redirects du build");
    const parListe = lireLeBuild(dossier, { site: O, exclure: ["/cache", "/fr/"], construit: "x" });
    is(parListe.pages.map((p: { chemin: string }) => p.chemin), ["/"], "exclure accepte une liste de chemins (NOINDEX_PATHS), barre finale ou non");
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

/* --- 6. verifier-plan.mjs sur un faux site local -------------------------- */
// Le script est a la meme place relative dans le socle (extensions/seo/scripts/)
// et dans un site (scripts/) : trois dossiers au-dessus de celui-ci.
const script = new URL("../../../scripts/verifier-plan.mjs", import.meta.url);
if (existsSync(script)) {
  let enCours = 0;
  let auPlus = 0;
  const serveur = createServer((req, res) => {
    enCours++;
    auPlus = Math.max(auPlus, enCours);
    const fin = (statut: number, entetes: Record<string, string>, corps = "") =>
      setTimeout(() => {
        enCours--;
        res.writeHead(statut, entetes).end(corps);
      }, 15);
    const o = `http://127.0.0.1:${(serveur.address() as { port: number }).port}`;
    const page = (chemin: string, tete: string) => `<html><head><link rel="canonical" href="${o}${chemin}">${tete}</head></html>`;
    const pages: Record<string, () => void> = {
      "/sitemap-index.xml": () => fin(200, { "content-type": "application/xml" }, xmlDeLIndex(o)),
      "/sitemap-moteur.xml": () => fin(200, { "content-type": "application/xml" }, xmlDuPlan(["/a/", "/b/", "/c/", "/d/", "/e/", "/f/"].map((chemin) => ({ chemin })), o)),
      "/a/": () => fin(200, { "content-type": "text/html" }, page("/a/", "")),
      "/b/": () => fin(200, { "content-type": "text/html" }, page("/b/", "")),
      "/c/": () => fin(200, { "content-type": "text/html" }, page("/c/", "")),
      "/d/": () => fin(200, { "content-type": "text/html" }, page("/d/", '<meta name="robots" content="noindex">')),
      "/e/": () => fin(301, { location: "/a/" }),
      "/f/": () => fin(200, { "content-type": "text/html" }, page("/a/", "")),
    };
    (pages[req.url ?? ""] ?? (() => fin(404, {})))();
  });
  await new Promise<void>((r) => serveur.listen(0, "127.0.0.1", () => r()));
  const o = `http://127.0.0.1:${(serveur.address() as { port: number }).port}`;
  const lancer = (...args: string[]) =>
    new Promise<{ code: number | null; sortie: string }>((r) => {
      const p = spawn(process.execPath, [script.pathname, ...args], { stdio: ["ignore", "pipe", "pipe"] });
      let sortie = "";
      p.stdout.on("data", (d) => (sortie += d));
      p.stderr.on("data", (d) => (sortie += d));
      p.on("close", (code) => r({ code, sortie }));
    });
  const tout = await lancer(o, "--simultanees", "9");
  ok(tout.code === 1, `verifier-plan sort en code 1 quand une adresse ment :\n${tout.sortie}`);
  ok(/MENT\s+\S+\/d\/ : balise robots noindex/.test(tout.sortie) && /\/e\/ : redirigee \(301/.test(tout.sortie) && /\/f\/ : canonique ailleurs/.test(tout.sortie), "noindex, redirection et canonique ailleurs sont dits");
  ok(!/\/a\/ :|\/b\/ :|\/c\/ :/.test(tout.sortie), "une adresse juste n'est pas accusee");
  is(auPlus <= 2, true, `jamais plus de deux requetes simultanees, meme si on en demande neuf (vu : ${auPlus})`);
  const juste = await lancer(`${o}/sitemap-moteur.xml`, "--limite", "3");
  is(juste.code, 0, `un plan juste sort en code 0 :\n${juste.sortie}`);
  serveur.close();
}

/* --- La route du plan : en-tetes d'un plan gardable, sources lues ensemble -- */
{
  let enCours = 0;
  let auPlus = 0;
  const lent = async <T>(valeur: T): Promise<T> => {
    enCours++;
    auPlus = Math.max(auPlus, enCours);
    await new Promise((fin) => setTimeout(fin, 20));
    enCours--;
    return valeur;
  };
  const route = planVivant({ manifeste: () => lent({ construit: "x", pages: [{ chemin: "/" }], aLaDemande: [], redirections: [], ecartees: [] }), aLaDemande: () => lent(["/contact/"]) });
  const r = (await route({ site: new URL(O), url: new URL(`${O}/sitemap-moteur.xml`), locals: {} } as unknown as APIContext)) as Response;
  is(r.status, 200, "la route du plan repond 200");
  is(r.headers.get("cache-control"), "public, max-age=300", "le plan se garde cinq minutes, plus de no-store");
  ok((await r.text()).includes(`<loc>${O}/contact/</loc>`), "le plan porte les adresses du site");
  is(auPlus, 2, "le manifeste et les adresses du site sont lus en meme temps");
  const enPanne = planVivant({ manifeste: async () => null, aLaDemande: async () => { throw new Error("base"); } });
  const r503 = (await enPanne({ site: new URL(O), url: new URL(`${O}/sitemap-moteur.xml`), locals: {} } as unknown as APIContext)) as Response;
  is(r503.status, 503, "un plan incomplet ne part pas");
  is(r503.headers.get("cache-control"), "no-store", "un plan indisponible ne se garde nulle part");
}

console.log(`seo.selfcheck : ${n} verifications passees`);
