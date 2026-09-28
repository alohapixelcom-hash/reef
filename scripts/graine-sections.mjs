// scripts/graine-sections.mjs - recopie dans seed/seed.json ce que les fichiers affichent (les textes des pages, l'entree "site" de chaque langue, les sujets, les auteurs, les menus et les reglages), dans les deux langues, et range la graine une ligne par champ et par entree.
//
// POURQUOI UN SCRIPT : la graine doit dire EXACTEMENT ce que disent le
// dictionnaire de src/i18n, src/config et src/data, sinon allumer le moteur
// changerait le site. Le recopier a la main, c'est garantir un ecart. Les
// self-checks (pnpm test) echouent des qu'un texte des fichiers change sans
// que la graine suive ; ce script la remet d'accord.
//
//   node scripts/graine-sections.mjs            reecrit seed/seed.json
//   node scripts/graine-sections.mjs --verifier  echoue si la graine n'est pas a jour
//
// Ce qui est ecrit ici : le contenu des collections `sections`, `site`,
// `sujets` et `auteurs`, les menus natifs (`menus`) et le nom du site
// (`settings.title`). Le schema (collections, champs, taxonomies) reste
// redige a la main dans la graine. Les billets, eux, sont verses par l'API
// (scripts/moteur-import.mjs).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { SECTIONS, extraireLaSection } from "../src/moteur/contenu.ts";
import { couleurDeLaTeinte } from "../src/moteur/listes.ts";
import { menusDeLaGraine } from "../src/moteur/menus.ts";
import { entreeDuSite, reglagesDeLaGraine } from "../src/moteur/site.ts";
import { chargerLesTextes } from "../src/moteur/textes.node.mjs";

const FICHIER = new URL("../seed/seed.json", import.meta.url);
const DONNEES = new URL("../src/data/", import.meta.url);
const LANGUE_SOURCE = "en";

const textes = await chargerLesTextes();
// L'adaptateur du theme lit ses fichiers par des alias : il se charge apres le crochet que chargerLesTextes pose.
const { MENUS, repliDuSite, routesDesMenus } = await import("../src/moteur/theme.ts");
const { default: siteData } = await import("../src/config/siteData.json.ts");
const langues = [LANGUE_SOURCE, ...Object.keys(textes).filter((l) => l !== LANGUE_SOURCE)];

/** Une entree de la graine : la langue source d'abord, la traduction rattachee sous le meme identifiant. */
const entree = (collection, slug, locale, data) => ({
  id: `${collection}-${slug}-${locale}`,
  slug,
  locale,
  ...(locale === LANGUE_SOURCE ? {} : { translationOf: `${collection}-${slug}-${LANGUE_SOURCE}` }),
  status: "published",
  data,
});

/** Les fiches JSON d'un dossier de src/data (topics, authors), par langue : [slug, donnees]. */
const fiches = (dossier, locale) =>
  readdirSync(new URL(`${dossier}/${locale}/`, DONNEES))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(new URL(`${dossier}/${locale}/${f}`, DONNEES), "utf8"))]);

/** Les entrees de la collection `sections` : chaque section dans la langue source, puis sa traduction rattachee. */
export function entreesDesSections() {
  return SECTIONS.flatMap((section) => langues.map((l) => entree("sections", section.slug, l, extraireLaSection(section, textes[l]))));
}

/**
 * L'entree "site" de chaque langue : l'identite que les fichiers affichent. La
 * description anglaise est celle de siteData ; le francais n'en a pas dans les
 * fichiers (aucune page ne l'affiche), il recoit celle de son accueil. Le
 * titre du flux RSS est celui de siteData, par langue.
 */
export function entreesDuSite() {
  return langues.map((l) => {
    const description = l === LANGUE_SOURCE ? repliDuSite(l).description : textes[l].home.metaDescription;
    return entree("site", "site", l, { ...entreeDuSite(repliDuSite(l), description), feed_title: siteData.title[l] });
  });
}

/** Les sujets de src/data/topics, dans chaque langue. */
export function entreesDesSujets() {
  return fiches("topics", LANGUE_SOURCE).flatMap(([slug]) =>
    langues.map((l) => {
      const fiche = Object.fromEntries(fiches("topics", l))[slug];
      return entree("sujets", slug, l, { name: fiche.name, description: fiche.description, color: couleurDeLaTeinte(fiche.accent), order: fiche.order ?? 0 });
    }),
  );
}

/** Les auteurs de src/data/authors, dans chaque langue (aucun n'a de portrait ni de lien dans les fichiers). */
export function entreesDesAuteurs() {
  return fiches("authors", LANGUE_SOURCE).flatMap(([slug]) =>
    langues.map((l) => {
      const fiche = Object.fromEntries(fiches("authors", l))[slug];
      return entree("auteurs", slug, l, { name: fiche.name, role: fiche.role, bio: fiche.bio, ...(fiche.links?.length ? { links: fiche.links } : {}) });
    }),
  );
}

/** Les menus natifs, calcules depuis la table du theme (theme.ts, MENUS), dans chaque langue. */
export function menus() {
  const lire = (t) => (chemin) => chemin.split(".").reduce((o, k) => o?.[k], t);
  return langues.flatMap((l) => menusDeLaGraine(MENUS, l, LANGUE_SOURCE, lire(textes[l]), routesDesMenus(l)));
}

const ligne = (valeur) => JSON.stringify(valeur);

/** Une liste, un element par ligne, au retrait donne. */
const liste = (elements, retrait) =>
  elements.length === 0 ? "[]" : `[\n${elements.map((e) => `${retrait}  ${e}`).join(",\n")}\n${retrait}]`;

/** Une collection : ses cles une par ligne, ses champs un par ligne. */
function collection(c) {
  const cles = Object.entries(c).map(([cle, valeur]) =>
    cle === "fields" ? `      "fields": ${liste(valeur.map(ligne), "      ")}` : `      ${ligne(cle)}: ${ligne(valeur)}`,
  );
  return `{\n${cles.join(",\n")}\n    }`;
}

/** La graine entiere, rangee pour rester lisible et sous le plafond de lignes de la maison. */
export function mettreEnForme(graine) {
  const cles = Object.entries(graine).map(([cle, valeur]) => {
    if (cle === "collections") return `  "collections": ${liste(valeur.map(collection), "  ")}`;
    if (cle === "content") {
      const parCollection = Object.entries(valeur).map(
        ([nom, entrees]) => `    ${ligne(nom)}: ${liste(entrees.map(ligne), "    ")}`,
      );
      return parCollection.length === 0 ? `  "content": {}` : `  "content": {\n${parCollection.join(",\n")}\n  }`;
    }
    if (Array.isArray(valeur)) return `  ${ligne(cle)}: ${liste(valeur.map(ligne), "  ")}`;
    return `  ${ligne(cle)}: ${ligne(valeur)}`;
  });
  return `{\n${cles.join(",\n")}\n}\n`;
}

const actuelle = readFileSync(FICHIER, "utf8");
const graine = JSON.parse(actuelle);
graine.settings = { ...graine.settings, ...reglagesDeLaGraine(repliDuSite(LANGUE_SOURCE)) };
graine.content = {
  ...graine.content,
  sections: entreesDesSections(),
  site: entreesDuSite(),
  sujets: entreesDesSujets(),
  auteurs: entreesDesAuteurs(),
};
graine.menus = menus();
const attendue = mettreEnForme(graine);

if (process.argv.includes("--verifier")) {
  if (attendue !== actuelle) {
    console.error("seed/seed.json n'est pas a jour : lancer node scripts/graine-sections.mjs");
    process.exit(1);
  }
  console.log("seed/seed.json est a jour.");
} else {
  writeFileSync(FICHIER, attendue);
  const c = graine.content;
  console.log(`seed/seed.json : ${c.sections.length} sections, ${c.site.length} entrees site, ${c.sujets.length} sujets, ${c.auteurs.length} auteurs, ${graine.menus.length} menus.`);
}
