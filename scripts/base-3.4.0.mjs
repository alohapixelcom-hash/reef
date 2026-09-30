// scripts/base-3.4.0.mjs - met une base du moteur deja remplie au niveau de la version courante (generique : le meme script dans chaque site) : les colonnes nouvelles, puis le fichier SQL idempotent de la version.
//
// POURQUOI UN SCRIPT EN PLUS DU SQL. Un champ ajoute a une collection qui
// existe deja est une colonne de plus dans sa table (ec_<collection>), et
// SQLite ne sait pas ecrire "ALTER TABLE ... ADD COLUMN" sans erreur quand la
// colonne est deja la. Ce script lit le schema de la base (lecture seule),
// compare aux champs que la graine du theme declare (seed/seed.json), et
// n'ajoute QUE les colonnes qui manquent. Puis il passe le fichier SQL, qui
// se garde lui-meme (INSERT OR IGNORE, UPDATE ... WHERE valeur d'origine).
//
// SANS --appliquer, IL N'ECRIT RIEN : il dit le plan. Les colonnes a ajouter,
// et chaque ecriture que le SQL laissera de cote parce que l'editeur a deja
// change la valeur (lignes "-- garde:" du fichier SQL, voir plus bas).
//
//   node scripts/base-3.4.0.mjs --local  swell-moteur [--appliquer]
//   node scripts/base-3.4.0.mjs --remote swell-moteur [--appliquer]
//   node scripts/base-3.4.0.mjs --sqlite chemin/de/la/base.sqlite [--appliquer]
//
// Options : --sql <fichier> (defaut : le seul import-3.4.0-*.sql du dossier
// migrations/, a defaut de la racine du depot), --config <fichier wrangler> (defaut : wrangler.moteur.jsonc),
// --graine <fichier> (defaut : seed/seed.json).
//
// --local et --remote passent par wrangler (d1 execute), comme la marche a
// suivre de docs/moteur.md ; --sqlite ecrit directement dans un fichier SQLite
// (une copie de base locale, pour les essais), par node:sqlite.
//
// LES GARDES DU SQL. Une ligne de commentaire de la forme
//   -- garde: <requete SELECT qui rend 1 si l'ecriture suivante s'appliquera> | <ce qu'elle fait>
// est lue par le plan : si la requete rend 0 alors que l'objet existe, la
// valeur a ete changee par l'editeur et l'ecriture ne s'appliquera pas ; le
// plan le dit. Le SQL reste un fichier SQL ordinaire (ces lignes sont des
// commentaires pour SQLite comme pour D1).
//
// GENERIQUE : rien ici ne connait un theme. La graine dit les champs, le
// fichier SQL dit le reste.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RACINE = fileURLToPath(new URL("../", import.meta.url));

/** Les types de colonne qu'EmDash 0.38 donne a chaque sorte de champ (emdash/src/schema/types.ts, FIELD_TYPE_TO_COLUMN). */
const COLONNE = {
  string: "TEXT", text: "TEXT", number: "REAL", integer: "INTEGER", boolean: "INTEGER", datetime: "TEXT", select: "TEXT",
  multiSelect: "JSON", portableText: "JSON", image: "TEXT", file: "TEXT", reference: "TEXT", json: "JSON", slug: "TEXT",
  url: "TEXT", repeater: "JSON",
};

function lireLesArguments(argv) {
  const opts = { appliquer: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--appliquer") opts.appliquer = true;
    else if (a === "--local" || a === "--remote" || a === "--sqlite") {
      opts.mode = a.slice(2);
      opts.base = argv[++i];
    } else if (a === "--sql" || a === "--config" || a === "--graine") opts[a.slice(2)] = argv[++i];
    else throw new Error(`Option inconnue : ${a}`);
  }
  if (!opts.mode || !opts.base) throw new Error("Dire la base : --local <nom>, --remote <nom> ou --sqlite <fichier>.");
  opts.config ??= `${RACINE}wrangler.moteur.jsonc`;
  opts.graine ??= `${RACINE}seed/seed.json`;
  if (!opts.sql) {
    const dossier = existsSync(`${RACINE}migrations`) ? `${RACINE}migrations/` : RACINE;
    const candidats = readdirSync(dossier).filter((f) => /^import-3\.4\.0-.+\.sql$/.test(f));
    if (candidats.length !== 1) throw new Error(`--sql manquant : ${candidats.length} fichier(s) import-3.4.0-*.sql dans ${dossier === RACINE ? "la racine" : "migrations/"}.`);
    opts.sql = `${dossier}${candidats[0]}`;
  }
  if (!existsSync(opts.sql)) throw new Error(`Fichier SQL introuvable : ${opts.sql}`);
  return opts;
}

/** Un acces a la base : lire (SELECT), executer une instruction, executer un fichier. */
async function ouvrir(opts) {
  if (opts.mode === "sqlite") {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(opts.base);
    return {
      lire: (sql) => db.prepare(sql).all(),
      executer: (sql) => db.exec(sql),
      fichier: (chemin) => db.exec(readFileSync(chemin, "utf8")),
      fermer: () => db.close(),
    };
  }
  const drapeau = opts.mode === "local" ? "--local" : "--remote";
  const wrangler = (extra) =>
    execFileSync("npx", ["wrangler", "d1", "execute", opts.base, drapeau, "--config", opts.config, ...extra], {
      cwd: RACINE,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    });
  return {
    lire: (sql) => JSON.parse(wrangler(["--json", "--command", sql]))[0]?.results ?? [],
    executer: (sql) => wrangler(["--command", sql]),
    fichier: (chemin) => wrangler(["--file", chemin]),
    fermer: () => {},
  };
}

const citer = (nom) => `"${String(nom).replaceAll('"', '""')}"`;

/** Les colonnes a ajouter : pour chaque collection de la graine dont la table existe, les champs sans colonne. */
function colonnesManquantes(base, graine) {
  const tables = new Set(base.lire("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'ec\\_%' ESCAPE '\\'").map((r) => r.name));
  const manquantes = [];
  for (const collection of graine.collections ?? []) {
    const table = `ec_${collection.slug}`;
    if (!tables.has(table)) continue; // table nouvelle : le SQL la cree entiere
    const presentes = new Set(base.lire(`SELECT name FROM pragma_table_info('${table}')`).map((r) => r.name));
    for (const champ of collection.fields ?? []) {
      if (presentes.has(champ.slug)) continue;
      const type = COLONNE[champ.type];
      if (!type) throw new Error(`${collection.slug}.${champ.slug} : sorte de champ inconnue (${champ.type})`);
      // Meme regle qu'EmDash (registry.addColumn) : un champ obligatoire recoit une valeur vide par defaut.
      const defaut = champ.required ? ` NOT NULL DEFAULT ${type === "INTEGER" || type === "REAL" ? "0" : "''"}` : "";
      manquantes.push({ table, colonne: champ.slug, sql: `ALTER TABLE ${citer(table)} ADD COLUMN ${citer(champ.slug)} ${type}${defaut}` });
    }
  }
  return manquantes;
}

/** Les gardes du fichier SQL : chaque ligne "-- garde: <SELECT> | <description>". */
function gardesDuSql(texte) {
  return texte
    .split("\n")
    .map((ligne) => /^--\s*garde:\s*(.+?)\s*\|\s*(.+)$/.exec(ligne))
    .filter(Boolean)
    .map(([, requete, description]) => ({ requete, description }));
}

const opts = lireLesArguments(process.argv.slice(2));
const graine = JSON.parse(readFileSync(opts.graine, "utf8"));
const texteSql = readFileSync(opts.sql, "utf8");
const base = await ouvrir(opts);

const manquantes = colonnesManquantes(base, graine);
console.log(`Base : ${opts.base} (${opts.mode})`);
console.log(`Fichier SQL : ${opts.sql.replace(RACINE, "")}`);
console.log(manquantes.length === 0 ? "Colonnes : aucune a ajouter." : `Colonnes a ajouter (${manquantes.length}) :`);
for (const m of manquantes) console.log(`  + ${m.table}.${m.colonne}`);

// Les gardes ne se lisent qu'une fois les colonnes la : avant, une requete qui
// nomme une colonne nouvelle echouerait. Dans le plan, une garde qui echoue
// pour cette raison est dite "a verifier apres les colonnes".
const gardes = gardesDuSql(texteSql);
const laissees = [];
for (const garde of gardes) {
  try {
    const rendu = base.lire(garde.requete);
    const valeur = rendu[0] ? Object.values(rendu[0])[0] : 0;
    if (Number(valeur) === 0) laissees.push(garde.description);
  } catch (erreur) {
    // La garde nomme une colonne que ce script va ajouter : vide a sa
    // creation, la valeur est encore celle de depart, l'ecriture passera.
    // Une table que le SQL cree (CREATE TABLE IF NOT EXISTS) : de meme.
    const nommeUneNouvelle = manquantes.some((m) => garde.requete.includes(`"${m.colonne}"`) && garde.requete.includes(`"${m.table}"`));
    const tableNouvelle = /no such table/i.test(String(erreur));
    if (!opts.appliquer && !nommeUneNouvelle && !tableNouvelle) laissees.push(`${garde.description} (a verifier apres l'ajout des colonnes)`);
  }
}
console.log(laissees.length === 0 ? "Ecritures laissees de cote : aucune." : `Ecritures que le SQL laissera de cote, la valeur ayant ete changee (${laissees.length}) :`);
for (const d of laissees) console.log(`  = ${d}`);

if (!opts.appliquer) {
  console.log("\nRien n'a ete ecrit. Relancer avec --appliquer pour ajouter les colonnes et passer le SQL.");
  base.fermer();
  process.exit(0);
}

for (const m of manquantes) {
  base.executer(m.sql);
  console.log(`ecrit : ${m.sql}`);
}
base.fichier(opts.sql);
console.log(`ecrit : ${opts.sql.replace(RACINE, "")}`);
const restantes = colonnesManquantes(base, graine);
// L'index d'usage des medias d'une collection dont le schema a change est
// marque perime par EmDash : sans effet pour les visiteurs, il se reconstruit
// seul ; le dire, avec la route qui le reconstruit tout de suite.
const perimes = (() => {
  try {
    return base.lire("SELECT scope_key FROM _emdash_media_usage_index_status WHERE scope_type = 'collection' AND status = 'stale'").map((r) => r.scope_key);
  } catch {
    return [];
  }
})();
base.fermer();
if (perimes.length > 0) {
  console.log(`Index d'usage des medias a reconstruire (${perimes.join(", ")}) : sans effet visible, EmDash le refait seul ;`);
  console.log(`  tout de suite : POST /_emdash/api/admin/media-usage/repair avec {"scope":"collection","collection":"<nom>"} (session d'administrateur).`);
}
if (restantes.length > 0) {
  console.error(`Colonnes encore absentes apres le passage : ${restantes.map((m) => `${m.table}.${m.colonne}`).join(", ")}`);
  process.exit(1);
}
console.log("Base au niveau de la version suivante.");
