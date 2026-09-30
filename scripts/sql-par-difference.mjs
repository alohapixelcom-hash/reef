// scripts/sql-par-difference.mjs - ecrit le SQL idempotent d'une version (generique), par difference entre deux bases locales : celle de depart et celle que la graine suivante produit.
//
// LA METHODE (docs/moteur.md, "Online data") : une base locale vierge recoit la
// graine et l'import de la version de depart ; une autre recoit la graine et
// l'import de la version suivante. Ce script compare les deux, table par
// table, sur des cles NATURELLES (identifiant d'une collection, d'un champ,
// d'une entree et sa langue, nom d'un menu et sa langue), jamais sur les
// identifiants techniques, qui different d'une base en ligne a l'autre. Il
// ecrit ce qu'il faut pour passer de l'une a l'autre, sous les seules formes
// permises en ligne :
//   - CREATE ... IF NOT EXISTS (tables, index, tables de recherche) ;
//   - INSERT ... SELECT ... WHERE NOT EXISTS (cle naturelle), identifiants fixes
//     pris dans la base suivante, references resolues par sous-requete ;
//   - UPDATE ... WHERE <valeur actuelle> IS <valeur de depart> : une valeur
//     que l'editeur a changee n'est jamais ecrasee ;
//   - les declencheurs en dernier.
// Aucun DELETE, aucun DROP. Chaque UPDATE est precede d'une ligne
// "-- garde:" que scripts/base-3.4.0.mjs lit pour dire, avant d'ecrire,
// ce qui sera laisse de cote.
//
// Les colonnes nouvelles d'une table existante ne sont PAS ici : SQLite ne sait
// pas les ajouter sans erreur si elles existent deja. base-3.4.0.mjs les
// ajoute avant de passer ce fichier.
//
// TROIS PIEGES EVITES :
//   - les MEDIAS : les deux bases recoivent les memes images par deux imports,
//     sous des identifiants locaux differents. Avant toute difference, chaque
//     media de la base suivante est rapproche de celui de la base de depart
//     (meme empreinte de contenu, sinon meme nom et meme taille) et ses
//     identifiants (id, cle de stockage) sont remplaces par ceux du depart :
//     sans cela, le fichier ecrirait des references vers des medias que la
//     base en ligne n'a pas. Un media sans pendant est signale a relire ;
//   - le JSON : une valeur n'est ecrite comme JSON dans une revision que si
//     elle en est vraiment (JSON.parse), jamais parce qu'elle commence par une
//     accolade ("{rubrique}, the journal" est un texte) ;
//   - les tables qu'une extension cree a son premier usage (CREATE TABLE IF
//     NOT EXISTS dans son code : courriels_*, commerce_*) : leur presence
//     depend de ce que le serveur de developpement a touche, elles ne sont
//     jamais recopiees (EXTENSIONS_AU_PREMIER_USAGE).
// Apres le passage en ligne, EmDash marque l'index d'usage des medias d'une
// collection dont le schema change comme perime ("stale") : sans effet
// visible, il se reconstruit seul (voir base-3.4.0.mjs, qui le dit).
//
//   node scripts/sql-par-difference.mjs --depart a.sqlite --suivante b.sqlite --sortie import-3.4.0-x.sql [--entete fichier.txt]
//
// L'en-tete (commentaires du fichier) est lu dans --entete s'il est donne.
// Le script dit aussi, sur la sortie d'erreur, les tables qui different et
// qu'il ne sait pas traiter : a relire a la main.
import { readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((paires, a, i, tout) => (a.startsWith("--") ? [...paires, [a.slice(2), tout[i + 1]]] : paires), []),
);
if (!args.depart || !args.suivante || !args.sortie) {
  console.error("usage : --depart a.sqlite --suivante b.sqlite --sortie fichier.sql [--entete fichier.txt]");
  process.exit(2);
}
const A = new DatabaseSync(args.depart, { readOnly: true });
const B = new DatabaseSync(args.suivante, { readOnly: true });

const lit = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" || typeof v === "bigint" ? String(v) : `'${String(v).replaceAll("'", "''")}'`);
const id = (n) => `"${n.replaceAll('"', '""')}"`;
const tous = (db, sql, ...p) => db.prepare(sql).all(...p);
const un = (db, sql, ...p) => db.prepare(sql).get(...p);
const colonnes = (db, table) => tous(db, `SELECT name FROM pragma_table_info('${table}')`).map((r) => r.name);
const MAINTENANT = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const HORODATAGES = new Set(["created_at", "updated_at", "published_at"]);

const sortie = [];
const declencheurs = [];
const aRelire = [];
const ecrire = (...lignes) => sortie.push(...lignes);

// ---------------------------------------------------------------------------
// 1. LE SCHEMA : les objets de la base suivante absents de celle de depart.
// Les tables d'abord (tables ordinaires, puis tables virtuelles de recherche),
// puis les index ; les declencheurs a la fin du fichier.
// Les tables qu'une extension cree elle-meme a son premier usage : jamais recopiees.
const EXTENSIONS_AU_PREMIER_USAGE = /^(courriels|commerce)_/;
const objets = (db) =>
  new Map(
    tous(db, "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")
      .filter((o) => !EXTENSIONS_AU_PREMIER_USAGE.test(o.tbl_name))
      .map((o) => [o.name, o]),
  );
const objetsA = objets(A);
const objetsB = objets(B);
const nouveaux = [...objetsB.values()].filter((o) => !objetsA.has(o.name));
// Les tables internes d'une table virtuelle (fts5 : _data, _idx, _docsize, _config, _content) naissent avec elle.
const virtuelles = nouveaux.filter((o) => /CREATE VIRTUAL TABLE/i.test(o.sql)).map((o) => o.name);
const interne = (nom) => virtuelles.some((v) => nom !== v && nom.startsWith(`${v}_`));
const siAbsent = (o) =>
  o.sql
    .replace(/^CREATE\s+TABLE\s+(?!IF NOT EXISTS)/i, "CREATE TABLE IF NOT EXISTS ")
    .replace(/^CREATE\s+VIRTUAL\s+TABLE\s+(?!IF NOT EXISTS)/i, "CREATE VIRTUAL TABLE IF NOT EXISTS ")
    .replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF NOT EXISTS)/i, (_tout, u) => `CREATE ${u ?? ""}INDEX IF NOT EXISTS `)
    .replace(/^CREATE\s+TRIGGER\s+(?!IF NOT EXISTS)/i, "CREATE TRIGGER IF NOT EXISTS ");
const schema = { table: [], index: [] };
// LES DECLENCHEURS DE SUIVI DES MEDIAS D'EMDASH (emdash_mu_*) portent en dur
// l'identifiant de leur collection, et s'arretent en erreur (RAISE ABORT) si
// la ligne de suivi de cette collection manque : ceux d'une table qui existe
// deja sont ceux de la base en ligne, jamais recopies d'une base locale (ils
// bloqueraient toute ecriture) ; ceux d'une table nouvelle viennent avec elle,
// son identifiant etant celui que ce fichier insere, et sa ligne de suivi aussi
// (section 2 bis).
const suiviDesMedias = (o) => o.type === "trigger" && /^emdash_mu_/.test(o.name);
for (const o of nouveaux) {
  if (interne(o.name)) continue;
  if (suiviDesMedias(o) && objetsA.has(o.tbl_name)) continue;
  if (o.type === "trigger") declencheurs.push(`${siAbsent(o)};`);
  else if (o.type === "table") schema.table.push(`${siAbsent(o)};`);
  else if (o.type === "index") schema.index.push(`${siAbsent(o)};`);
}
// Un objet present des deux cotes mais ecrit autrement : a relire (le script ne reecrit jamais un schema en place).
for (const o of objetsB.values()) {
  const a = objetsA.get(o.name);
  if (a && a.sql.replace(/\s+/g, " ") !== o.sql.replace(/\s+/g, " ") && !/^ec_/.test(o.name)) aRelire.push(`schema de ${o.name} change`);
}
if (schema.table.length + schema.index.length > 0) {
  ecrire("", "-- 1. LE SCHEMA : les tables et les index nouveaux, crees seulement s'ils manquent.", "", ...schema.table, ...schema.index);
}

// ---------------------------------------------------------------------------
// 1 bis. LES MEDIAS ALIGNES : chaque identifiant d'un media de la base suivante
// qui a un pendant au depart est remplace par celui du depart, dans toute
// valeur comparee ou ecrite plus bas.
const alignement = new Map();
const mediasSansPendant = [];
let mediasAlignes = 0;
if (objetsA.has("media") && objetsB.has("media")) {
  const cle = (m) => (m.content_hash ? `h:${m.content_hash}` : `n:${m.filename}|${m.size}`);
  const depart = new Map(tous(A, "SELECT * FROM media").map((m) => [cle(m), m]));
  for (const m of tous(B, "SELECT * FROM media")) {
    const pendant = depart.get(cle(m)) ?? depart.get(`n:${m.filename}|${m.size}`);
    if (!pendant) {
      mediasSansPendant.push(m);
      continue;
    }
    if (m.id !== pendant.id) mediasAlignes += 1;
    for (const col of ["id", "storage_key"]) if (m[col] && pendant[col] && m[col] !== pendant[col]) alignement.set(m[col], pendant[col]);
  }
}
const motifAligne = alignement.size > 0 ? new RegExp([...alignement.keys()].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g") : null;
/** Une valeur de la base suivante, ses references de medias ramenees a celles du depart. */
const aligner = (v) => (motifAligne && typeof v === "string" ? v.replace(motifAligne, (k) => alignement.get(k)) : v);
/** Vrai si la valeur est du JSON (objet ou liste), et pas un texte qui commence par une accolade. */
const estJson = (v) => {
  if (typeof v !== "string" || !/^[[{]/.test(v)) return false;
  try {
    const x = JSON.parse(v);
    return typeof x === "object" && x !== null;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// 2. LES COLLECTIONS ET LEURS CHAMPS (tables d'EmDash), sur leur identifiant.
const collectionsA = new Map(tous(A, "SELECT * FROM _emdash_collections").map((r) => [r.slug, r]));
const collectionsB = tous(B, "SELECT * FROM _emdash_collections ORDER BY sort_order, slug");
const IGNORER_COLLECTION = new Set(["id", "created_at", "updated_at"]);
const blocCollections = [];
for (const c of collectionsB) {
  const a = collectionsA.get(c.slug);
  const cols = Object.keys(c);
  if (!a) {
    blocCollections.push(
      `-- collection ${c.slug} (nouvelle)`,
      `INSERT INTO _emdash_collections (${cols.map(id).join(", ")})`,
      `  SELECT ${cols.map((k) => (HORODATAGES.has(k) ? MAINTENANT : lit(c[k]))).join(", ")}`,
      `  WHERE NOT EXISTS (SELECT 1 FROM _emdash_collections WHERE slug = ${lit(c.slug)});`,
    );
    continue;
  }
  for (const k of cols) {
    if (IGNORER_COLLECTION.has(k) || a[k] === c[k]) continue;
    const garde = `slug = ${lit(c.slug)} AND ${id(k)} IS ${lit(a[k])}`;
    blocCollections.push(
      `-- garde: SELECT count(*) FROM _emdash_collections WHERE slug = ${lit(c.slug)} AND (${id(k)} IS ${lit(a[k])} OR ${id(k)} IS ${lit(c[k])}) | collection ${c.slug} : ${k}`,
      `UPDATE _emdash_collections SET ${id(k)} = ${lit(c[k])}, updated_at = ${MAINTENANT} WHERE ${garde};`,
    );
  }
}
const cleChamp = (r) => `${r.collection}/${r.slug}`;
const champs = (db) => tous(db, "SELECT f.*, c.slug AS collection FROM _emdash_fields f JOIN _emdash_collections c ON c.id = f.collection_id ORDER BY c.sort_order, c.slug, f.sort_order");
const champsA = new Map(champs(A).map((r) => [cleChamp(r), r]));
const IGNORER_CHAMP = new Set(["id", "collection_id", "collection", "created_at"]);
for (const f of champs(B)) {
  const a = champsA.get(cleChamp(f));
  const cols = Object.keys(f).filter((k) => k !== "collection");
  if (!a) {
    blocCollections.push(
      `-- champ ${cleChamp(f)} (nouveau)`,
      `INSERT INTO _emdash_fields (${cols.map(id).join(", ")})`,
      `  SELECT ${cols.map((k) => (k === "collection_id" ? `(SELECT id FROM _emdash_collections WHERE slug = ${lit(f.collection)})` : HORODATAGES.has(k) ? MAINTENANT : lit(f[k]))).join(", ")}`,
      `  WHERE NOT EXISTS (SELECT 1 FROM _emdash_fields WHERE slug = ${lit(f.slug)} AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = ${lit(f.collection)}));`,
    );
    continue;
  }
  for (const k of cols) {
    if (IGNORER_CHAMP.has(k) || a[k] === f[k]) continue;
    const ou = `slug = ${lit(f.slug)} AND collection_id = (SELECT id FROM _emdash_collections WHERE slug = ${lit(f.collection)})`;
    blocCollections.push(
      `-- garde: SELECT count(*) FROM _emdash_fields WHERE ${ou} AND (${id(k)} IS ${lit(a[k])} OR ${id(k)} IS ${lit(f[k])}) | champ ${cleChamp(f)} : ${k}`,
      `UPDATE _emdash_fields SET ${id(k)} = ${lit(f[k])} WHERE ${ou} AND ${id(k)} IS ${lit(a[k])};`,
    );
  }
}
// 2 bis. Le suivi des medias des collections nouvelles : la ligne que leurs
// declencheurs exigent, sur les identifiants inseres plus haut.
const nouvellesCollections = collectionsB.filter((c) => !collectionsA.has(c.slug));
if (objetsB.has("_emdash_media_usage_index_status")) {
  const colsSuivi = colonnes(B, "_emdash_media_usage_index_status");
  for (const c of nouvellesCollections) {
    for (const ligne of tous(B, "SELECT * FROM _emdash_media_usage_index_status WHERE scope_type = 'collection' AND collection_id = ?", c.id)) {
      blocCollections.push(
        `-- suivi des medias de la collection ${c.slug} (nouvelle)`,
        `INSERT INTO _emdash_media_usage_index_status (${colsSuivi.map(id).join(", ")})`,
        `  SELECT ${colsSuivi.map((k) => (k === "updated_at" || k === "started_at" ? (ligne[k] === null ? "NULL" : MAINTENANT) : lit(ligne[k]))).join(", ")}`,
        `  WHERE NOT EXISTS (SELECT 1 FROM _emdash_media_usage_index_status WHERE adapter_id = ${lit(ligne.adapter_id)} AND scope_type = 'collection' AND scope_key = ${lit(ligne.scope_key)});`,
      );
    }
  }
}
if (blocCollections.length > 0) ecrire("", "-- 2. LES COLLECTIONS ET LEURS CHAMPS : les nouveaux, puis ce qui change dans les anciens (libelles, choix, ordre), seulement si la valeur est encore celle de depart.", "", ...blocCollections);

// ---------------------------------------------------------------------------
// 3. LES ENTREES (tables ec_*), sur leur identifiant et leur langue.
const tablesDeContenu = [...objetsB.values()].filter((o) => o.type === "table" && /^ec_/.test(o.name)).map((o) => o.name);
const TECHNIQUES = new Set(["id", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at", "version", "live_revision_id", "draft_revision_id", "translation_group"]);
const blocEntrees = [];
const blocMaj = [];
for (const table of tablesDeContenu) {
  const collection = table.slice(3);
  const aExiste = objetsA.has(table);
  const colsB = colonnes(B, table);
  const colsA = aExiste ? new Set(colonnes(A, table)) : new Set();
  const lignesA = aExiste ? new Map(tous(A, `SELECT * FROM ${id(table)}`).map((r) => [`${r.slug}/${r.locale}`, r])) : new Map();
  // La langue source d'abord : une traduction se rattache a une entree qui existe.
  const lignesB = tous(B, `SELECT * FROM ${id(table)} WHERE deleted_at IS NULL ORDER BY (id = translation_group) DESC, slug, locale`).map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, TECHNIQUES.has(k) ? v : aligner(v)])),
  );
  const parId = new Map(lignesB.map((r) => [r.id, r]));
  for (const r of lignesB) {
    const cle = `${r.slug}/${r.locale}`;
    const a = lignesA.get(cle);
    if (!a) {
      const rev = r.live_revision_id ? un(B, "SELECT * FROM revisions WHERE id = ?", r.live_revision_id) : null;
      const source = parId.get(r.translation_group);
      const groupe = source && source.id !== r.id ? `(SELECT translation_group FROM ${id(table)} WHERE slug = ${lit(source.slug)} AND locale = ${lit(source.locale)})` : lit(r.id);
      const auteur = `(SELECT id FROM users ORDER BY role DESC, created_at LIMIT 1)`;
      const absente = `NOT EXISTS (SELECT 1 FROM ${id(table)} WHERE slug = ${lit(r.slug)} AND locale = ${lit(r.locale)})`;
      blocEntrees.push(`-- ${collection}/${r.slug} (${r.locale})`);
      if (rev) {
        blocEntrees.push(
          `INSERT INTO revisions (id, collection, entry_id, data, author_id, created_at)`,
          `  SELECT ${lit(rev.id)}, ${lit(collection)}, ${lit(r.id)}, ${lit(aligner(rev.data))}, ${auteur}, ${MAINTENANT}`,
          `  WHERE ${absente} AND NOT EXISTS (SELECT 1 FROM revisions WHERE id = ${lit(rev.id)});`,
        );
      }
      const cols = colsB.filter((k) => k !== "draft_revision_id" && k !== "deleted_at");
      const valeur = (k) => (k === "author_id" ? auteur : k === "translation_group" ? groupe : HORODATAGES.has(k) ? (r[k] === null ? "NULL" : MAINTENANT) : lit(r[k]));
      blocEntrees.push(
        `INSERT INTO ${id(table)} (${cols.map(id).join(", ")})`,
        `  SELECT ${cols.map(valeur).join(", ")}`,
        `  WHERE ${absente}${rev ? ` AND EXISTS (SELECT 1 FROM revisions WHERE id = ${lit(rev.id)} AND entry_id = ${lit(r.id)})` : ""};`,
      );
      continue;
    }
    // Une entree des deux cotes : chaque colonne de contenu qui differe.
    const revA = a.live_revision_id ? un(A, "SELECT data FROM revisions WHERE id = ?", a.live_revision_id) : null;
    for (const k of colsB) {
      if (TECHNIQUES.has(k) || k === "slug" || k === "locale" || k === "status" || k === "deleted_at") continue;
      const avant = colsA.has(k) ? a[k] : null;
      if (avant === r[k]) continue;
      const ou = `slug = ${lit(r.slug)} AND locale = ${lit(r.locale)}`;
      blocMaj.push(
        `-- garde: SELECT count(*) FROM ${id(table)} WHERE ${ou} AND (${id(k)} IS ${lit(avant)} OR ${id(k)} IS ${lit(r[k])}) | ${collection}/${r.slug} (${r.locale}) : ${k}`,
        `UPDATE ${id(table)} SET ${id(k)} = ${lit(r[k])} WHERE ${ou} AND ${id(k)} IS ${lit(avant)};`,
      );
      // La revision en ligne porte la meme valeur : l'editeur du back office la lit.
      if (revA) {
        const chemin = `'$.${k}'`;
        const valeurJson = typeof r[k] === "number" ? String(r[k]) : r[k] === null ? "NULL" : estJson(r[k]) ? `json(${lit(r[k])})` : lit(r[k]);
        blocMaj.push(
          `UPDATE revisions SET data = json_set(data, ${chemin}, ${valeurJson})`,
          `  WHERE id = (SELECT live_revision_id FROM ${id(table)} WHERE ${ou}) AND json_extract(data, ${chemin}) IS ${lit(avant)} AND (SELECT ${id(k)} FROM ${id(table)} WHERE ${ou}) IS ${lit(r[k])};`,
        );
      }
    }
  }
}
if (blocEntrees.length > 0) ecrire("", "-- 3. LES ENTREES NOUVELLES, publiees, avec leur revision en ligne ; la langue source d'abord, la traduction s'y rattache.", "", ...blocEntrees);
if (blocMaj.length > 0) ecrire("", "-- 4. LES ENTREES EXISTANTES : chaque valeur nouvelle, sur la ligne et sur sa revision en ligne, seulement si la valeur est encore celle de depart.", "", ...blocMaj);

// ---------------------------------------------------------------------------
// 5. LES MENUS ET LEURS LIENS, sur le nom du menu et sa langue.
const menusA = new Set(tous(A, "SELECT name || '/' || locale AS k FROM _emdash_menus").map((r) => r.k));
const menusB = tous(B, "SELECT * FROM _emdash_menus ORDER BY (id = translation_group) DESC, name, locale");
const blocMenus = [];
for (const m of menusB) {
  if (menusA.has(`${m.name}/${m.locale}`)) continue;
  const source = menusB.find((x) => x.id === m.translation_group);
  const groupe = source && source.id !== m.id ? `(SELECT translation_group FROM _emdash_menus WHERE name = ${lit(source.name)} AND locale = ${lit(source.locale)})` : lit(m.id);
  const absent = `NOT EXISTS (SELECT 1 FROM _emdash_menus WHERE name = ${lit(m.name)} AND locale = ${lit(m.locale)})`;
  blocMenus.push(
    `-- menu ${m.name} (${m.locale})`,
    `-- garde: SELECT CASE WHEN ${absent} THEN 1 WHEN EXISTS (SELECT 1 FROM _emdash_menus WHERE id = ${lit(m.id)}) THEN 1 ELSE 0 END | menu ${m.name} (${m.locale}) : deja cree a la main, ses liens restent ceux de l'editeur`,
    `INSERT INTO _emdash_menus (id, name, label, created_at, updated_at, locale, translation_group)`,
    `  SELECT ${lit(m.id)}, ${lit(m.name)}, ${lit(m.label)}, ${MAINTENANT}, ${MAINTENANT}, ${lit(m.locale)}, ${groupe}`,
    `  WHERE ${absent};`,
  );
  const liens = tous(B, "SELECT * FROM _emdash_menu_items WHERE menu_id = ? ORDER BY parent_id IS NOT NULL, sort_order", m.id);
  const colsLien = colonnes(B, "_emdash_menu_items");
  for (const l of liens) {
    const src = l.translation_group && l.translation_group !== l.id ? l.translation_group : null;
    const valeur = (k) => (HORODATAGES.has(k) ? MAINTENANT : k === "translation_group" && src ? `(SELECT translation_group FROM _emdash_menu_items WHERE id = ${lit(src)})` : lit(l[k]));
    blocMenus.push(
      `INSERT INTO _emdash_menu_items (${colsLien.map(id).join(", ")})`,
      `  SELECT ${colsLien.map(valeur).join(", ")}`,
      `  WHERE EXISTS (SELECT 1 FROM _emdash_menus WHERE id = ${lit(m.id)}) AND NOT EXISTS (SELECT 1 FROM _emdash_menu_items WHERE id = ${lit(l.id)});`,
    );
  }
}
if (blocMenus.length > 0) ecrire("", "-- 5. LES MENUS NATIFS, un par nom et par langue, avec leurs liens ; un menu du meme nom deja cree a la main n'est pas touche.", "", ...blocMenus);

// ---------------------------------------------------------------------------
// 6. LES REGLAGES DU SITE (options "site:*"), seulement s'ils manquent.
const optionsA = new Map(tous(A, "SELECT name, value FROM options WHERE name LIKE 'site:%'").map((r) => [r.name, r.value]));
const blocOptions = [];
for (const o of tous(B, "SELECT name, value FROM options WHERE name LIKE 'site:%' ORDER BY name")) {
  if (optionsA.get(o.name) === o.value) continue;
  if (optionsA.has(o.name)) {
    aRelire.push(`reglage ${o.name} : ${optionsA.get(o.name)} -> ${o.value} (jamais ecrase en ligne)`);
    continue;
  }
  blocOptions.push(`INSERT OR IGNORE INTO options (name, value) VALUES (${lit(o.name)}, ${lit(o.value)});`);
}
if (blocOptions.length > 0) ecrire("", "-- 6. LES REGLAGES DU SITE nouveaux (un reglage existant n'est jamais ecrase).", "", ...blocOptions);

// Les autres tables qui different : a relire.
for (const table of ["_emdash_seo", "_emdash_redirects", "taxonomies", "_emdash_taxonomy_defs", "_emdash_widget_areas", "_emdash_widgets"]) {
  if (!objetsA.has(table) || !objetsB.has(table)) continue;
  const n = (db) => un(db, `SELECT count(*) AS n FROM ${id(table)}`).n;
  if (n(A) !== n(B)) aRelire.push(`${table} : ${n(A)} ligne(s) au depart, ${n(B)} dans la base suivante`);
}

if (declencheurs.length > 0) ecrire("", "-- 7. LES DECLENCHEURS (index de recherche des collections nouvelles), en dernier.", "", ...declencheurs);

const entete = args.entete ? readFileSync(args.entete, "utf8").trimEnd() : "-- SQL etabli par scripts/sql-par-difference.mjs.";
writeFileSync(args.sortie, `${entete}\n${sortie.join("\n")}\n`);
console.log(`${args.sortie} : ${sortie.filter((l) => /^(INSERT|UPDATE|CREATE)/.test(l)).length + declencheurs.length} instruction(s).`);
// Un media de la base suivante sans pendant au depart, et cite par une valeur ecrite : il manquera en ligne.
const ecrit = sortie.join("\n");
for (const m of mediasSansPendant) {
  if (ecrit.includes(m.id)) aRelire.push(`media ${m.filename} (${m.id}) cite par le fichier mais absent de la base de depart : a televerser en ligne d'abord`);
}
if (mediasAlignes > 0) console.log(`medias alignes sur la base de depart : ${mediasAlignes}.`);
for (const r of aRelire) console.error(`a relire : ${r}`);
