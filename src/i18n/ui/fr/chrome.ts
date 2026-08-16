// src/i18n/ui/fr/chrome.ts - dictionnaire francais, tranche "chrome" : navigation, pied de page, libelles partages.
//
// Le type Pick<Dictionary, ...> fait le travail de relecture a notre place :
// oublier une cle de cette tranche casse le build, et en inventer une qui
// n'existe pas cote anglais aussi. Personne n'a donc a comparer deux fichiers
// a l'oeil pour savoir si la traduction est complete.

import type { Dictionary } from "../types";

export const frChrome: Pick<Dictionary, "nav" | "footer" | "common"> = {
  // --- Barre de navigation -------------------------------------------------
  nav: {
    posts: "Articles",
    topics: "Sujets",
    about: "À propos",
    contact: "Contact",
    authors: "Auteurs",
    search: "Rechercher",
    brandHome: "Reef Notes, retour à l'accueil",
    mainLabel: "Principale",
    mobileLabel: "Mobile",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    switchLanguage: "Changer de langue",
    toggleTheme: "Changer de thème",
    subscribe: "S'abonner",
  },

  // --- Pied de page --------------------------------------------------------
  footer: {
    tagline:
      "Reef Notes est le carnet de bord d'un studio web à deux. Journaux de chantier, temps de chargement, spécimens typographiques, et les côtés du métier d'indépendant dont personne ne fait une page de vente.",
    colRead: "Lire",
    colStudio: "Le studio",
    colLegal: "Légal",
    rss: "Flux RSS",
    sitemap: "Plan du site",
    imprint: "Mentions légales",
    privacy: "Confidentialité",
    terms: "Conditions d'utilisation",
    rights: "Tous droits réservés.",
    builtWith: "Fait avec Astro, composé en Space Grotesk et Instrument Sans.",
    themeBy: "Thème Reef par",
    backToTop: "Revenir en haut",
    subscribeRss: "S'abonner au flux RSS",
    emailStudio: "Écrire au studio",
    followOn: "Suivre {name} sur {network}",
  },

  // --- Libelles partages ---------------------------------------------------
  common: {
    readMore: "Lire la suite",
    readPost: "Lire l'article",
    backHome: "Retour à l'accueil",
    backToPosts: "Retour aux articles",
    skipToContent: "Aller au contenu",
    home: "Accueil",
    breadcrumbLabel: "Fil d'Ariane",
    previous: "Précédent",
    next: "Suivant",
    page: "Page",
    pageOf: "Page {current} sur {total}",
    all: "Tout",
    loading: "Chargement",
    close: "Fermer",
    copy: "Copier",
    copied: "Copié",
    optional: "facultatif",
    required: "obligatoire",
    genericError: "Une erreur est survenue. Réessayez dans un instant.",
    newTab: "ouvre un nouvel onglet",
  },
};
