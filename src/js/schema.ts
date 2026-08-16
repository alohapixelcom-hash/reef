// src/js/schema.ts - constructeurs JSON-LD purs et types : des objets prets pour JSON.stringify, zero paquet SEO.

/** Un noeud JSON-LD racine, pret a etre serialise dans un <script type="application/ld+json">. */
export interface JsonLdNode {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

const CONTEXT = "https://schema.org" as const;

/** Retire les cles restees a undefined : l'objet rendu est propre a serialiser et a comparer. */
function compact<T extends Record<string, unknown>>(node: T): T {
  return Object.fromEntries(Object.entries(node).filter(([, value]) => value !== undefined)) as T;
}

/** Accepte une Date ou une chaine deja formatee ; les Date sortent en ISO 8601. */
function isoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export interface OrganizationInput {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

/** Le noeud Organization du site : a poser une fois, sur la page d'accueil. */
export function organization(input: OrganizationInput): JsonLdNode {
  return compact({
    "@context": CONTEXT,
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: input.logo,
    sameAs: input.sameAs,
  });
}

export interface WebsiteInput {
  name: string;
  url: string;
  description?: string;
}

/** Le noeud WebSite : identite du site pour les moteurs, complementaire d'Organization. */
export function website(input: WebsiteInput): JsonLdNode {
  return compact({
    "@context": CONTEXT,
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    description: input.description,
  });
}

export interface ArticleInput {
  title: string;
  description: string;
  url: string;
  datePublished: Date | string;
  dateModified?: Date | string;
  image?: string;
  authorName: string;
  authorUrl?: string;
  publisherName?: string;
  publisherLogo?: string;
}

/** Le noeud Article d'un billet de blog. Les noeuds imbriques (Person, Organization) n'ont pas de @context. */
export function article(input: ArticleInput): JsonLdNode {
  return compact({
    "@context": CONTEXT,
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: input.url,
    mainEntityOfPage: input.url,
    datePublished: isoDate(input.datePublished),
    dateModified: input.dateModified === undefined ? undefined : isoDate(input.dateModified),
    image: input.image,
    author: compact({
      "@type": "Person",
      name: input.authorName,
      url: input.authorUrl,
    }),
    publisher:
      input.publisherName === undefined
        ? undefined
        : compact({
            "@type": "Organization",
            name: input.publisherName,
            logo: input.publisherLogo,
          }),
  });
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Le noeud FAQPage : une paire Question/Answer par entree, dans l'ordre recu. */
export function faqPage(entries: FaqEntry[]): JsonLdNode {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export interface BreadcrumbEntry {
  name: string;
  url: string;
}

/** Le noeud BreadcrumbList : positions 1-based, dans l'ordre recu (racine d'abord). */
export function breadcrumbList(entries: BreadcrumbEntry[]): JsonLdNode {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.url,
    })),
  };
}

export interface SoftwareApplicationInput {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  image?: string;
  /** Prix du plan d'entree. 0 est une vraie valeur : les plans gratuits existent. */
  price?: number;
  priceCurrency?: string;
  ratingValue?: number;
  ratingCount?: number;
}

/** Le noeud SoftwareApplication du produit SaaS : pour la home et la page pricing. */
export function softwareApplication(input: SoftwareApplicationInput): JsonLdNode {
  return compact({
    "@context": CONTEXT,
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: input.applicationCategory ?? "BusinessApplication",
    operatingSystem: input.operatingSystem ?? "Web",
    image: input.image,
    offers:
      input.price === undefined
        ? undefined
        : {
            "@type": "Offer",
            price: input.price,
            priceCurrency: input.priceCurrency ?? "USD",
          },
    aggregateRating:
      input.ratingValue === undefined || input.ratingCount === undefined
        ? undefined
        : {
            "@type": "AggregateRating",
            ratingValue: input.ratingValue,
            ratingCount: input.ratingCount,
          },
  });
}
