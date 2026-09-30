// src/frontal/frontal.selfcheck.ts - self-check du Worker frontal : ce qui va au moteur, ce qui est prive, ce qui se garde, la cle, la fraicheur, la version lue dans une base simulee, et un parcours complet HIT, STALE, MISS sur un cache simule.
import assert from "node:assert/strict";
import {
  cleDuCache,
  creerFrontal,
  estPrivee,
  estUnFichier,
  etatDeLaCopie,
  nomsDesCookies,
  passeAuMoteur,
  peutEtreFigee,
  peutEtreGardee,
  porteLEdition,
} from "./cache.ts";
import { collectionsDuSchema, lireLaVersion, plusRecente, requeteDeLaVersion, tablesDuSchema } from "./version.ts";

const req = (chemin: string, init: RequestInit = {}) => new Request(`https://site.test${chemin}`, init);
const html = (corps = "<html>page</html>", entetes: Record<string, string> = {}, status = 200) =>
  new Response(corps, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...entetes } });

// 1. Ce qui va droit au moteur.
assert.equal(passeAuMoteur(req("/", { method: "POST" })), true);
assert.equal(passeAuMoteur(req("/_emdash/admin")), true);
assert.equal(passeAuMoteur(req("/_image?href=x")), true);
assert.equal(passeAuMoteur(req("/_astro/a.css")), false);
assert.equal(passeAuMoteur(req("/secret-spot/")), true);
assert.equal(passeAuMoteur(req("/fr/secret-spot")), true);
assert.equal(passeAuMoteur(req("/404.html")), true);
assert.equal(passeAuMoteur(req("/fr/404/")), true);
assert.equal(passeAuMoteur(req("/about/")), false);
assert.equal(passeAuMoteur(req("/blog/"), /^\/blog\//), true);
assert.equal(estUnFichier("/favicon.svg"), true);
assert.equal(estUnFichier("/about/"), false);
assert.equal(peutEtreFigee(req("/about/")), true);
assert.equal(peutEtreFigee(req("/about/", { method: "POST" })), false);
assert.equal(peutEtreFigee(req("/_emdash/admin")), false);
assert.equal(peutEtreFigee(req("/favicon.svg")), false);

// 2. Les visiteurs prives : session, mode edition, connexion, jeton.
assert.deepEqual(nomsDesCookies("a=1; aloha_locale=fr;b=2"), ["a", "aloha_locale", "b"]);
assert.equal(estPrivee(req("/", { headers: { Cookie: "aloha_locale=fr" } })), false);
assert.equal(estPrivee(req("/", { headers: { Cookie: "aloha_locale=fr; astro-session=x" } })), true);
assert.equal(estPrivee(req("/", { headers: { Cookie: "emdash-edit-mode=true" } })), true);
assert.equal(estPrivee(req("/", { headers: { Cookie: "wordpress_logged_in_1=x" } })), true);
assert.equal(estPrivee(req("/", { headers: { Authorization: "Bearer x" } })), true);
assert.equal(estPrivee(req("/")), false);

// 3. Ce qui se garde.
assert.equal(peutEtreGardee(html()), true);
assert.equal(peutEtreGardee(html("x", {}, 404)), false);
assert.equal(peutEtreGardee(new Response(null, { status: 301, headers: { Location: "/fr/" } })), false);
assert.equal(peutEtreGardee(html("x", { "Set-Cookie": "a=1" })), false);
assert.equal(peutEtreGardee(html("x", { "Cache-Control": "private" })), false);
assert.equal(peutEtreGardee(html("x", { "Cache-Control": "no-store" })), false);
assert.equal(peutEtreGardee(html("x", { Vary: "Cookie" })), false);
assert.equal(peutEtreGardee(new Response("{}", { headers: { "Content-Type": "application/json" } })), false);
assert.equal(peutEtreGardee(new Response("x", { headers: { "Content-Type": "text/plain" } })), true);
assert.equal(porteLEdition('<div id="emdash-toolbar">'), true);
assert.equal(porteLEdition('<h1 data-emdash-ref="x">'), true);
assert.equal(porteLEdition("<h1>Bonjour</h1>"), false);

// 4. La cle et la fraicheur.
assert.equal(cleDuCache(new URL("https://site.test/fr/?a=1"), "v1").url, "https://cache.aloha/v1/site.test/fr/?a=1");
assert.notEqual(cleDuCache(new URL("https://site.test/"), "v1").url, cleDuCache(new URL("https://site.test/"), "v2").url);
assert.equal(etatDeLaCopie(0, 59_000, 60), "fraiche");
assert.equal(etatDeLaCopie(0, 60_000, 60), "perimee");

// 5. La version : la requete, le schema, les dates.
assert.deepEqual(collectionsDuSchema("pages@2026,sections@2026,x-y@1"), ["pages", "sections"]);
assert.deepEqual(collectionsDuSchema("pages@2026,sections@2026#boutique_reglages,boutique_stock"), ["pages", "sections"]);
assert.deepEqual(tablesDuSchema("pages@2026#boutique_reglages,boutique_stock,autre"), ["boutique_reglages", "boutique_stock"]);
assert.deepEqual(tablesDuSchema("pages@2026#"), []);
assert.deepEqual(tablesDuSchema("pages@2026"), []);
assert.ok(requeteDeLaVersion(["products"], ["boutique_stock", "boutique_reglages"]).includes("FROM boutique_stock) AS boutique_stock"), "le stock entre dans la version");
assert.ok(requeteDeLaVersion(["products"], ["boutique_reglages"]).includes("AS boutique_reglages"), "les reglages de vente entrent dans la version");
assert.ok(!requeteDeLaVersion(["products"]).includes("FROM boutique_"), "sans boutique, aucune table de la boutique n'est lue");
const sql = requeteDeLaVersion(["sections", "site", "mal'nom"]);
assert.ok(sql.includes('FROM "ec_sections"') && sql.includes('FROM "ec_site"') && !sql.includes("mal'nom"));
assert.equal(plusRecente(["1.2026-09-28 17:17:04.0", "2026-09-28T17:17:05.000Z", 3]), Date.parse("2026-09-28T17:17:05.000Z"));

/** Une base simulee : la signature du schema, puis une ligne qui change quand on publie. */
function base(etat: { publie: string; schema: string }) {
  return {
    prepare: (requete: string) => ({
      first: async <T>() =>
        (requete.includes("sqlite_master") && !requete.includes("revisions")
          ? { schema: etat.schema }
          : { schema: etat.schema, c_sections: etat.publie, revisions: "1.2026-01-01 00:00:00" }) as T,
    }),
  };
}
const etat = { publie: "3.2026-01-01T00:00:00.000Z.3.", schema: "sections@2026-01-01" };
const v1 = await lireLaVersion(base(etat));
etat.publie = "3.2026-01-02T00:00:00.000Z.3.";
const v2 = await lireLaVersion(base(etat));
assert.ok(v1 && v2 && v1.cle !== v2.cle, "une publication doit changer la version");
assert.equal(v2?.derniere, Date.parse("2026-01-02T00:00:00.000Z"));
assert.equal(await lireLaVersion({ prepare: () => ({ first: async () => { throw new Error("table absente"); } }) }), null);

// 5 bis. La vraie requete sur une base SQLite en memoire (quand node:sqlite existe) : sans boutique, puis avec ; une vente change la version.
interface Sqlite {
  DatabaseSync: new (f: string) => { exec(s: string): void; prepare(s: string): { get(...p: unknown[]): Record<string, unknown> | undefined } };
}
const sqlite = (await import("node:sqlite").catch(() => null)) as unknown as Sqlite | null;
if (sqlite) {
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec(`CREATE TABLE _emdash_collections (slug TEXT, updated_at TEXT); INSERT INTO _emdash_collections VALUES ('products', '2026-01-01');
    CREATE TABLE ec_products (updated_at TEXT, status TEXT, published_at TEXT); CREATE TABLE revisions (created_at TEXT); CREATE TABLE options (name TEXT, revision TEXT);
    CREATE TABLE _emdash_menus (updated_at TEXT); CREATE TABLE _emdash_menu_items (id TEXT, sort_order INT, parent_id TEXT, label TEXT, custom_url TEXT, reference_id TEXT, css_classes TEXT, target TEXT, locale TEXT);
    CREATE TABLE _emdash_redirects (updated_at TEXT, enabled INT); CREATE TABLE _emdash_seo (updated_at TEXT); CREATE TABLE media (created_at TEXT, alt TEXT, focal_x REAL, focal_y REAL);
    CREATE TABLE taxonomies (id TEXT); CREATE TABLE content_taxonomies (id TEXT);`);
  const sur = { prepare: (q: string) => ({ first: async <T>() => (db.prepare(q).get() ?? null) as T | null }) };
  const sans = await lireLaVersion(sur);
  assert.ok(sans, "une base sans boutique a une version");
  db.exec("CREATE TABLE boutique_reglages (cle TEXT PRIMARY KEY, valeur TEXT, maj INTEGER, qui TEXT); CREATE TABLE boutique_stock (produit TEXT, variante TEXT, quantite INTEGER, seuil INTEGER, precommande INTEGER, maj INTEGER, qui TEXT)");
  db.exec("INSERT INTO boutique_stock VALUES ('planche', '', 1, 3, 0, 1, 'essai')");
  const avec = await lireLaVersion(sur);
  assert.ok(avec && avec.cle !== sans.cle, "les tables de la boutique entrent dans la version des qu'elles existent");
  db.exec("UPDATE boutique_stock SET quantite = 0, maj = 2, qui = 'Vente'");
  const vendu = await lireLaVersion(sur);
  assert.ok(vendu && vendu.cle !== avec.cle, "une vente qui epuise un produit change la version");
  db.exec("INSERT INTO boutique_reglages VALUES ('reglages', '{}', 3, 'admin')");
  const ht = await lireLaVersion(sur);
  assert.ok(ht && ht.cle !== vendu.cle, "un reglage de vente change la version");
}

// 6. Un parcours complet sur un cache simule : MISS, HIT, PRIVEE, publication, STALE.
const magasin = new Map<string, Response>();
(globalThis as unknown as { caches: unknown }).caches = {
  default: {
    match: async (r: Request) => magasin.get(r.url)?.clone(),
    put: async (r: Request, rep: Response) => void magasin.set(r.url, rep),
  },
};
let rendus = 0;
const moteur = {
  fetch: async (r: Request) => {
    rendus += 1;
    const editeur = (r.headers.get("Cookie") ?? "").includes("astro-session");
    return html(editeur ? '<div id="emdash-toolbar"></div>' : `<p>rendu ${rendus}</p>`);
  },
};
const attentes: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => void attentes.push(p) };
const vieux = { publie: "1.2020-01-01T00:00:00.000Z.1.", schema: "sections@2020-01-01" };
const env = { MOTEUR: moteur, DB: base(vieux) };
const frontal = creerFrontal({ memoireDeLaVersion: 0, avantLeCache: (r) => (new URL(r.url).pathname === "/vieux" ? new Response(null, { status: 301 }) : null) });
const passe = async (r: Request) => {
  const rep = await frontal.fetch(r, env, ctx);
  await Promise.all(attentes.splice(0));
  return rep;
};
let rep = await passe(req("/"));
assert.equal(rep.headers.get("x-aloha-cache"), "MISS");
rep = await passe(req("/"));
assert.equal(rep.headers.get("x-aloha-cache"), "HIT");
assert.equal(await rep.text(), "<p>rendu 1</p>");
assert.equal(rep.headers.get("Cache-Control"), null, "le Cache-Control de garde ne doit pas sortir");
rep = await passe(req("/", { headers: { Cookie: "astro-session=abc" } }));
assert.equal(rep.headers.get("x-aloha-cache"), "PRIVEE");
assert.ok((await rep.text()).includes("emdash-toolbar"));
rep = await passe(req("/"));
assert.equal(await rep.text(), "<p>rendu 1</p>", "la page de l'editeur ne doit jamais etre servie a un visiteur");
assert.equal((await passe(req("/vieux"))).headers.get("x-aloha-cache"), "REGLE");
vieux.publie = "2.2020-01-02T00:00:00.000Z.2.";
rep = await passe(req("/"));
// La cle a change : la page est rendue a neuf, mais pas gardee, l'isolat vient de voir le changement.
assert.equal(rep.headers.get("x-aloha-cache"), "NON-GARDEE", "une publication change la cle");
assert.equal(await rep.text(), `<p>rendu ${rendus}</p>`);
// Un autre isolat, plus tard (aucun changement vu) : rendue et gardee.
const autre = creerFrontal({ memoireDeLaVersion: 0 });
const passeAutre = async (r: Request) => {
  const reponse = await autre.fetch(r, env, ctx);
  await Promise.all(attentes.splice(0));
  return reponse;
};
assert.equal((await passeAutre(req("/"))).headers.get("x-aloha-cache"), "MISS");
assert.equal((await passe(req("/"))).headers.get("x-aloha-cache"), "HIT");
for (const [cle, copie] of magasin) {
  const h = new Headers(copie.headers);
  h.set("x-aloha-garde-le", "0");
  magasin.set(cle, new Response(await copie.clone().text(), { headers: h }));
}
const avant = rendus;
rep = await passeAutre(req("/"));
assert.equal(rep.headers.get("x-aloha-cache"), "STALE");
assert.equal(rendus, avant + 1, "une copie perimee est regeneree en arriere-plan");
rep = await passeAutre(req("/"));
assert.equal(rep.headers.get("x-aloha-cache"), "HIT");
assert.equal(await rep.text(), `<p>rendu ${avant + 1}</p>`);
// Juste apres un changement date de maintenant : rendu, jamais garde.
vieux.publie = `3.${new Date().toISOString()}.3.`;
rep = await passe(req("/"));
assert.equal(rep.headers.get("x-aloha-cache"), "NON-GARDEE");

// 7. Les pages figees : servies depuis les fichiers sans reveiller le moteur, pour tous ; une page geree (404 des fichiers) va au cache.
const fichiers = { fetch: async (r: Request) => (new URL(r.url).pathname === "/fige/" ? html("<p>fichier</p>") : new Response("absent", { status: 404 })) };
const envFichiers = { ...env, ASSETS: fichiers };
const avecFichiers = creerFrontal({ memoireDeLaVersion: 0 });
const rendusAvant = rendus;
for (const cookie of ["", "astro-session=abc"]) {
  const figee = await avecFichiers.fetch(req("/fige/", { headers: cookie ? { Cookie: cookie } : {} }), envFichiers, ctx);
  assert.equal(figee.headers.get("x-aloha-cache"), "FIGEE");
  assert.equal(await figee.text(), "<p>fichier</p>");
}
assert.equal(rendus, rendusAvant, "une page figee ne reveille pas le moteur");
const sansFigees = creerFrontal({ memoireDeLaVersion: 0, pagesFigees: false });
assert.notEqual((await sansFigees.fetch(req("/fige/"), envFichiers, ctx)).headers.get("x-aloha-cache"), "FIGEE");
await Promise.all(attentes.splice(0));
assert.ok(["MISS", "HIT", "NON-GARDEE"].includes((await avecFichiers.fetch(req("/geree/"), envFichiers, ctx)).headers.get("x-aloha-cache") ?? ""));
await Promise.all(attentes.splice(0));

console.log("frontal.selfcheck : parcours MISS, HIT, PRIVEE, REGLE, publication, STALE, fenetre sans copie, pages figees : tout passe.");
