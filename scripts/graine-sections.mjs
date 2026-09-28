// scripts/graine-sections.mjs - recopie dans seed/seed.json les textes rediges des fichiers (collection `sections`), dans les deux langues, et range la graine une ligne par champ et par entree.
//
// POURQUOI UN SCRIPT : la graine doit dire EXACTEMENT ce que disent le
// dictionnaire de src/i18n et src/config/legalData.json.ts, sinon allumer le
// moteur changerait le site. Le recopier a la main, c'est garantir un ecart.
// src/moteur/contenu.selfcheck.ts (pnpm test) echoue des qu'un texte des
// fichiers change sans que la graine suive ; ce script la remet d'accord.
//
//   node scripts/graine-sections.mjs            reecrit seed/seed.json
//   node scripts/graine-sections.mjs --verifier  echoue si la graine n'est pas a jour
//
// Seul le contenu de `sections` est ecrit ici. Le schema (collections, champs,
// taxonomies) reste redige a la main dans la graine.
import { readFileSync, writeFileSync } from "node:fs";
import { SECTIONS, extraireLaSection } from "../src/moteur/contenu.ts";
import { chargerLesTextes } from "../src/moteur/textes.node.mjs";

const FICHIER = new URL("../seed/seed.json", import.meta.url);
const LANGUE_SOURCE = "en";

/** Les entrees de la collection `sections` : chaque section dans la langue source, puis sa traduction rattachee. */
export async function entreesDeLaGraine() {
  const textes = await chargerLesTextes();
  const langues = [LANGUE_SOURCE, ...Object.keys(textes).filter((l) => l !== LANGUE_SOURCE)];
  const entrees = [];
  for (const section of SECTIONS) {
    for (const locale of langues) {
      entrees.push({
        id: `sections-${section.slug}-${locale}`,
        slug: section.slug,
        locale,
        ...(locale === LANGUE_SOURCE ? {} : { translationOf: `sections-${section.slug}-${LANGUE_SOURCE}` }),
        status: "published",
        data: extraireLaSection(section, textes[locale]),
      });
    }
  }
  return entrees;
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
graine.content = { ...graine.content, sections: await entreesDeLaGraine() };
const attendue = mettreEnForme(graine);

if (process.argv.includes("--verifier")) {
  if (attendue !== actuelle) {
    console.error("seed/seed.json n'est pas a jour : lancer node scripts/graine-sections.mjs");
    process.exit(1);
  }
  console.log("seed/seed.json est a jour.");
} else {
  writeFileSync(FICHIER, attendue);
  console.log(`seed/seed.json : ${graine.content.sections.length} entrees de sections.`);
}
