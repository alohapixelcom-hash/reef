// src/i18n/index.ts - tout ce qu'un composant a besoin de savoir sur la langue.
//
// Un composant ne fait jamais que deux choses :
//
//   const locale = getLocale(Astro);      // quelle langue rend-on ?
//   const t = useTranslations(locale);    // la copie de cette langue
//   ...
//   <h1>{t.home.heroTitle}</h1>
//
// `t` est l'objet du dictionnaire, pas une fonction a cle textuelle. La
// difference compte : t.home.heroTitle est autocomplete, verifie au build et
// renomme par le refactoring de l'editeur, la ou t("home.heroTitle") est une
// chaine que rien ne surveille.

import { defaultLocale, isLocale, localeMeta, locales, type Locale } from "./config";
import { en } from "./ui/en/index";
import { fr } from "./ui/fr/index";
import type { Dictionary } from "./ui/types";

export { defaultLocale, isLocale, localeMeta, locales };
export type { Locale };
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, fr };

/** La copie de la langue demandee. Jamais de secours silencieux vers l'anglais :
 *  une cle manquante est impossible, le type l'interdit deja. */
export function useTranslations(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * La langue de la page en cours.
 *
 * Astro renseigne `Astro.currentLocale` a partir de l'URL des lors que le bloc
 * i18n est configure. On repasse tout de meme par isLocale : `currentLocale`
 * est type `string | undefined`, et on n'indexe jamais un dictionnaire avec une
 * valeur qu'on n'a pas validee.
 */
export function getLocale(ctx: { currentLocale?: string | undefined }): Locale {
  return isLocale(ctx.currentLocale) ? ctx.currentLocale : defaultLocale;
}

/** Le prefixe d'URL d'une langue. Vide pour la langue par defaut, servie a la racine. */
export function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

/**
 * Traduit un chemin canonique (toujours ecrit en anglais, sans prefixe) vers la
 * langue voulue. C'est la seule fonction que la navigation doit appeler :
 *
 *   localizePath("/pricing/", "fr")  ->  "/fr/pricing/"
 *   localizePath("/pricing/", "en")  ->  "/pricing/"
 *
 * Les URLs absolues et les ancres passent au travers sans etre touchees : un
 * lien mailto: ou https:// n'a pas de version francaise.
 */
export function localizePath(path: string, locale: Locale): string {
  if (/^([a-z]+:)?\/\//i.test(path) || path.startsWith("mailto:") || path.startsWith("#")) {
    return path;
  }
  const clean = stripLocale(path);
  const prefix = localePrefix(locale);
  if (!prefix) return clean;
  // "/" devient "/fr/" et pas "/fr", pour rester coherent avec trailingSlash: "always".
  return clean === "/" ? `${prefix}/` : `${prefix}${clean}`;
}

/** Retire le prefixe de langue d'un chemin : "/fr/pricing/" -> "/pricing/". */
export function stripLocale(path: string): string {
  const match = /^\/([a-z]{2}(?:-[a-z]{2})?)(?=\/|$)/i.exec(path);
  if (match && isLocale(match[1])) {
    const rest = path.slice(match[0].length);
    return rest === "" ? "/" : rest;
  }
  return path;
}

export interface Alternate {
  locale: Locale;
  /** Valeur de l'attribut hreflang (BCP-47). */
  hreflang: string;
  /** URL absolue de la meme page dans cette langue. */
  href: string;
  label: string;
  short: string;
  current: boolean;
}

/**
 * Les equivalents de la page courante dans toutes les langues.
 *
 * Sert a deux choses qui doivent absolument rester d'accord : les balises
 * <link rel="alternate" hreflang> du head, et le selecteur de langue de la
 * barre de navigation. Un selecteur qui renvoie tout le monde a l'accueil est
 * le defaut le plus courant des sites multilingues ; ici il pointe vers LA
 * meme page, parce qu'il lit la meme source que le head.
 */
export function getAlternates(url: URL, site: URL | undefined, current: Locale): Alternate[] {
  const base = site ?? url;
  const canonical = stripLocale(url.pathname);
  return locales.map((locale) => {
    const meta = localeMeta[locale];
    return {
      locale,
      hreflang: meta.htmlLang,
      href: new URL(localizePath(canonical, locale), base).href,
      label: meta.label,
      short: meta.short,
      current: locale === current,
    };
  });
}

/**
 * Les params de getStaticPaths pour une route posee sous src/pages/[...locale]/.
 *
 * `undefined` genere la route sans prefixe (l'anglais, a la racine) ; les autres
 * langues generent /fr/..., /es/... Une seule page source, autant de sorties que
 * de langues declarees. Ajouter une langue ne demande donc de toucher a aucune
 * page.
 */
export function localePaths(): { params: { locale: string | undefined } }[] {
  return locales.map((locale) => ({
    params: { locale: locale === defaultLocale ? undefined : locale },
  }));
}

/**
 * Remplace les jetons {nom} d'une chaine traduite.
 *
 *   fmt(t.common.pageOf, { current: 2, total: 7 })  ->  "Page 2 of 7"
 *
 * Volontairement minimal : pas de pluriels ni de genres ici. Les langues du
 * theme n'en ont pas besoin, et une bibliotheque ICU complete pesait plus lourd
 * que la totalite du reste du theme.
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** Une date ecrite dans les usages de la langue, pas dans ceux du serveur. */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMeta[locale].intl, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Un nombre ecrit dans les usages de la langue (separateurs, espaces insecables). */
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, options).format(value);
}
