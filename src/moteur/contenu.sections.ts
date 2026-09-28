// src/moteur/contenu.sections.ts - la table des sections : pour chaque entree de la collection `sections`, le chemin de chaque texte dans le dictionnaire.
//
// C'est la seule liste des textes rediges des pages. contenu.ts la lit dans
// les deux sens (la graine, tiree des fichiers, et le rendu, la base posee sur
// les fichiers), et contenu.selfcheck.ts verifie que chaque chemin existe dans
// les deux dictionnaires, que chaque champ existe dans la graine, et que la
// graine dit exactement ce que disent les fichiers.
//
// Aucun import de valeur ici, seulement des types : ce module se charge aussi
// dans Node nu (scripts/graine-sections.mjs, le self-check).

/** Un chemin dans les textes, en pointille : "home.heroTitle", "legalData.privacy.sections". */
export type Chemin = string;

/** Une tranche du champ repete `arguments` : une liste d'objets (champ de la base vers cle de l'objet), ou une liste de phrases. */
export type Tranche = { liste: Chemin; cles: Record<string, string> } | { liste: Chemin; texte: string };

/** La page qui rend la section, telle que le back office la nomme : la colonne "Page" de la liste des sections. */
export type PageDuSite =
  | "accueil"
  | "billet"
  | "blog"
  | "rubriques"
  | "auteurs"
  | "recherche"
  | "a-propos"
  | "contact"
  | "mentions-legales"
  | "confidentialite"
  | "conditions"
  | "toutes";

export type ChampSimple =
  | "title"
  | "accent"
  | "eyebrow"
  | "lede"
  | "cta"
  | "cta_secondary"
  | "note"
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
  /** Le champ repete `arguments` (titre, texte), dans l'ordre de la page : il REMPLACE la liste des fichiers. */
  arguments?: Tranche;
}

/** Les quatre textes de tete d'une page de liste : surtitre, titre, mot en couleur, chapo, et ses deux textes pour les moteurs de recherche. */
const tete = (cle: string): Section["champs"] => ({
  eyebrow: `${cle}.eyebrow`,
  title: `${cle}.title`,
  accent: `${cle}.accent`,
  lede: `${cle}.lede`,
  meta_title: `${cle}.metaTitle`,
  meta_description: `${cle}.metaDescription`,
});

/** Un document legal de src/config/legalData.json.ts : titre, description, date de revision, clauses. */
const documentLegal = (slug: "confidentialite" | "conditions", cle: "privacy" | "terms"): Section => ({
  slug,
  page: slug,
  champs: {
    title: `legalData.${cle}.title`,
    lede: `legalData.${cle}.description`,
    revised: `legalData.${cle}.lastUpdated`,
  },
  arguments: { liste: `legalData.${cle}.sections`, cles: { title: "title", body: "body" } },
});

/** Les sections, page par page, dans l'ordre de lecture. */
export const SECTIONS: readonly Section[] = [
  {
    slug: "hero",
    page: "accueil",
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
  { slug: "a-la-une", page: "accueil", champs: { eyebrow: "home.featuredEyebrow" } },
  {
    slug: "studio",
    page: "accueil",
    champs: { title: "home.aboutTitle", accent: "home.aboutAccent", lede: "home.aboutLede", cta: "home.aboutCta" },
  },
  {
    slug: "dernieres-notes",
    page: "accueil",
    champs: { title: "home.latestTitle", accent: "home.latestAccent", lede: "home.latestLede", cta: "home.latestCta" },
  },
  {
    slug: "sujets",
    page: "accueil",
    champs: { title: "home.topicsTitle", accent: "home.topicsAccent", lede: "home.topicsLede", cta: "home.topicsCta" },
  },
  {
    slug: "signatures",
    page: "accueil",
    champs: { title: "home.authorsTitle", accent: "home.authorsAccent", lede: "home.authorsLede", cta: "home.authorsCta" },
  },
  {
    slug: "lettre",
    page: "toutes",
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
    page: "accueil",
    champs: { title: "newsletter.rssTitle", lede: "newsletter.rssLede", cta: "newsletter.rssCta" },
  },
  { slug: "pied-de-page", page: "toutes", champs: { lede: "footer.tagline" } },
  {
    slug: "a-lire-ensuite",
    page: "billet",
    champs: {
      title: "post.keepReading",
      accent: "post.keepReadingAccent",
      lede: "post.keepReadingLede",
      cta: "post.keepReadingCta",
    },
  },
  { slug: "archives", page: "blog", champs: tete("archive") },
  { slug: "rubriques", page: "rubriques", champs: tete("topics") },
  { slug: "auteurs", page: "auteurs", champs: tete("authors") },
  { slug: "recherche", page: "recherche", champs: tete("search") },
  { slug: "a-propos", page: "a-propos", champs: tete("about") },
  {
    slug: "a-propos-histoire",
    page: "a-propos",
    champs: { title: "about.storyTitle", accent: "about.storyAccent" },
    arguments: { liste: "about.storyParagraphs", texte: "body" },
  },
  {
    slug: "a-propos-regles",
    page: "a-propos",
    champs: { title: "about.valuesTitle", accent: "about.valuesAccent", lede: "about.valuesLede" },
    arguments: { liste: "about.values", cles: { title: "title", body: "text" } },
  },
  {
    slug: "a-propos-signatures",
    page: "a-propos",
    champs: {
      title: "about.writersTitle",
      accent: "about.writersAccent",
      lede: "about.writersLede",
      cta: "about.writersCta",
    },
  },
  {
    slug: "a-propos-appel",
    page: "a-propos",
    champs: { title: "about.contactTitle", lede: "about.contactLede", cta: "about.contactCta" },
  },
  { slug: "contact", page: "contact", champs: tete("contact") },
  {
    slug: "contact-formulaire",
    page: "contact",
    champs: { title: "contact.formTitle", note: "contact.formNote", cta: "contact.submit" },
  },
  {
    slug: "contact-direct",
    page: "contact",
    champs: { title: "contact.directTitle", lede: "contact.directLede", cta: "contact.directCta" },
  },
  {
    slug: "contact-suite",
    page: "contact",
    champs: { title: "contact.nextTitle" },
    arguments: { liste: "contact.nextSteps", texte: "body" },
  },
  {
    slug: "mentions-legales",
    page: "mentions-legales",
    champs: { eyebrow: "legal.eyebrow", title: "legal.title", lede: "legal.description" },
    arguments: { liste: "legal.sections", cles: { title: "title", body: "body" } },
  },
  documentLegal("confidentialite", "privacy"),
  documentLegal("conditions", "terms"),
];
