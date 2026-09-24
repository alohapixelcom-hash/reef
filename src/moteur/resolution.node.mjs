// src/moteur/resolution.node.mjs - crochet de resolution pour Node : un import relatif sans extension trouve son fichier .ts (voir textes.node.mjs).
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const estUnFichier = (url) => {
  try {
    return statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
};

export async function resolve(specifier, context, suivant) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    for (const suffixe of ["", ".ts", "/index.ts"]) {
      const candidat = new URL(base.href + suffixe);
      if (estUnFichier(candidat)) return suivant(candidat.href, context);
    }
  }
  return suivant(specifier, context);
}
