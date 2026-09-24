// src/moteur/textes.node.mjs - charge les textes du theme (dictionnaire et documents legaux) dans Node nu, sans Vite : pour la graine et le self-check.
//
// POURQUOI CE DETOUR : le dictionnaire est du TypeScript ecrit pour Vite, et
// ses modules s'importent sans extension (`./chrome`). Node retire les types
// tout seul depuis la 22.18, mais ne devine pas une extension. Le crochet de
// resolution.node.mjs l'ajoute pour les imports relatifs, le temps de ce
// chargement, et rien d'autre ne change : ce sont les fichiers du theme qui
// sont lus, pas une copie.
import { register } from "node:module";

/** Les textes de chaque langue, sous la forme que contenu.ts attend : { en: Textes, fr: Textes }. */
export async function chargerLesTextes() {
  register("./resolution.node.mjs", import.meta.url);
  const { locales, useTranslations } = await import("../i18n/index.ts");
  const { getLegalData } = await import("../config/legalData.json.ts");
  return Object.fromEntries(locales.map((locale) => [locale, { ...useTranslations(locale), legalData: getLegalData(locale) }]));
}
