// src/moteur/resolution.node.mjs - crochet de resolution pour Node : les alias de tsconfig.json et les imports sans extension trouvent leur fichier .ts (voir textes.node.mjs).
//
// POURQUOI LES ALIAS SONT LUS DANS tsconfig.json. alohapixel.com avait ajoute
// ses alias a ce crochet, ecrits en dur ; les themes, eux, n'en avaient
// aucun, et un import "@i18n" charge par Node y echouait. Les alias sont ceux
// de tsconfig.json, que Vite et `astro check` lisent deja : les relire ici
// donne a Node la meme table, sans liste a tenir a jour dans chaque depot.
// Un alias exact ("@moteur/source") passe avant un alias a joker ("@moteur/*"),
// comme chez TypeScript ; un tsconfig.json illisible laisse la table vide.
import { readFileSync, statSync } from "node:fs";

const RACINE = new URL("../../", import.meta.url);

// Retire les commentaires et les virgules finales qu'accepte tsconfig.json,
// sans toucher a ce qui est entre guillemets (une adresse porte des "//").
function jsonTolerant(texte) {
  let sortie = "";
  let chaine = false;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (chaine) {
      sortie += c;
      if (c === "\\") sortie += texte[++i] ?? "";
      else if (c === '"') chaine = false;
    } else if (c === '"') {
      chaine = true;
      sortie += c;
    } else if (c === "/" && texte[i + 1] === "/") {
      while (i < texte.length && texte[i] !== "\n") i += 1;
      sortie += "\n";
    } else if (c === "/" && texte[i + 1] === "*") {
      i = texte.indexOf("*/", i + 2);
      if (i < 0) break;
      i += 1;
    } else sortie += c;
  }
  return JSON.parse(sortie.replace(/,(\s*[}\]])/g, "$1"));
}

function lireLesAlias() {
  try {
    const options = jsonTolerant(readFileSync(new URL("tsconfig.json", RACINE), "utf8")).compilerOptions ?? {};
    const base = new URL(`${options.baseUrl ?? "."}/`, RACINE);
    const exacts = [];
    const jokers = [];
    for (const [alias, cibles] of Object.entries(options.paths ?? {})) {
      const cible = Array.isArray(cibles) ? cibles[0] : undefined;
      if (typeof cible !== "string") continue;
      if (alias.endsWith("/*") && cible.endsWith("/*")) jokers.push([alias.slice(0, -1), new URL(cible.slice(0, -1), base).href]);
      else if (!alias.includes("*")) exacts.push([alias, new URL(cible, base).href]);
    }
    // Le prefixe le plus long d'abord : "@moteur/extensions/*" avant "@moteur/*".
    jokers.sort((a, b) => b[0].length - a[0].length);
    return { exacts: new Map(exacts), jokers };
  } catch {
    return { exacts: new Map(), jokers: [] };
  }
}

const ALIAS = lireLesAlias();

const estUnFichier = (url) => {
  try {
    return statSync(url).isFile();
  } catch {
    return false;
  }
};

function sansAlias(specifier) {
  const exact = ALIAS.exacts.get(specifier);
  if (exact) return exact;
  for (const [prefixe, dossier] of ALIAS.jokers) {
    if (specifier.startsWith(prefixe)) return dossier + specifier.slice(prefixe.length);
  }
  return specifier;
}

export async function resolve(specifier, context, suivant) {
  const cible = sansAlias(specifier);
  const relatif = cible.startsWith("./") || cible.startsWith("../");
  if ((relatif && context.parentURL) || cible.startsWith("file:")) {
    const base = relatif ? new URL(cible, context.parentURL) : new URL(cible);
    for (const suffixe of ["", ".ts", "/index.ts"]) {
      const candidat = new URL(base.href + suffixe);
      if (estUnFichier(candidat)) return suivant(candidat.href, context);
    }
  }
  return suivant(cible, context);
}
