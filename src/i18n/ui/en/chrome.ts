// src/i18n/ui/en/chrome.ts - dictionnaire anglais, tranche "chrome" : navigation, pied de page, libelles partages.
//
// Le dictionnaire est decoupe par domaine plutot que garde en un seul fichier :
// une personne peut relire la copie des pages pendant qu'une autre revoit les
// libelles de la barre, sans se marcher dessus. index.ts recompose le tout.
//
// Cette tranche ne contient QUE ce qui entoure le contenu et se repete sur
// toutes les pages. Une phrase propre a une seule page appartient a la tranche
// "pages" ; tout ce qui habille la lecture d'un article appartient a "reading".

export const enChrome = {
  // --- Barre de navigation -------------------------------------------------
  // Quatre rubriques, pas de mega-menu : un blog qui ouvre un panneau au survol
  // demande au lecteur de choisir avant de lui avoir donne une raison de choisir.
  nav: {
    posts: "Posts",
    topics: "Topics",
    about: "About",
    contact: "Contact",
    authors: "Authors",
    search: "Search",
    /** Libelle accessible du lien qui ramene le titre du blog a l'accueil. */
    brandHome: "Reef Notes, back to the home page",
    /** Les deux <nav> de la page portent un nom : sans lui, un lecteur d'ecran
     *  annonce "navigation" deux fois et ne dit pas laquelle des deux. */
    mainLabel: "Main",
    mobileLabel: "Mobile",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    switchLanguage: "Change language",
    toggleTheme: "Toggle theme",
    subscribe: "Subscribe",
  },

  // --- Pied de page --------------------------------------------------------
  // Trois colonnes seulement : Lire, Le studio, Legal. Un pied de page de blog
  // qui aligne six colonnes copie un SaaS et sert d'egout a liens morts.
  footer: {
    tagline:
      "Reef Notes is the working notebook of a three-person web studio. Build logs, load times, type specimens, and the parts of freelancing nobody puts on a landing page.",
    colRead: "Read",
    colStudio: "The studio",
    colLegal: "Legal",
    rss: "RSS feed",
    sitemap: "Sitemap",
    imprint: "Legal notice",
    privacy: "Privacy",
    /** src/config/legalData.json.ts porte encore ce document : il garde donc un
     *  libelle et une route, meme si le pied de page n'affiche que les deux
     *  precedents. */
    terms: "Terms",
    rights: "All rights reserved.",
    builtWith: "Built with Astro, set in Space Grotesk and Instrument Sans.",
    themeBy: "Reef theme by",
    backToTop: "Back to top",
    /** Libelles accessibles des liens qui ne portent qu'une icone. */
    subscribeRss: "Subscribe to the RSS feed",
    emailStudio: "Email the studio",
    followOn: "Follow {name} on {network}",
  },

  // --- Libelles partages ---------------------------------------------------
  // Ce qui apparait a au moins deux endroits sans appartenir a aucun. Un libelle
  // utilise une seule fois n'a rien a faire ici : il vit dans sa page.
  common: {
    readMore: "Read more",
    readPost: "Read the post",
    backHome: "Back to the home page",
    backToPosts: "Back to all posts",
    skipToContent: "Skip to content",
    home: "Home",
    breadcrumbLabel: "Breadcrumb",
    previous: "Previous",
    next: "Next",
    page: "Page",
    /** Les jetons {current} et {total} sont remplis par fmt() (src/i18n/index.ts). */
    pageOf: "Page {current} of {total}",
    all: "All",
    loading: "Loading",
    close: "Close",
    copy: "Copy",
    copied: "Copied",
    optional: "optional",
    required: "required",
    genericError: "Something went wrong. Try again in a moment.",
    newTab: "opens in a new tab",
  },
} as const;
