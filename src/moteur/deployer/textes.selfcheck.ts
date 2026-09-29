// src/moteur/deployer/textes.selfcheck.ts - self-check des textes de "Mettre le site a jour" : la partie que lit le client ne porte aucun mot technique, en francais comme en anglais.
// Lancer : node src/moteur/deployer/textes.selfcheck.ts (dans un site : il lit site.ts)
import assert from "node:assert/strict";
import { register } from "node:module";

// Les dictionnaires importent site.ts sans extension (comme Vite le permet) :
// le crochet du site leur trouve leur fichier.
register("../resolution.node.mjs", import.meta.url);
const { EN } = await import("./textes.en.ts");
const { FR, PARTIES_DU_CLIENT } = await import("./textes.fr.ts");

let checks = 0;

/** Les mots que le client ne doit jamais lire : ils vont dans "Pour la personne qui a installe le site". */
const TECHNIQUES = /\b(build|builds|cache|caches|hook|hooks|deploy|HTTP|ALOHA_|pnpm|wrangler|Cloudflare|Worker|Workers|variable|secret|commande|command|serveur|server)\b/i;

/** Tous les textes d'une partie, fonctions appelees avec des valeurs d'exemple. */
function textes(valeur: unknown): string[] {
  if (typeof valeur === "string") return [valeur];
  if (typeof valeur === "function") return [String((valeur as (...a: string[]) => unknown)("x", "y"))];
  if (valeur && typeof valeur === "object") return Object.values(valeur).flatMap(textes);
  return [];
}

for (const [nom, dico] of [["fr", FR], ["en", EN]] as const) {
  for (const partie of PARTIES_DU_CLIENT) {
    for (const texte of textes(dico[partie])) {
      assert.ok(!TECHNIQUES.test(texte), `${nom}.${partie} parle technique au client : « ${texte} »`);
      checks += 1;
    }
  }
}
// Le detail technique, lui, garde ce qu'il doit dire a la personne qui a installe le site.
assert.ok(TECHNIQUES.test(FR.technique.hook.absent), "le detail technique nomme la variable du hook");
checks += 1;

console.log(`textes.selfcheck : ${checks} verifications passees`);
