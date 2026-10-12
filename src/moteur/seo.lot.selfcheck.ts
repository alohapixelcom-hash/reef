// src/moteur/seo.lot.selfcheck.ts - verifie le lot des panneaux SEO : la requete sur une vraie base SQLite, le pliage comme EmDash, la langue, et qu'un lot ne sert qu'a partir du deuxieme appel et jamais hors requete.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { creerLesLots, indexerLeLot, panneauDe, sqlDuLot } from "./seo.lot.ts";

let n = 0;
const egal = (a: unknown, b: unknown, message?: string) => {
  assert.deepEqual(a, b, message);
  n++;
};

// 1. La requete, sur les tables d'EmDash 0.38 reduites a ce qu'elle lit.
const base = new DatabaseSync(":memory:");
base.exec(`CREATE TABLE ec_products (id TEXT PRIMARY KEY, slug TEXT, locale TEXT, status TEXT, deleted_at TEXT);
CREATE TABLE _emdash_seo (collection TEXT NOT NULL, content_id TEXT NOT NULL, seo_title TEXT, seo_description TEXT, seo_image TEXT, seo_canonical TEXT, seo_no_index INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (collection, content_id));
INSERT INTO ec_products VALUES ('1','cafe-noir','fr','published',NULL),('2','cafe-noir','en','published',NULL),('3','the-vert','fr','published',NULL),
  ('4','brouillon','fr','draft',NULL),('5','supprime','fr','published','2026-10-01'),('6','sans-langue',NULL,'published',NULL),('7','sans-langue','fr','published',NULL);
INSERT INTO _emdash_seo (collection, content_id, seo_title, seo_no_index) VALUES ('products','1','Cafe noir',0),('products','2','Black coffee',1),('products','4','Brouillon',0),('posts','3','Autre collection',1),('products','7','Exacte',0);`);
const sql = sqlDuLot("products")!;
const lire = (collection: string, locale: string) => indexerLeLot(base.prepare(sqlDuLot(collection)!).all(collection, locale) as Record<string, unknown>[], locale);
const fr = lire("products", "fr");
egal(fr.get("cafe-noir"), { title: "Cafe noir", description: null, image: null, canonical: null, noIndex: false }, "le panneau de la langue demandee");
egal(lire("products", "en").get("cafe-noir")?.noIndex, true, "l'autre langue a son panneau");
egal(fr.get("the-vert"), {}, "une ligne d'une autre collection ne compte pas");
egal(fr.has("brouillon"), false, "un brouillon n'est pas dans le lot");
egal(fr.has("supprime"), false, "une entree supprimee n'est pas dans le lot");
egal(fr.get("sans-langue")?.title, "Exacte", "l'entree de la langue passe devant l'entree sans langue");
egal(lire("products", "en").get("sans-langue"), {}, "sans langue, l'entree sert toutes les langues");
egal(sqlDuLot('products"; DROP TABLE x; --'), null, "un nom douteux n'entre pas dans le SQL");
egal(sql.includes('"ec_products"'), true);

// 2. Le pliage : sans ligne, pas de panneau ; noIndex en booleen.
egal(panneauDe({ seo_no_index: null }), {});
egal(panneauDe({ seo_no_index: 1, seo_title: 7 }).title, null, "un titre qui n'est pas un texte devient null");

// 3. Les lots d'une requete.
let lectures = 0;
const lots = creerLesLots(async (c, l) => {
  lectures++;
  return lire(c, l);
});
const requete = {};
egal(await lots.panneau(requete, "products", "cafe-noir", "fr"), undefined, "le premier appel relit l'entree seule");
egal(lectures, 0);
egal((await lots.panneau(requete, "products", "the-vert", "fr")), {}, "le deuxieme appel lit le lot");
egal((await lots.panneau(requete, "products", "cafe-noir", "fr"))?.title, "Cafe noir");
egal(lectures, 1, "un seul lot par requete, collection et langue");
egal(await lots.panneau(requete, "products", "inconnue", "fr"), undefined, "une entree absente du lot repart par l'entree seule");
await lots.panneau(requete, "products", "cafe-noir", "en");
egal(await lots.panneau(requete, "products", "cafe-noir", "en").then((p) => p?.noIndex), true, "une autre langue a son lot");
egal(lectures, 2);
egal(await lots.panneau({}, "products", "cafe-noir", "fr"), undefined, "une nouvelle requete repart de zero");
egal(await lots.panneau(null, "products", "cafe-noir", "fr"), undefined, "hors requete, jamais de lot");
const enPanne = creerLesLots(async () => {
  throw new Error("base absente");
});
await enPanne.panneau(requete, "products", "a", "fr");
egal(await enPanne.panneau(requete, "products", "a", "fr"), undefined, "un lot illisible renvoie a l'entree seule");

console.log(`seo.lot.selfcheck : ${n} verifications, toutes justes`);
