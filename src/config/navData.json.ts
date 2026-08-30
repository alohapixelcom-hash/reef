// src/config/navData.json.ts - navigation, colonnes du pied de page et routes du site : la seule source de verite des liens de Reef.
//
// Les intitules ne sont pas ecrits ici : ils viennent du dictionnaire, parce
// qu'ils doivent exister dans chaque langue. Ce fichier ne decrit que la
// STRUCTURE de la navigation (quel item, quelle colonne) et les chemins
// canoniques. Le prefixe de langue est ajoute par localizePath au moment du
// rendu, jamais ecrit en dur : /blog/ devient /fr/blog/ tout seul.

import { localizePath, useTranslations, type Locale } from "@i18n";
import type { FooterColumn, NavItem, SiteRoutes } from "./types/configDataTypes";

/**
 * Nav principale : quatre rubriques a plat, aucun enfant.
 *
 * Un blog n'a pas de mega-menu. Le lecteur arrive par un article partage, pas
 * par la page d'accueil : la barre doit lui dire ou il a atterri et lui offrir
 * quatre sorties lisibles, pas deployer un panneau au survol.
 */
export function getNavData(locale: Locale): NavItem[] {
  const t = useTranslations(locale);
  const L = (path: string): string => localizePath(path, locale);
  return [
    { text: t.nav.posts, href: L("/blog/") },
    { text: t.nav.topics, href: L("/topics/") },
    { text: t.nav.about, href: L("/about/") },
    { text: t.nav.contact, href: L("/contact/") },
  ];
}

/**
 * Pied de page en trois colonnes : Lire, Le studio, Legal.
 *
 * Trois colonnes et pas six : un pied de page de blog qui aligne les colonnes
 * d'un SaaS finit en depot de liens morts. Chaque entree ici mene a une page
 * que le theme construit vraiment.
 */
export function getFooterData(locale: Locale): FooterColumn[] {
  const t = useTranslations(locale);
  const L = (path: string): string => localizePath(path, locale);
  return [
    {
      title: t.footer.colRead,
      links: [
        { text: t.nav.posts, href: L("/blog/") },
        { text: t.nav.topics, href: L("/topics/") },
        { text: t.nav.authors, href: L("/authors/") },
        // Un flux par langue : un lecteur francophone abonne au flux anglais
        // recevrait des titres qu'il ne lira pas.
        { text: t.footer.rss, href: L("/rss.xml") },
      ],
    },
    {
      title: t.footer.colStudio,
      links: [
        { text: t.nav.about, href: L("/about/") },
        { text: t.nav.contact, href: L("/contact/") },
      ],
    },
    {
      title: t.footer.colLegal,
      links: [
        { text: t.footer.imprint, href: L("/legal/") },
        { text: t.footer.privacy, href: L("/privacy/") },
      ],
    },
  ];
}

/**
 * Les routes que les composants ne doivent jamais ecrire en dur.
 *
 * Un theme dont une carte d'article contient "/blog/" en clair oblige son
 * utilisateur a rouvrir les composants le jour ou son blog vit sous /journal/.
 * Toutes les cibles qui varient d'un site a l'autre passent donc par ici, et
 * un seul fichier suffit a tout rediriger.
 */
export function getSiteRoutes(locale: Locale): SiteRoutes {
  const L = (path: string): string => localizePath(path, locale);
  return {
    home: L("/"),
    posts: L("/blog/"),
    topics: L("/topics/"),
    authors: L("/authors/"),
    about: L("/about/"),
    contact: L("/contact/"),
    search: L("/search/"),
    // Le flux est localise, le plan du site ne l'est pas : il n'existe qu'un
    // sitemap pour tout le domaine, toutes langues confondues.
    rss: L("/rss.xml"),
    sitemap: "/sitemap-index.xml",
    imprint: L("/legal/"),
    privacy: L("/privacy/"),
    terms: L("/terms/"),
  };
}
