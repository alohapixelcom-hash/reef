// src/moteur/catalogue-bo.ts - le catalogue de messages que lit la page d'administration : celui du moteur, complete en francais.
//
// PIECE DU SOCLE : ce catalogue se copie tel quel dans chaque site de la
// maison qui tourne sur EmDash. Aucun fichier de cette piece ne nomme un site.
//
// COMMENT POSER CE CATALOGUE DANS UN AUTRE DEPOT
//
//   1. Copier, au meme chemin (src/moteur/), les six fichiers :
//        catalogue-bo.ts            ce fichier, le seul point d'entree
//        catalogue-bo.regles.ts     la fusion, pure et testee
//        catalogue-bo.fr.ts         le dictionnaire (la seule chose qui grossit)
//        catalogue-bo.selfcheck.ts  la preuve, lancee par `pnpm test`
//        catalogue-bo.config.mjs    le branchement dans la config d'Astro
//        catalogue-emdash.d.ts      le type du catalogue du moteur
//   2. Dans tsconfig.json, `paths` :
//        "@moteur/catalogue-emdash": ["src/moteur/catalogue-emdash.d.ts"]
//      (avant un eventuel "@moteur/*", qui doit rester apres).
//   3. Dans la configuration Astro (celle qui pose l'integration emdash) :
//        import { catalogueDuBackOffice } from "./src/moteur/catalogue-bo.config.mjs";
//        const catalogue = catalogueDuBackOffice(import.meta.url);
//      puis `...catalogue.alias` dans `vite.resolve.alias` (un TABLEAU, pas un
//      objet) et `catalogue.greffon` dans `vite.plugins`. Rien d'autre.
//   4. Dans seed/seed.json, le bloc `taxonomies` des deux taxonomies natives,
//      en et fr reunies par `translationOf` (voir la graine de ce depot) : sans
//      lui, le rail garde "Categories" et "Tags" en anglais, et une etiquette
//      francaise ajoutee a la main ferait une seconde entree.
//   5. Variable d'environnement, facultative : ALOHA_BO_LANGUE. Sans elle, le
//      francais est la langue par defaut du back office (voir langue-bo.ts et
//      la constante LANGUE_BO de la configuration) ; un code de langue la
//      change, `navigateur` rend la decision au navigateur. Ce catalogue, lui,
//      ne depend pas de la variable : il complete le francais chaque fois que
//      le francais est la langue servie.
//   Puis `pnpm test` : catalogue-bo.selfcheck.ts lit les vrais catalogues du
//   paquet installe et echoue sur un message non couvert ou une entree morte.
//
// OU CE FICHIER S'INSERE. La page d'administration d'EmDash
// (node_modules/emdash/src/astro/routes/admin.astro) importe
// "@emdash-cms/admin/locales" pour choisir la langue de la requete et charger
// le catalogue correspondant, puis le passe en propriete a l'application
// React, qui l'active telle quelle. catalogue-bo.config.mjs fait pointer CE
// nom d'import sur ce fichier : la page n'est pas touchee, elle recoit
// simplement un catalogue plus complet.
//
// POURQUOI CET ENDROIT ET PAS UN AUTRE. EmDash 0.38 n'expose ni option
// `admin.locale` ni point d'extension pour ses messages : `admin` ne porte que
// logo, siteName et favicon. Le seul autre endroit serait de remplacer du
// texte dans le HTML rendu, ce que la maison refuse. L'alias, lui, ne
// duplique rien, ne fork rien, et disparait le jour ou le moteur ouvrira une
// vraie option.
//
// CE QUI SORT D'ICI. Exactement ce que le moteur exporte, sauf `loadMessages`
// qui passe par le dictionnaire de la maison quand la langue est le francais.
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
 * du moteur sans un detour. Le francais passe par le dictionnaire de la maison,
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
