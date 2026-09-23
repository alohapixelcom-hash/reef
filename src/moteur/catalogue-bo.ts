// src/moteur/catalogue-bo.ts - le catalogue de messages que lit la page d'administration : celui du moteur, complete en francais.
//
// OU CE FICHIER S'INSERE. La page d'administration d'EmDash
// (node_modules/emdash/src/astro/routes/admin.astro) importe
// "@emdash-cms/admin/locales" pour choisir la langue de la requete et charger
// le catalogue correspondant, puis le passe en propriete a l'application
// React, qui l'active telle quelle. moteur.config.mjs fait pointer CE nom
// d'import sur ce fichier (alias exact, voir la fonction `alias`) : la page
// n'est pas touchee, elle recoit simplement un catalogue plus complet.
//
// POURQUOI CET ENDROIT ET PAS UN AUTRE. EmDash 0.38 n'expose ni option
// `admin.locale` ni point d'extension pour ses messages : `admin` ne porte que
// logo, siteName et favicon. Le seul autre endroit serait de remplacer du
// texte dans le HTML rendu, ce que la maison refuse. L'alias, lui, ne
// duplique rien, ne fork rien, et disparait le jour ou le moteur ouvrira une
// vraie option.
//
// CE QUI SORT D'ICI. Exactement ce que le moteur exporte, sauf `loadMessages`
// qui passe par le dictionnaire du theme quand la langue est le francais.
// `useLocale` et `LocaleDirectionProvider` ne sont volontairement pas
// reexportes : ce sont des composants React que seule l'application cliente
// utilise, par son import interne, et les faire transiter par ce fichier les
// ferait entrer dans le graphe du serveur pour rien.
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  SUPPORTED_LOCALE_CODES,
  getLocaleDir,
  getLocaleLabel,
  loadMessages as catalogueDuMoteur,
  resolveLocale,
  type MessagesCompiles,
} from "@moteur/catalogue-emdash";
import { catalogueComplete, estDuFrancais } from "./catalogue-bo.regles";
import { DICTIONNAIRE } from "./catalogue-bo.fr";

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, SUPPORTED_LOCALE_CODES, getLocaleDir, getLocaleLabel, resolveLocale };

/** Le catalogue francais complete, fabrique une fois par isolat : les catalogues du moteur ne changent pas en cours de route. */
const enMemoire = new Map<string, Promise<MessagesCompiles>>();

/**
 * Le catalogue de la langue demandee. Toute langue autre que le francais sort
 * du moteur sans un detour. Le francais passe par le dictionnaire du theme,
 * qui ne pose ses phrases que la ou le moteur laisse l'anglais.
 */
export async function loadMessages(locale: string): Promise<MessagesCompiles> {
  if (!estDuFrancais(locale)) return catalogueDuMoteur(locale);
  const dejaFait = enMemoire.get(locale);
  if (dejaFait) return dejaFait;
  const promesse = (async () => {
    const [francais, anglais] = await Promise.all([catalogueDuMoteur(locale), catalogueDuMoteur(DEFAULT_LOCALE)]);
    return catalogueComplete(francais, anglais, DICTIONNAIRE);
  })();
  enMemoire.set(locale, promesse);
  return promesse;
}
