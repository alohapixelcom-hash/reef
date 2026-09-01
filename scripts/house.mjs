#!/usr/bin/env node
// scripts/house.mjs - le linter de la maison : les quatre regles mecaniques d'AGENTS.md, verifiees.
//
// POURQUOI CE FICHIER EXISTE
//
// Quatre des conventions non negociables sont verifiables par une machine :
// le plafond de 400 lignes, l'interdiction des tirets cadratins, l'en-tete
// d'une ligne, et l'absence de noms de palette dans le markup. Elles etaient
// tenues a la main, et elles l'etaient bien : un audit exterieur du 31 aout
// 2026 a passe 324 fichiers et n'a trouve aucune violation reelle. C'est
// justement l'argument. Une discipline tenue par l'attention se tient jusqu'au
// jour ou elle ne se tient plus, et ce jour-la rien ne le dit.
//
// PAS D'ESLINT, ET C'EST UN CHOIX
//
// Le voisin le plus proche embarque treize dependances de developpement pour
// ce travail. Aucune ne connait nos regles : ni le plafond de lignes, ni le
// tiret, ni l'en-tete, ni la palette. Elles verifieraient un style de code
// que nous n'avons pas de probleme a tenir, et pas nos regles a nous. Ce
// fichier n'a aucune dependance, se lit en entier, et verifie exactement ce
// que la doctrine promet. "Astro, Tailwind, deux fontes et rien d'autre" est
// un argument de vente : il ne se paie pas en quarante paquets.
//
// LES EXEMPTIONS SONT ECRITES, PAS TOLEREES
//
// C'est la premiere vertu de ce script, avant meme d'attraper une faute :
// chaque exception vit dans la table EXEMPTIONS avec sa raison. Une exception
// qu'on ne sait plus justifier est une exception a retirer.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SKIP = new Set(["node_modules", "dist", ".git", ".astro", "public", ".vercel", ".wrangler"]);
const LINTABLE = /\.(astro|ts|tsx|mjs|js|css|md|json)$/;

/**
 * Les exemptions, nommees une par une avec leur raison.
 *
 * Regle de tenue : on ajoute une ligne ici quand on peut ecrire POURQUOI en
 * une phrase. Si la phrase ne vient pas, c'est le fichier qu'il faut corriger.
 */
const EXEMPTIONS = [
  {
    rule: "header",
    match: /(^|\/)index\.ts$/,
    why: "baril de re-export : un en-tete y serait plus long que le fichier",
  },
  {
    rule: "header",
    match: /src\/styles\/global\.css$/,
    why: "point d'entree CSS : les @import doivent venir en premier",
  },
  {
    rule: "header",
    match: /\.json$/,
    why: "JSON n'a pas de commentaires",
  },
  {
    rule: "palette",
    match: /src\/components\/ui\/button\/Button\.astro$/,
    why: "cite un nom de palette dans un COMMENTAIRE qui explique le jeton --color-scrim",
  },
  {
    rule: "palette",
    match: /three\/OceanCanvas\.astro$/,
    why: "uniformes de shader passes a THREE.Color, pas du markup",
  },
  {
    rule: "palette",
    match: /(plate|productArt)\.css$/,
    why: "table d'accords de couleur d'une illustration, sortie du composant pour que l'acheteur l'accorde a sa marque : le .astro voisin ne contient alors AUCUNE couleur",
  },
];

function exempt(rule, file) {
  return EXEMPTIONS.find((e) => e.rule === rule && e.match.test(file));
}

/* ------------------------------------------------------------------ */
/* Le parcours                                                         */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (LINTABLE.test(name)) out.push(full);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Les regles                                                          */
/* ------------------------------------------------------------------ */

const MAX_LINES = 400;

/** Regle 2 : aucun fichier au-dessus de 400 lignes. */
function checkLength(_file, text) {
  // Un fichier bien forme finit par un saut de ligne, et split("\n") rend
  // alors un dernier element vide qui n'est pas une ligne. Sans ce retrait le
  // controle comptait un de trop et accusait tout fichier de 400 lignes d'en
  // faire 401. Une regle qui se trompe d'une unite est pire qu'une regle
  // absente : elle fait couper du texte qui n'avait rien fait.
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.length > MAX_LINES ? [`${lines.length} lignes, plafond ${MAX_LINES}`] : [];
}

/**
 * Regle 3 : aucun tiret cadratin ni demi-cadratin, nulle part.
 *
 * Les caracteres sont construits depuis leur point de code, et ce n'est pas
 * une coquetterie : un linter qui ecrit en clair ce qu'il interdit se signale
 * lui-meme des sa premiere execution. Le tiret conditionnel (00AD) est de la
 * partie : invisible, il se copie sans qu'on le voie et casse une recherche
 * de texte.
 */
const DASHES = [
  [String.fromCharCode(0x2014), "tiret cadratin"],
  [String.fromCharCode(0x2013), "tiret demi-cadratin"],
  [String.fromCharCode(0x2012), "tiret numerique"],
  [String.fromCharCode(0x2015), "barre horizontale"],
  [String.fromCharCode(0x00ad), "tiret conditionnel invisible"],
];

function checkDashes(_file, text) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    for (const [ch, label] of DASHES) {
      if (line.includes(ch)) found.push(`ligne ${i + 1} : ${label}`);
    }
  });
  return found;
}

/**
 * Regle 1 : un en-tete d'une ligne en tete de chaque fichier.
 *
 * Le controle saute ce qui doit legitimement passer avant : un shebang, la
 * cloture de frontmatter d'un .astro. Un controle naif qui lit betement la
 * premiere ligne accuse les trois scripts qui commencent par `#!`, et l'audit
 * exterieur est tombe dans ce piege : le sien etait naif, pas notre code.
 */
function checkHeader(file, text) {
  const lines = text.split("\n");

  // Un fichier de contenu commence par son frontmatter YAML, et ce n'est pas
  // une tolerance : Astro exige que les trois tirets soient les tout premiers
  // caracteres du fichier. Un commentaire pose au-dessus casserait la
  // collection. Le frontmatter EST l'en-tete, il porte le titre et la date.
  if (file.endsWith(".md") && lines[0]?.trim() === "---") return [];

  let i = 0;
  if (lines[0]?.startsWith("#!")) i = 1;
  if (lines[i]?.trim() === "---") i += 1;
  while (lines[i] !== undefined && lines[i].trim() === "") i += 1;
  const head = (lines[i] ?? "").trim();
  // Un document markdown se nomme par son titre de niveau 1 : lui demander en
  // plus un commentaire HTML invisible serait une regle pour la regle. La
  // regle veut qu'un fichier dise ce qu'il est des sa premiere ligne, et un
  // "# Deploiement de la demo en ligne" le dit mieux qu'un commentaire.
  const isComment =
    head.startsWith("//") ||
    head.startsWith("/*") ||
    head.startsWith("<!--") ||
    head.startsWith("*") ||
    (file.endsWith(".md") && head.startsWith("#"));
  if (!isComment) return [`pas d'en-tete en tete (ligne ${i + 1} : ${head.slice(0, 40) || "vide"})`];
  return [];
}

/**
 * Regle 5 : aucun nom de palette ni hexa brut hors de src/styles.
 *
 * Les familles ne sont pas ecrites ici : elles sont LUES dans tokens.css. Le
 * jour ou `pnpm rebrand` renomme une famille, ce controle suit tout seul. Une
 * liste recopiee aurait menti des le premier rebranding.
 */
function paletteFamilies() {
  let css = "";
  try {
    css = readFileSync(join(ROOT, "src/styles/tokens.css"), "utf8");
  } catch {
    return [];
  }
  const names = new Set();
  for (const m of css.matchAll(/--color-([a-z]+)-\d{2,3}\b/g)) names.add(m[1]);
  return [...names];
}

const MARKUP = /src\/(components|pages|layouts)\//;

function checkPalette(file, text, families) {
  if (!MARKUP.test(file) || families.length === 0) return [];
  const found = [];
  const familyRe = new RegExp(`\\b(${families.join("|")})-\\d{2,3}\\b`, "g");
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(familyRe)) found.push(`ligne ${i + 1} : ${m[0]}`);
    // Un hexa brut dans le markup. #000 en canal alpha reste tolere : il sert
    // de couleur d'ombre, ou il n'existe aucun jeton.
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (/^#0{3,4}$/i.test(m[0])) continue;
      found.push(`ligne ${i + 1} : hexa brut ${m[0]}`);
    }
  });
  return found;
}

/**
 * Regle 6 : dans une chaine passee a tv(), la taille de texte ne se met jamais
 * AVANT une couleur de texte.
 *
 * tailwind-merge, qui tourne dans tv(), ne connait pas nos noms d'echelle :
 * il range "text-display-sm" et "text-foreground" dans le meme groupe et ne
 * garde que le DERNIER. Une taille ecrite avant la couleur disparait donc du
 * rendu, et le titre retombe a la taille heritee sous son point de bascule.
 * Le 31 aout 2026, quatre themes servaient ainsi un titre de page a 16 px sur
 * telephone, avec la bonne classe dans le source.
 *
 * Le controle ne regarde que les valeurs de PROPRIETE (`slot: "..."`), qui
 * sont la forme des emplacements de tv(). Un attribut class= ordinaire ne
 * passe pas par la fusion et n'a pas ce probleme.
 */
function checkMergeOrder(file, text) {
  if (!file.endsWith(".astro") || !text.includes("tv(")) return [];
  const found = [];
  text.split("\n").forEach((line, i) => {
    if (!/^\s*[a-z][\w]*:\s*["[]/.test(line)) return;
    for (const m of line.matchAll(/"([^"]*text-display-[^"]*)"/g)) {
      const value = m[1];
      const size = value.match(/(^|\s)text-display-[a-z]+/);
      if (!size) continue;
      const after = value.slice(value.indexOf(size[0]) + size[0].length);
      const colour = after.match(/\stext-(?!display-)[a-z][\w/-]*/);
      if (colour) {
        found.push(`ligne ${i + 1} : "${size[0].trim()}" est ecrit avant "${colour[0].trim()}", tailwind-merge supprimera le premier`);
      }
    }
  });
  return found;
}

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

const RULES = [
  { key: "header", label: "en-tete d'une ligne", run: checkHeader },
  { key: "length", label: "400 lignes maximum", run: checkLength },
  { key: "dash", label: "aucun tiret cadratin", run: checkDashes },
  { key: "palette", label: "aucune palette dans le markup", run: checkPalette },
  { key: "merge", label: "taille avant couleur dans tv()", run: checkMergeOrder },
];

const families = paletteFamilies();
const files = walk(ROOT);
const violations = [];
const skipped = [];

for (const full of files) {
  const file = relative(ROOT, full);
  const text = readFileSync(full, "utf8");
  for (const rule of RULES) {
    const waiver = exempt(rule.key, file);
    if (waiver) {
      skipped.push({ file, rule: rule.key, why: waiver.why });
      continue;
    }
    for (const detail of rule.run(file, text, families)) {
      violations.push({ file, rule: rule.label, detail });
    }
  }
}

console.log(`Regles de la maison : ${files.length} fichiers, ${RULES.length} regles.`);
if (families.length) console.log(`Familles de palette lues dans tokens.css : ${families.join(", ")}`);

if (skipped.length) {
  console.log(`\n${skipped.length} exemption(s) declaree(s) :`);
  for (const s of skipped) console.log(`  ${s.file} [${s.rule}] : ${s.why}`);
}

if (violations.length === 0) {
  console.log("\nAucune violation.");
  process.exit(0);
}

console.error(`\n${violations.length} violation(s) :`);
for (const v of violations) console.error(`  ${v.file} [${v.rule}] ${v.detail}`);
process.exit(1);
