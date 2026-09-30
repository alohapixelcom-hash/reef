#!/usr/bin/env node
// scripts/socle.mjs - embarque le socle Aloha Pixel dans un depot (sync), dit ce qui a derive (check), montre l'ecart (diff).
//
// LE PRINCIPE. Le socle est VENDORISE : ses fichiers sont copies dans le depot
// cible, aux chemins que ce depot utilise deja (src/moteur/..., scripts/...),
// et le depot reste autonome (un theme vendu est un zip qui se construit sans
// reseau ni dependance vers ce depot). Ce qui appartient au socle dans la
// cible est liste dans socle.lock.json, avec l'empreinte de chaque fichier.
// On corrige dans le socle et on synchronise partout, jamais l'inverse :
// check signale toute retouche faite dans la cible.
//
// LES COMMANDES (depuis le depot du socle)
//   node scripts/socle.mjs sync <cible> [--depot <nom>] [--essai] [--ecraser] [--appliquer] [--seulement <unite,unite>]
//   node scripts/socle.mjs check <cible>
//   node scripts/socle.mjs diff <cible> [chemin]
//   node scripts/socle.mjs modules
//
// LA COPIE DANS LE SITE. Ce fichier est lui-meme pose par sync dans chaque
// cible (scripts/socle.mjs, module obligatoire "socle"). La, sans manifeste a
// cote, il ne sait faire qu'une chose : `node scripts/socle.mjs check`, le
// controle autonome branche dans `pnpm test` (chaque fichier du verrou est
// present et porte l'empreinte posee, le verrou correspond a l'adaptateur).
// Il marche donc dans un zip vendu, sans reseau ni depot du socle.
//
// <cible> est le dossier du projet Astro (la racine d'un theme, site/ pour
// alohapixel.com, backoffice/ ou site/ pour la boutique). Son adaptateur,
// socle.adaptateur.json, dit quels modules il embarque, ce qu'il en exclut,
// ou vont les fichiers si ses chemins different, et ses parametres. Au premier
// sync, l'adaptateur et les fichiers du site viennent de adaptateurs/<depot>/ ;
// ensuite ils appartiennent au site et le socle ne les reecrit plus.
//
// CE QUE sync NE FAIT JAMAIS : supprimer sans --appliquer (et seulement un
// fichier qu'il avait pose et que le socle ne porte plus) ; ecraser sans
// --ecraser une retouche locale (elle remonte d'abord au socle) ; toucher un
// fichier du site qui existe deja (adaptateur, habillage.site.ts, site.ts...).
//
// --seulement <unites> : poser un module urgent dans un site en retard
// d'une version sans toute la montee. Seuls ces fichiers sont poses et ajoutes
// au verrou existant, l'unite est notee dans "partiels" ; version, commit et
// autres empreintes ne bougent pas. Refus sans verrou (adoption complete).
//
// Codes de sortie : 0 tout va bien, 1 derive ou refus, 2 mauvais usage.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOCLE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Dans le depot du socle, le manifeste est a cote ; dans un site, il n'y est pas.
const DANS_LE_SOCLE = existsSync(join(SOCLE, "socle.manifeste.json"));
const MANIFESTE = DANS_LE_SOCLE ? JSON.parse(readFileSync(join(SOCLE, "socle.manifeste.json"), "utf8")) : null;
const VERROU = "socle.lock.json";
const ADAPTATEUR = "socle.adaptateur.json";

const empreinte = (contenu) => createHash("sha256").update(contenu).digest("hex");
const lireJson = (chemin) => JSON.parse(readFileSync(chemin, "utf8"));
/**
 * Le verrou, compact : une ligne par fichier. Indente en entier, il passait
 * les 400 lignes des 93 fichiers et `pnpm lint:house` le refusait (Nalu).
 * Il reste du JSON ordinaire, lu par n'importe quelle version de l'outil.
 */
function ecrireVerrou(chemin, verrou) {
  const { fichiers, ...tete } = verrou;
  const lignes = Object.entries(tete).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  const entrees = Object.entries(fichiers).map(([k, v], i, t) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}${i < t.length - 1 ? "," : ""}`);
  writeFileSync(chemin, `{\n${lignes.join("\n")}\n  "fichiers": {\n${entrees.join("\n")}\n  }\n}\n`);
}

function arreter(message, code = 2) {
  console.error(message);
  process.exit(code);
}

function commitDuSocle() {
  const r = spawnSync("git", ["-C", SOCLE, "rev-parse", "--short=12", "HEAD"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const sale = spawnSync("git", ["-C", SOCLE, "status", "--porcelain"], { encoding: "utf8" }).stdout.trim() !== "";
  return `${r.stdout.trim()}${sale ? "+modifie" : ""}`;
}

/** Le chemin d'un fichier du socle dans la cible : table exacte, puis prefixe le plus long. */
function cheminCible(chemin, table = {}) {
  if (table[chemin]) return table[chemin];
  const prefixes = Object.keys(table)
    .filter((p) => p.endsWith("/") && chemin.startsWith(p))
    .sort((a, b) => b.length - a.length);
  return prefixes.length > 0 ? table[prefixes[0]] + chemin.slice(prefixes[0].length) : chemin;
}

/**
 * Le contenu que la cible doit porter. Une seule transformation : quand le
 * fichier change de chemin, la premiere ligne, qui nomme le fichier (regle de
 * la maison), nomme le chemin de la cible. Le code, lui, n'est jamais reecrit.
 */
function rendu(contenu, source, cible) {
  if (source === cible) return contenu;
  const texte = contenu.toString("utf8");
  const fin = texte.indexOf("\n");
  const premiere = fin < 0 ? texte : texte.slice(0, fin);
  if (!premiere.includes(source)) return contenu;
  return Buffer.from(premiere.replace(source, cible) + (fin < 0 ? "" : texte.slice(fin)), "utf8");
}

function trouverAdaptateur(cible, depot) {
  const local = join(cible, ADAPTATEUR);
  if (existsSync(local)) return { adaptateur: lireJson(local), depot: lireJson(local).depot, local: true };
  const nom = depot ?? basename(resolve(cible));
  const modele = join(SOCLE, "adaptateurs", nom, ADAPTATEUR);
  if (!existsSync(modele)) {
    arreter(`Aucun adaptateur : ni ${local}, ni adaptateurs/${nom}/. Passer --depot <nom> (voir adaptateurs/).`);
  }
  return { adaptateur: lireJson(modele), depot: nom, local: false };
}

/** Ce que le socle doit poser dans la cible : [{ source, cible, contenu }]. */
function plan(adaptateur) {
  const exclus = new Set(adaptateur.exclus ?? []);
  const fichiers = [];
  const duSite = [];
  // Les modules obligatoires (l'outil lui-meme) sont poses partout, sans etre demandes.
  const obligatoires = Object.entries(MANIFESTE.modules)
    .filter(([nom, u]) => u.obligatoire && !(adaptateur.modules ?? []).includes(nom))
    .map(([nom, u]) => ["module", nom, u]);
  const unites = [
    ...obligatoires,
    ...(adaptateur.modules ?? []).map((nom) => ["module", nom, MANIFESTE.modules[nom]]),
    ...(adaptateur.extensions ?? []).map((nom) => ["extension", nom, MANIFESTE.extensions[nom]]),
  ];
  for (const [sorte, nom, unite] of unites) {
    if (!unite) arreter(`${sorte} inconnu dans l'adaptateur : ${nom}`);
    for (const requis of unite.requiert ?? []) {
      if (!(adaptateur.modules ?? []).includes(requis)) arreter(`l'extension ${nom} demande le module ${requis}`);
    }
    for (const chemin of unite.fichiers) {
      if (exclus.has(chemin)) continue;
      const source = join(unite.racine, chemin);
      const vers = cheminCible(chemin, adaptateur.chemins);
      fichiers.push({ unite: nom, source, cible: vers, contenu: rendu(readFileSync(join(SOCLE, source)), chemin, vers) });
    }
    for (const chemin of unite.fichiersDuSite ?? []) duSite.push({ unite: nom, chemin: cheminCible(chemin, adaptateur.chemins) });
  }
  return { fichiers, duSite };
}

function etatDe(cible, attendu, verrou) {
  const chemin = join(cible, attendu.cible);
  if (!existsSync(chemin)) return "manquant";
  const actuel = empreinte(readFileSync(chemin));
  if (actuel === empreinte(attendu.contenu)) return "a-jour";
  const pose = verrou?.fichiers?.[attendu.cible]?.sha256;
  if (pose && actuel !== pose) return "retouche";
  return "en-retard";
}

function sync(cible, options) {
  if (!existsSync(cible)) arreter(`cible introuvable : ${cible}`);
  const { adaptateur, depot, local } = trouverAdaptateur(cible, options.depot);
  const verrouChemin = join(cible, VERROU);
  const verrou = existsSync(verrouChemin) ? lireJson(verrouChemin) : null;
  const complet = plan(adaptateur);
  const seulement = options.seulement ? options.seulement.split(",").filter(Boolean) : null;
  if (seulement) {
    if (!verrou) arreter("--seulement demande un verrou : une premiere adoption est toujours complete.");
    const connues = new Set([...complet.fichiers, ...complet.duSite].map((x) => x.unite));
    for (const u of seulement) if (!connues.has(u)) arreter(`--seulement ${u} : unite absente de l'adaptateur (l'y ajouter d'abord).`);
  }
  const garde = (x) => !seulement || seulement.includes(x.unite);
  const fichiers = complet.fichiers.filter(garde);
  const duSite = complet.duSite.filter(garde).map((d) => d.chemin);
  const retouches = fichiers.filter((f) => etatDe(cible, f, verrou) === "retouche");
  if (retouches.length > 0 && !options.ecraser) {
    console.error("Refus : ces fichiers du socle ont ete retouches dans la cible depuis le dernier sync.");
    for (const f of retouches) console.error(`  ${f.cible}`);
    console.error("La correction se fait dans le socle (voir `diff`), puis on synchronise. --ecraser passe outre.");
    process.exit(1);
  }
  // Un fichier du site au nom d'un fichier nouveau du socle, hors verrou et
  // different (adresses.selfcheck.ts de Swell) : refus, sauf --ecraser.
  const etranger = (f) => !verrou.fichiers?.[f.cible] && existsSync(join(cible, f.cible)) && etatDe(cible, f, verrou) !== "a-jour";
  const etrangers = verrou ? fichiers.filter(etranger) : [];
  if (etrangers.length > 0 && !options.ecraser) {
    console.error("Refus : ces fichiers du site portent le nom d'un fichier du socle, sans avoir ete poses par lui.");
    for (const f of etrangers) console.error(`  ${f.cible}`);
    console.error("Renommer le fichier du socle (ou celui du site), puis synchroniser. --ecraser les remplace.");
    process.exit(1);
  }
  const bilan = { ecrits: [], identiques: [], ajoutes: [], duSite: [], orphelins: [], supprimes: [] };
  const ecrire = (chemin, contenu) => {
    if (options.essai) return;
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, contenu);
  };
  if (!local) {
    bilan.duSite.push(ADAPTATEUR);
    ecrire(join(cible, ADAPTATEUR), readFileSync(join(SOCLE, "adaptateurs", depot, ADAPTATEUR)));
  }
  for (const chemin of duSite) {
    if (existsSync(join(cible, chemin))) continue;
    const modele = join(SOCLE, "adaptateurs", depot, chemin);
    if (!existsSync(modele)) arreter(`fichier du site absent de la cible et de adaptateurs/${depot}/ : ${chemin}`);
    bilan.duSite.push(chemin);
    ecrire(join(cible, chemin), readFileSync(modele));
  }
  for (const f of fichiers) {
    const chemin = join(cible, f.cible);
    if (!existsSync(chemin)) bilan.ajoutes.push(f.cible);
    else if (empreinte(readFileSync(chemin)) === empreinte(f.contenu)) {
      bilan.identiques.push(f.cible);
      continue;
    } else bilan.ecrits.push(f.cible);
    ecrire(chemin, f.contenu);
  }
  const nouveaux = new Set(fichiers.map((f) => f.cible));
  for (const ancien of seulement ? [] : Object.keys(verrou?.fichiers ?? {})) {
    if (nouveaux.has(ancien) || !existsSync(join(cible, ancien))) continue;
    if (options.appliquer && !options.essai) {
      unlinkSync(join(cible, ancien));
      bilan.supprimes.push(ancien);
    } else bilan.orphelins.push(ancien);
  }
  const nouveauVerrou = {
    socle: MANIFESTE.nom,
    version: MANIFESTE.version,
    commit: commitDuSocle(),
    depot,
    modules: adaptateur.modules ?? [],
    extensions: adaptateur.extensions ?? [],
    fichiersDuSite: [ADAPTATEUR, ...duSite],
    fichiers: Object.fromEntries(fichiers.map((f) => [f.cible, { source: f.source, sha256: empreinte(f.contenu) }])),
  };
  if (seulement) {
    // Le verrou existant, plus les fichiers des unites posees : rien d'autre ne change.
    nouveauVerrou.version = verrou.version;
    nouveauVerrou.commit = verrou.commit;
    nouveauVerrou.fichiersDuSite = [...new Set([...(verrou.fichiersDuSite ?? []), ...nouveauVerrou.fichiersDuSite])];
    const partiels = { ...(verrou.partiels ?? {}) };
    for (const u of seulement) partiels[u] = `${MANIFESTE.version} (${commitDuSocle() ?? "hors git"})`;
    nouveauVerrou.partiels = partiels;
    nouveauVerrou.fichiers = { ...(verrou.fichiers ?? {}), ...nouveauVerrou.fichiers };
  }
  // Une ligne par fichier, dans l'ordre des chemins (une montee complete efface "partiels").
  const trie = Object.keys(nouveauVerrou.fichiers).sort((a, b) => a.localeCompare(b));
  nouveauVerrou.fichiers = Object.fromEntries(trie.map((k) => [k, nouveauVerrou.fichiers[k]]));
  if (!options.essai) ecrireVerrou(verrouChemin, nouveauVerrou);
  const titre = options.essai ? "Essai (rien n'est ecrit)" : "Synchronise";
  console.log(`${titre} : socle ${MANIFESTE.version} vers ${cible} (${depot})${seulement ? `, seulement ${seulement.join(", ")}` : ""}.`);
  console.log(`  ${bilan.identiques.length} fichiers deja identiques, ${bilan.ecrits.length} remplaces, ${bilan.ajoutes.length} ajoutes.`);
  for (const [nom, liste] of [
    ["remplaces", bilan.ecrits],
    ["ajoutes", bilan.ajoutes],
    ["fichiers du site poses (ils appartiennent au site desormais)", bilan.duSite],
    ["supprimes (--appliquer)", bilan.supprimes],
    ["orphelins (sortis du socle, gardes ; --appliquer les supprime)", bilan.orphelins],
  ]) {
    if (liste.length === 0) continue;
    console.log(`  ${nom} :`);
    for (const chemin of liste) console.log(`    ${chemin}`);
  }
  if (!options.essai) console.log(`  verrou : ${VERROU} (${fichiers.length} fichiers du socle).`);
}

function check(cible) {
  const verrouChemin = join(cible, VERROU);
  if (!existsSync(verrouChemin)) arreter(`pas de ${VERROU} dans ${cible} : le socle n'y a jamais ete synchronise.`, 1);
  const verrou = lireJson(verrouChemin);
  if (!existsSync(join(cible, ADAPTATEUR))) arreter(`pas de ${ADAPTATEUR} dans ${cible}.`, 1);
  const { fichiers } = plan(lireJson(join(cible, ADAPTATEUR)));
  const etats = { "a-jour": [], retouche: [], "en-retard": [], manquant: [] };
  for (const f of fichiers) etats[etatDe(cible, f, verrou)].push(f.cible);
  const attendus = new Set(fichiers.map((f) => f.cible));
  const orphelins = Object.keys(verrou.fichiers ?? {}).filter((c) => !attendus.has(c) && existsSync(join(cible, c)));
  // Le verrou doit dire la verite : meme version, et l'empreinte de ce que le socle pose.
  const verrouFaux = fichiers.filter((f) => verrou.fichiers?.[f.cible]?.sha256 !== empreinte(f.contenu)).map((f) => f.cible);
  if (verrou.version !== MANIFESTE.version) verrouFaux.unshift(`(version du verrou ${verrou.version}, socle ${MANIFESTE.version})`);
  console.log(`Socle ${MANIFESTE.version} (${commitDuSocle() ?? "hors git"}) face a ${cible}, synchronise en ${verrou.version} (${verrou.commit ?? "hors git"}).`);
  console.log(`  ${etats["a-jour"].length} a jour, ${etats.retouche.length} retouches dans la cible, ${etats["en-retard"].length} en retard sur le socle, ${etats.manquant.length} manquants, ${orphelins.length} orphelins.`);
  const libelles = {
    retouche: "retouches dans la cible (a remonter dans le socle, jamais l'inverse)",
    "en-retard": "en retard sur le socle (un sync les met a jour)",
    manquant: "manquants",
  };
  for (const [etat, libelle] of Object.entries(libelles)) {
    if (etats[etat].length === 0) continue;
    console.log(`  ${libelle} :`);
    for (const chemin of etats[etat]) console.log(`    ${chemin}`);
  }
  if (orphelins.length > 0) {
    console.log("  orphelins (poses par le socle, qui ne les porte plus) :");
    for (const chemin of orphelins) console.log(`    ${chemin}`);
  }
  if (verrouFaux.length > 0) {
    console.log(`  ${VERROU} ne correspond pas au socle (un sync le reecrit) :`);
    for (const chemin of verrouFaux) console.log(`    ${chemin}`);
  }
  const propre = etats.retouche.length + etats["en-retard"].length + etats.manquant.length + orphelins.length + verrouFaux.length === 0;
  process.exit(propre ? 0 : 1);
}

/**
 * Le controle d'une copie du socle, sans le socle : ce que lance `pnpm test`
 * dans un site. Il refuse un fichier du verrou absent ou retouche, un verrou
 * qui ne correspond pas a l'adaptateur, un fichier du site manquant.
 */
function checkAutonome(cible) {
  const defauts = [];
  const verrouChemin = join(cible, VERROU);
  if (!existsSync(verrouChemin)) arreter(`pas de ${VERROU} dans ${cible} : le socle n'y a jamais ete synchronise.`, 1);
  if (!existsSync(join(cible, ADAPTATEUR))) arreter(`pas de ${ADAPTATEUR} dans ${cible}.`, 1);
  const verrou = lireJson(verrouChemin);
  const adaptateur = lireJson(join(cible, ADAPTATEUR));
  const memes = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (verrou.depot !== adaptateur.depot) defauts.push(`le verrou est celui de ${verrou.depot}, l'adaptateur celui de ${adaptateur.depot}`);
  if (!memes(verrou.modules, adaptateur.modules)) defauts.push("les modules du verrou ne sont pas ceux de l'adaptateur (relancer sync)");
  if (!memes(verrou.extensions, adaptateur.extensions)) defauts.push("les extensions du verrou ne sont pas celles de l'adaptateur (relancer sync)");
  const fichiers = Object.entries(verrou.fichiers ?? {});
  if (!verrou.fichiers?.["scripts/socle.mjs"]) defauts.push("le verrou ne liste pas scripts/socle.mjs");
  for (const [chemin, { sha256 }] of fichiers) {
    const complet = join(cible, chemin);
    if (!existsSync(complet)) defauts.push(`manquant : ${chemin}`);
    else if (empreinte(readFileSync(complet)) !== sha256) defauts.push(`retouche dans le site (a faire dans le socle, puis sync) : ${chemin}`);
  }
  for (const chemin of verrou.fichiersDuSite ?? []) {
    if (!existsSync(join(cible, chemin))) defauts.push(`fichier du site manquant : ${chemin}`);
  }
  console.log(`socle ${verrou.version} (${verrou.commit ?? "hors git"}) : ${fichiers.length} fichiers du verrou controles, ${defauts.length} defaut(s).`);
  for (const d of defauts) console.log(`  ${d}`);
  process.exit(defauts.length === 0 ? 0 : 1);
}

function diff(cible, filtre) {
  if (!existsSync(join(cible, ADAPTATEUR))) arreter(`pas de ${ADAPTATEUR} dans ${cible}.`, 1);
  const { fichiers } = plan(lireJson(join(cible, ADAPTATEUR)));
  const dossier = mkdtempSync(join(tmpdir(), "socle-"));
  let ecarts = 0;
  try {
    for (const f of fichiers) {
      if (filtre && !f.cible.includes(filtre)) continue;
      const chemin = join(cible, f.cible);
      const actuel = existsSync(chemin) ? readFileSync(chemin) : Buffer.alloc(0);
      if (empreinte(actuel) === empreinte(f.contenu)) continue;
      ecarts += 1;
      const attendu = join(dossier, "attendu");
      writeFileSync(attendu, f.contenu);
      const r = spawnSync("diff", ["-u", "--label", `socle/${f.source}`, "--label", `cible/${f.cible}`, attendu, existsSync(chemin) ? chemin : "/dev/null"], {
        encoding: "utf8",
      });
      process.stdout.write(r.stdout || `--- socle/${f.source}\n+++ cible/${f.cible}\n(contenus differents)\n`);
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
  console.log(ecarts === 0 ? "Aucun ecart." : `${ecarts} fichiers different du socle (- socle, + cible).`);
  process.exit(ecarts === 0 ? 0 : 1);
}

function modules() {
  console.log(`Socle ${MANIFESTE.version}`);
  for (const [sorte, table] of [
    ["module", MANIFESTE.modules],
    ["extension", MANIFESTE.extensions],
  ]) {
    for (const [nom, u] of Object.entries(table)) {
      console.log(`  ${sorte} ${nom} (${u.fichiers.length} fichiers${u.etat ? `, ${u.etat}` : ""}) : ${u.role}`);
    }
  }
}

const [commande, cible, ...reste] = process.argv.slice(2);
if (!DANS_LE_SOCLE) {
  // Copie posee dans un site : seul le controle autonome a un sens ici.
  if (commande === "check") checkAutonome(resolve(cible ?? "."));
  arreter("Ici, seul `node scripts/socle.mjs check` existe. sync, diff et modules se lancent depuis le depot aloha-socle : node <aloha-socle>/scripts/socle.mjs sync <ce dossier>.");
}
const drapeau = (nom) => reste.includes(nom);
const valeur = (nom) => {
  const i = reste.indexOf(nom);
  return i >= 0 ? reste[i + 1] : undefined;
};
switch (commande) {
  case "sync":
    if (!cible) arreter("usage : socle.mjs sync <cible> [--depot <nom>] [--essai] [--ecraser] [--appliquer] [--seulement <unite,unite>]");
    const options = { depot: valeur("--depot"), essai: drapeau("--essai"), ecraser: drapeau("--ecraser"), appliquer: drapeau("--appliquer") };
    sync(resolve(cible), { ...options, seulement: valeur("--seulement") });
    break;
  case "check":
    if (!cible) arreter("usage : socle.mjs check <cible>");
    check(resolve(cible));
    break;
  case "diff":
    if (!cible) arreter("usage : socle.mjs diff <cible> [chemin]");
    diff(resolve(cible), reste.find((r) => !r.startsWith("-")));
    break;
  case "modules":
    modules();
    break;
  default:
    arreter("usage : socle.mjs sync|check|diff <cible> ... ou socle.mjs modules (voir l'en-tete du fichier)");
}
