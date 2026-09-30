// src/moteur/contenu.sections.ts - la table des sections : pour chaque entree de la collection `sections`, le chemin de chaque texte dans le dictionnaire.
//
// C'est la seule liste des textes rediges des pages. contenu.ts la lit dans
// les deux sens (la graine, tiree des fichiers, et le rendu, la base posee sur
// les fichiers), et contenu.selfcheck.ts verifie que chaque chemin existe dans
// les deux dictionnaires, que chaque champ existe dans la graine, que la
// graine dit exactement ce que disent les fichiers, et que tout autre texte
// des dictionnaires est soit un libelle de menu (menus.ts), soit dans
// HORS_BASE, avec sa raison.
//
// Aucun import de valeur ici, seulement des types : ce module se charge aussi
// dans Node nu (scripts/graine-sections.mjs, le self-check).

/** Un chemin dans les textes, en pointille : "home.heroTitle", "legalData.privacy.sections". */
export type Chemin = string;

/**
 * Une tranche du champ repete `arguments` : une liste d'objets (champ de la
 * base vers cle de l'objet), une liste de phrases, ou un objet du dictionnaire
 * rendu comme une seule ligne. `rendus` : des sous-champs que la page lit
 * quand l'editeur les remplit, mais que l'import n'ecrit pas (vide, la valeur
 * du theme) : l'ancre d'une clause, l'adresse d'un bouton.
 */
export type Tranche =
  | { liste: Chemin; cles: Record<string, string>; rendus?: readonly string[] }
  | { liste: Chemin; texte: string }
  | { objet: Chemin; cles: Record<string, string>; rendus?: readonly string[] };

/**
 * Les pages du site, telles que le back office les montre : la colonne "Page"
 * de la liste des sections, et le filtre de la liste. Ecrites pour l'editeur,
 * accents compris (ce sont les valeurs du champ, pas des identifiants) : "Tout
 * le site" est le cadre present sur chaque page (en-tete, pied de page, lettre
 * d'information), "Page introuvable" la page 404.
 */
export const PAGES_DU_SITE = [
  "Accueil",
  "Billet",
  "Tous les billets",
  "Sujets",
  "Page d'un sujet",
  "Auteurs",
  "Page d'un auteur",
  "Recherche",
  "À propos",
  "Contact",
  "Mentions légales",
  "Confidentialité",
  "Conditions",
  "Tout le site",
  "Page introuvable",
] as const;
export type PageDuSite = (typeof PAGES_DU_SITE)[number];

/** Les anciennes valeurs du champ Page, que migrations/import-3.4.0-reef.sql remplace si l'editeur ne les a pas changees. */
export const ANCIENNES_PAGES: Record<string, PageDuSite> = {
  accueil: "Accueil",
  billet: "Billet",
  blog: "Tous les billets",
  rubriques: "Sujets",
  auteurs: "Auteurs",
  recherche: "Recherche",
  "a-propos": "À propos",
  contact: "Contact",
  "mentions-legales": "Mentions légales",
  confidentialite: "Confidentialité",
  conditions: "Conditions",
  toutes: "Tout le site",
};

export type ChampSimple =
  | "title"
  | "accent"
  | "eyebrow"
  | "lede"
  | "body"
  | "cta"
  | "cta_secondary"
  | "note"
  | "breadcrumb"
  | "meta_title"
  | "meta_description"
  | "revised";

export interface Section {
  /** L'identifiant de l'entree dans la collection `sections`, le meme dans les deux langues. */
  slug: string;
  /** La page qui rend la section : un filtre et une colonne dans le back office, rien de plus. */
  page: PageDuSite;
  /** Les champs simples de la collection vers le chemin du texte qu'ils portent. */
  champs: Partial<Record<ChampSimple, Chemin>>;
  /** Le champ repete `arguments`, dans l'ordre de la page : il REMPLACE la liste des fichiers. */
  arguments?: Tranche;
}

/** Les textes de tete d'une page de liste : surtitre, titre, mot en couleur, chapo, nom dans le fil d'Ariane, et ses deux textes pour les moteurs de recherche. */
const tete = (cle: string): Section["champs"] => ({
  eyebrow: `${cle}.eyebrow`,
  title: `${cle}.title`,
  accent: `${cle}.accent`,
  lede: `${cle}.lede`,
  breadcrumb: `${cle}.crumb`,
  meta_title: `${cle}.metaTitle`,
  meta_description: `${cle}.metaDescription`,
});

/** Un document legal de src/config/legalData.json.ts : surtitre, titre, description, nom dans le fil d'Ariane, date de revision, clauses. */
const documentLegal = (slug: "confidentialite" | "conditions", page: PageDuSite, cle: "privacy" | "terms"): Section => ({
  slug,
  page,
  champs: {
    eyebrow: `legal.${cle}Eyebrow`,
    title: `legalData.${cle}.title`,
    lede: `legalData.${cle}.description`,
    breadcrumb: `legal.${cle}Crumb`,
    revised: `legalData.${cle}.lastUpdated`,
  },
  arguments: { liste: `legalData.${cle}.sections`, cles: { title: "title", body: "body" }, rendus: ["anchor"] },
});

/** Les sections, page par page, dans l'ordre de lecture ; le cadre commun et la page introuvable a la fin. */
export const SECTIONS: readonly Section[] = [
  {
    slug: "hero",
    page: "Accueil",
    champs: {
      eyebrow: "home.eyebrow",
      title: "home.heroTitle",
      accent: "home.heroAccent",
      lede: "home.heroLede",
      cta: "home.heroPrimary",
      cta_secondary: "home.heroSecondary",
      meta_title: "home.metaTitle",
      meta_description: "home.metaDescription",
    },
    arguments: { liste: "home.heroLedger", texte: "title" },
  },
  // La bande defilante sous l'ouverture : ses noms sont ceux des sujets (collection "sujets"), son titre n'est lu que par les lecteurs d'ecran.
  { slug: "bande-sujets", page: "Accueil", champs: { title: "home.marqueeLabel" } },
  { slug: "a-la-une", page: "Accueil", champs: { eyebrow: "home.featuredEyebrow" } },
  {
    slug: "studio",
    page: "Accueil",
    champs: {
      eyebrow: "home.aboutEyebrow",
      title: "home.aboutTitle",
      accent: "home.aboutAccent",
      lede: "home.aboutLede",
      cta: "home.aboutCta",
      cta_secondary: "home.aboutContact",
    },
  },
  {
    slug: "dernieres-notes",
    page: "Accueil",
    champs: { title: "home.latestTitle", accent: "home.latestAccent", lede: "home.latestLede", cta: "home.latestCta" },
  },
  {
    slug: "sujets",
    page: "Accueil",
    champs: { title: "home.topicsTitle", accent: "home.topicsAccent", lede: "home.topicsLede", cta: "home.topicsCta" },
  },
  {
    slug: "signatures",
    page: "Accueil",
    champs: { title: "home.authorsTitle", accent: "home.authorsAccent", lede: "home.authorsLede", cta: "home.authorsCta" },
  },
  {
    slug: "lettre",
    page: "Tout le site",
    champs: {
      title: "newsletter.title",
      accent: "newsletter.accent",
      lede: "newsletter.lede",
      cta: "newsletter.submit",
      note: "newsletter.note",
    },
  },
  {
    slug: "lettre-flux",
    page: "Accueil",
    champs: { title: "newsletter.rssTitle", lede: "newsletter.rssLede", cta: "newsletter.rssCta" },
  },
  {
    slug: "a-lire-ensuite",
    page: "Billet",
    champs: {
      title: "post.keepReading",
      accent: "post.keepReadingAccent",
      lede: "post.keepReadingLede",
      cta: "post.keepReadingCta",
    },
  },
  { slug: "archives", page: "Tous les billets", champs: tete("archive") },
  { slug: "rubriques", page: "Sujets", champs: tete("topics") },
  // La page d'un sujet : son titre est un modele ({topic} y devient le nom du sujet), dans un texte long que la barre ouvre au back office.
  { slug: "sujet", page: "Page d'un sujet", champs: { eyebrow: "topics.pageEyebrow", body: "archive.topicTitle" } },
  { slug: "auteurs", page: "Auteurs", champs: tete("authors") },
  { slug: "recherche", page: "Recherche", champs: tete("search") },
  { slug: "a-propos", page: "À propos", champs: tete("about") },
  {
    slug: "a-propos-histoire",
    page: "À propos",
    champs: { title: "about.storyTitle", accent: "about.storyAccent" },
    arguments: { liste: "about.storyParagraphs", texte: "body" },
  },
  {
    slug: "a-propos-regles",
    page: "À propos",
    champs: { title: "about.valuesTitle", accent: "about.valuesAccent", lede: "about.valuesLede" },
    arguments: { liste: "about.values", cles: { title: "title", body: "text" } },
  },
  {
    slug: "a-propos-signatures",
    page: "À propos",
    champs: {
      title: "about.writersTitle",
      accent: "about.writersAccent",
      lede: "about.writersLede",
      cta: "about.writersCta",
    },
  },
  {
    slug: "a-propos-appel",
    page: "À propos",
    champs: { title: "about.contactTitle", lede: "about.contactLede", cta: "about.contactCta" },
  },
  { slug: "contact", page: "Contact", champs: tete("contact") },
  {
    slug: "contact-formulaire",
    page: "Contact",
    champs: { title: "contact.formTitle", note: "contact.formNote", cta: "contact.submit" },
  },
  {
    slug: "contact-direct",
    page: "Contact",
    champs: { title: "contact.directTitle", lede: "contact.directLede", cta: "contact.directCta" },
  },
  {
    slug: "contact-suite",
    page: "Contact",
    champs: { title: "contact.nextTitle" },
    arguments: { liste: "contact.nextSteps", texte: "body" },
  },
  {
    slug: "mentions-legales",
    page: "Mentions légales",
    champs: { eyebrow: "legal.eyebrow", title: "legal.title", lede: "legal.description", breadcrumb: "legal.crumb", revised: "legal.updated" },
    arguments: { liste: "legal.sections", cles: { title: "title", body: "body" }, rendus: ["anchor"] },
  },
  // Le sommaire des trois pages legales (mentions, confidentialite, conditions) : un seul bloc, commun aux trois.
  {
    slug: "sommaire-legal",
    page: "Mentions légales",
    champs: { title: "legal.toc", cta: "legal.backToTop", note: "legal.lastUpdated" },
  },
  documentLegal("confidentialite", "Confidentialité", "privacy"),
  documentLegal("conditions", "Conditions", "terms"),
  // LE CADRE, present sur toutes les pages. Les liens de l'en-tete et du pied
  // sont des menus natifs du moteur (voir menus.ts) ; ici, ce que le cadre
  // REDIGE : le nom accessible de la marque, la racine du fil d'Ariane,
  // l'accroche et les mentions du pied. Le nom du site vient des reglages
  // natifs, le credit de l'entree "site" (voir cadre.ts).
  { slug: "en-tete", page: "Tout le site", champs: { title: "nav.brandHome", eyebrow: "common.home" } },
  {
    slug: "pied-de-page",
    page: "Tout le site",
    champs: {
      lede: "footer.tagline",
      body: "footer.builtWith",
      note: "footer.rights",
      cta: "footer.themeBy",
      cta_secondary: "footer.backToTop",
    },
  },
  // LA PAGE INTROUVABLE, rendue a la demande moteur allume : son code en
  // surtitre, son titre, ses trois boutons (le troisieme est la ligne de ses
  // "arguments"), et ses textes pour les moteurs de recherche.
  {
    slug: "introuvable",
    page: "Page introuvable",
    champs: {
      eyebrow: "notFound.code",
      title: "notFound.title",
      accent: "notFound.accent",
      lede: "notFound.lede",
      cta: "notFound.homeCta",
      cta_secondary: "notFound.postsCta",
      meta_title: "notFound.metaTitle",
      meta_description: "notFound.metaDescription",
    },
    arguments: { objet: "notFound", cles: { title: "searchCta" }, rendus: ["link"] },
  },
];

/**
 * CE QUE LE MOTEUR NE GERE PAS, ET POURQUOI. Tout autre texte des deux
 * dictionnaires est dans la table ci-dessus, ou dans un menu natif (menus.ts,
 * ou les liens de la navigation et du pied sont des menus du back office) ; les
 * sujets et les auteurs sont des collections (listes.ts). contenu.selfcheck.ts
 * le verifie, et une cle ajoutee aux dictionnaires sans etre rangee ni ici ni
 * la-haut le fait echouer. Un "*" vaut un rang de liste.
 *
 * Il ne reste ici que l'habillage et la mecanique : des noms pour les lecteurs
 * d'ecran (jamais affiches), les commandes de l'interface (ouvrir, fermer,
 * changer de langue ou de theme, copier, partager), les libelles generiques de
 * la lecture, de la recherche, des listes et des formulaires (compteurs,
 * pagination, etats vides, messages d'envoi), et ce qu'aucune page n'affiche.
 */
export const HORS_BASE: readonly { chemin: Chemin; raison: string }[] = [
  { chemin: "nav.mainLabel", raison: "le nom de la navigation principale pour les lecteurs d'ecran, pas un texte affiche" },
  { chemin: "nav.mobileLabel", raison: "le nom de la navigation du tiroir pour les lecteurs d'ecran, pas un texte affiche" },
  { chemin: "nav.openMenu", raison: "le nom du bouton du tiroir (une icone), une commande de l'interface" },
  { chemin: "nav.closeMenu", raison: "le nom du bouton qui ferme le tiroir, une commande de l'interface" },
  { chemin: "nav.switchLanguage", raison: "le nom du selecteur de langue, une commande de l'interface" },
  { chemin: "nav.toggleTheme", raison: "le nom du bouton clair ou sombre, une commande de l'interface" },
  { chemin: "footer.sitemap", raison: "aucune page ne l'affiche (le plan du site n'est pas au pied)" },
  { chemin: "footer.terms", raison: "aucune page ne l'affiche (les conditions ne sont pas au pied ; un editeur les y ajoute par le menu Legal)" },
  { chemin: "footer.subscribeRss", raison: "le nom du lien du flux du pied (une icone) pour les lecteurs d'ecran" },
  { chemin: "footer.emailStudio", raison: "le nom du lien e-mail du pied (une icone) pour les lecteurs d'ecran" },
  { chemin: "footer.followOn", raison: "le nom d'un lien de reseau du pied (une icone) pour les lecteurs d'ecran" },
  { chemin: "common", raison: "les libelles generiques de l'interface : lien d'evitement, pagination, copier, fermer, nouvel onglet, erreurs ; la racine du fil d'Ariane est dans l'entree en-tete" },
  { chemin: "demo", raison: "la mention de demonstration du pied, propre a la demonstration du theme (siteData.demoNotice) : un site client ne l'affiche pas, et elle nomme l'atelier qui a fait le theme" },
  { chemin: "home.heroRecent", raison: "aucune page ne l'affiche (la liste de titres du premier ecran a ete retiree)" },
  { chemin: "contact.nameLabel", raison: "libelle du formulaire de contact, une commande de l'interface" },
  { chemin: "contact.namePlaceholder", raison: "exemple du formulaire de contact, une aide de saisie de l'interface" },
  { chemin: "contact.emailLabel", raison: "libelle du formulaire de contact, une commande de l'interface" },
  { chemin: "contact.emailPlaceholder", raison: "exemple du formulaire de contact, une aide de saisie de l'interface" },
  { chemin: "contact.subjectLabel", raison: "libelle du formulaire de contact, une commande de l'interface" },
  { chemin: "contact.subjectPlaceholder", raison: "exemple du formulaire de contact, une aide de saisie de l'interface" },
  { chemin: "contact.messageLabel", raison: "libelle du formulaire de contact, une commande de l'interface" },
  { chemin: "contact.messagePlaceholder", raison: "exemple du formulaire de contact, une aide de saisie de l'interface" },
  { chemin: "contact.success", raison: "message d'envoi du formulaire (l'extension Courriels affiche le sien)" },
  { chemin: "contact.error", raison: "message d'envoi du formulaire (l'extension Courriels affiche le sien)" },
  { chemin: "topics.countLabel", raison: "compteur de billets d'un sujet, un gabarit de l'interface" },
  { chemin: "topics.countOne", raison: "compteur de billets d'un sujet, un gabarit de l'interface" },
  { chemin: "topics.readTopic", raison: "aucune page ne l'affiche" },
  { chemin: "topics.allTopics", raison: "le nom de la navigation des sujets pour les lecteurs d'ecran, et le bouton d'une archive vide (etat vide de l'interface)" },
  { chemin: "topics.emptyTitle", raison: "etat vide d'un sujet sans billet, un message de l'interface" },
  { chemin: "topics.emptyLede", raison: "etat vide d'un sujet sans billet, un message de l'interface" },
  { chemin: "authors.roleLabel", raison: "libelle de la page d'un auteur (au-dessus de son nom), une etiquette de l'interface" },
  { chemin: "authors.linksLabel", raison: "libelle des liens d'un auteur, une etiquette de l'interface" },
  { chemin: "authors.postsBy", raison: "titre de la page d'un auteur pour les moteurs, un gabarit ({name} est le nom de l'auteur)" },
  { chemin: "authors.readAll", raison: "aucune page ne l'affiche" },
  { chemin: "authors.countLabel", raison: "compteur de billets d'un auteur, un gabarit de l'interface" },
  { chemin: "authors.countOne", raison: "compteur de billets d'un auteur, un gabarit de l'interface" },
  { chemin: "authors.emptyTitle", raison: "etat vide d'un auteur sans billet, un message de l'interface" },
  { chemin: "authors.emptyLede", raison: "etat vide d'un auteur sans billet, un message de l'interface" },
  { chemin: "search.placeholder", raison: "le champ de recherche, une commande de l'interface" },
  { chemin: "search.label", raison: "le nom du champ de recherche pour les lecteurs d'ecran" },
  { chemin: "search.shortcut", raison: "l'aide du raccourci clavier, une commande de l'interface" },
  { chemin: "search.clear", raison: "le bouton qui vide la recherche, une commande de l'interface" },
  { chemin: "search.prompt", raison: "l'invite avant la premiere frappe, un gabarit de l'interface ({count} est la taille de l'index)" },
  { chemin: "search.resultsLabel", raison: "le nom de la liste des resultats pour les lecteurs d'ecran" },
  { chemin: "search.countLabel", raison: "compteur de resultats, un gabarit de l'interface" },
  { chemin: "search.countOne", raison: "compteur de resultats, un gabarit de l'interface" },
  { chemin: "search.inTopic", raison: "etiquette du sujet d'un resultat, un gabarit de l'interface" },
  { chemin: "search.noResultsTitle", raison: "etat vide de la recherche, un message de l'interface" },
  { chemin: "search.noResultsLede", raison: "etat vide de la recherche, un message de l'interface" },
  { chemin: "search.noResultsCta", raison: "etat vide de la recherche, un bouton de l'interface" },
  { chemin: "post.minRead", raison: "temps de lecture d'un billet, un gabarit de l'interface" },
  { chemin: "post.minReadOne", raison: "temps de lecture d'un billet, un gabarit de l'interface" },
  { chemin: "post.published", raison: "libelle de la date d'un billet, une etiquette de la lecture" },
  { chemin: "post.updated", raison: "libelle de la date de revision d'un billet, une etiquette de la lecture" },
  { chemin: "post.updatedNote", raison: "mention de revision d'un billet, une etiquette de la lecture" },
  { chemin: "post.writtenBy", raison: "libelle de la signature d'un billet, une etiquette de la lecture" },
  { chemin: "post.toc", raison: "titre du sommaire d'un billet, une etiquette de la lecture" },
  { chemin: "post.tocLabel", raison: "le nom du sommaire pour les lecteurs d'ecran" },
  { chemin: "post.topicLabel", raison: "libelle du sujet d'un billet, une etiquette de la lecture" },
  { chemin: "post.tagsLabel", raison: "libelle des etiquettes d'un billet, une etiquette de la lecture" },
  { chemin: "post.share", raison: "titre du partage, une commande de l'interface" },
  { chemin: "post.shareOn", raison: "nom d'un lien de partage, une commande de l'interface" },
  { chemin: "post.networkEmail", raison: "nom d'une destination de partage, une commande de l'interface" },
  { chemin: "post.networkX", raison: "nom d'une destination de partage, une commande de l'interface" },
  { chemin: "post.copyLink", raison: "bouton de copie du lien, une commande de l'interface" },
  { chemin: "post.linkCopied", raison: "confirmation de copie, un message de l'interface" },
  { chemin: "post.previousPost", raison: "navigation entre billets, une commande de l'interface" },
  { chemin: "post.nextPost", raison: "navigation entre billets, une commande de l'interface" },
  { chemin: "post.navLabel", raison: "le nom de la navigation entre billets pour les lecteurs d'ecran" },
  { chemin: "post.aboutAuthor", raison: "titre de la fiche de l'auteur en pied de billet, une etiquette de la lecture" },
  { chemin: "post.moreFromAuthor", raison: "lien vers les billets de l'auteur, un gabarit de l'interface ({name} est le nom de l'auteur)" },
  { chemin: "post.backToPosts", raison: "retour a la liste, une commande de l'interface" },
  { chemin: "post.coverCredit", raison: "gabarit du credit d'une couverture ({credit})" },
  { chemin: "post.draft", raison: "etiquette d'un brouillon, visible seulement en apercu" },
  { chemin: "post.draftNote", raison: "note d'un brouillon, visible seulement en apercu" },
  { chemin: "archive.pageSuffix", raison: "suffixe des pages 2 et suivantes, un gabarit de la pagination" },
  { chemin: "archive.listLabel", raison: "le nom de la grille des billets pour les lecteurs d'ecran" },
  { chemin: "archive.paginationLabel", raison: "le nom de la pagination pour les lecteurs d'ecran" },
  { chemin: "archive.authorTitle", raison: "aucune page ne l'affiche" },
  { chemin: "archive.tagTitle", raison: "aucune page ne l'affiche" },
  { chemin: "archive.countLabel", raison: "compteur de billets, un gabarit de l'interface" },
  { chemin: "archive.countOne", raison: "compteur de billets, un gabarit de l'interface" },
  { chemin: "archive.emptyTitle", raison: "etat vide d'une liste, un message de l'interface" },
  { chemin: "archive.emptyLede", raison: "etat vide d'une liste, un message de l'interface" },
  { chemin: "archive.emptyCta", raison: "etat vide d'une liste, un bouton de l'interface" },
  { chemin: "newsletter.emailLabel", raison: "le nom du champ d'inscription pour les lecteurs d'ecran" },
  { chemin: "newsletter.placeholder", raison: "exemple du champ d'inscription, une aide de saisie de l'interface" },
  { chemin: "newsletter.success", raison: "message d'envoi de l'inscription (l'extension Courriels affiche le sien)" },
  { chemin: "newsletter.error", raison: "message d'envoi de l'inscription (l'extension Courriels affiche le sien)" },
];
