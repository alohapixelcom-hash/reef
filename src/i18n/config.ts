// src/i18n/config.ts - la liste des langues du site. Ajouter une langue commence ici, et seulement ici.
//
// Le theme est bilingue par defaut (anglais, francais). Pour en ajouter une
// troisieme il faut exactement trois gestes :
//   1. ajouter le code ci-dessous dans `locales` et sa fiche dans `localeMeta` ;
//   2. creer src/i18n/ui/<code>.ts en copiant en.ts (TypeScript refusera de
//      compiler tant qu'une seule cle manque : c'est le filet de securite) ;
//   3. traduire les slugs dans src/i18n/routes.ts.
//
// Aucune page n'est a dupliquer : les routes vivent sous src/pages/[...locale]/
// et se generent pour chaque langue de cette liste.

/** Les langues servies par le site. La premiere est la langue par defaut. */
export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

/** La langue servie a la racine du domaine, sans prefixe d'URL. */
export const defaultLocale: Locale = "en";

export interface LocaleMeta {
  /** Le nom de la langue ECRIT DANS CETTE LANGUE. Jamais traduit : un
   *  francophone perdu sur la version anglaise cherche "Francais", pas "French". */
  label: string;
  /** Code BCP-47 complet, pour <html lang> et les balises hreflang. */
  htmlLang: string;
  /** Sens d'ecriture. Prevu des maintenant pour que l'ajout d'une langue RTL
   *  (arabe, hebreu) ne demande pas de rouvrir les layouts. */
  dir: "ltr" | "rtl";
  /** Locale de formatage des dates et des nombres (Intl). */
  intl: string;
  /** Drapeau ? Non. Un drapeau designe un pays, pas une langue : le francais
   *  n'est pas la propriete de la France. Deux lettres, c'est plus honnete et
   *  ca ne casse pas sur les polices systeme. */
  short: string;
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: { label: "English", htmlLang: "en", dir: "ltr", intl: "en-US", short: "EN" },
  fr: { label: "Français", htmlLang: "fr", dir: "ltr", intl: "fr-FR", short: "FR" },
};

/** Vrai si la chaine est bien une langue du site. Utilise pour valider ce qui
 *  vient de l'URL, donc de l'exterieur : on ne fait jamais confiance a un
 *  segment d'URL pour indexer un dictionnaire. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
