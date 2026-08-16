// src/config/types/configDataTypes.ts - types partagés par tous les fichiers de config de src/config.

export interface SiteDataProps {
  name: string;
  title: string;
  description: string;
  useViewTransitions?: boolean;
  author: {
    name: string;
    email: string;
    twitter?: string;
  };
  defaultImage: {
    src: string;
    alt: string;
  };
}

export interface SiteSettingsProps {
  /** Monte le ClientRouter d'Astro dans BaseHead : navigations avec view transitions. */
  useViewTransitions: boolean;
  /** Autorise les animations d'entrée (Reveal, compteurs, marquee). Le garde prefers-reduced-motion reste global. */
  useAnimations: boolean;
}

export interface NavItem {
  text: string;
  href: string;
  description?: string;
  /** Sous-entrees optionnelles. La nav de Reef est plate : le champ reste la
   *  pour l'acheteur qui ajoutera une rubrique a tiroirs, pas pour le theme. */
  children?: NavItem[];
}

export interface FooterColumn {
  /** Titre de colonne (Product, Company, Resources, Legal). */
  title: string;
  /** Les liens réutilisent NavItem : text + href suffisent ici. */
  links: NavItem[];
}

export interface PricingPlan {
  name: string;
  slug: string;
  price: { monthly: number; yearly: number };
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  /** Envoie vers la page contact plutot que vers l'inscription. C'est un booleen
   *  et non le libelle du bouton : le routage ne doit pas dependre d'une chaine
   *  traduite ("Talk to sales" devient "Parler a un commercial" en francais). */
  contactSales?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LegalSection {
  title: string;
  /** Un paragraphe de copie générique, prêt à être édité par l'acheteur. */
  body: string;
}

export interface LegalDocument {
  title: string;
  /** Description meta pour le <head> de la page. */
  description: string;
  /** Date ISO (YYYY-MM-DD), affichée telle quelle par le template. */
  lastUpdated: string;
  sections: LegalSection[];
}

/**
 * Les routes que les composants doivent connaitre sans les ecrire en dur.
 *
 * Un theme vendu dont une carte d'article contient "/posts/" en clair oblige
 * son acheteur a rouvrir les composants le jour ou son blog vit sous
 * /journal/. Toutes les cibles qui varient d'un site a l'autre passent donc
 * par ici, et un seul fichier suffit a tout rediriger.
 *
 * Toutes les valeurs sont deja localisees par getSiteRoutes, sauf le plan du
 * site : il n'en existe qu'un pour tout le domaine.
 */
export interface SiteRoutes {
  /** Accueil, cible du titre du blog dans la barre. */
  home: string;
  /** Index des articles, cible de tous les liens "voir tous les articles". */
  posts: string;
  /** Index des sujets. */
  topics: string;
  /** Index des auteurs, cible des signatures. */
  authors: string;
  /** Page a propos du studio. */
  about: string;
  /** Page de contact. */
  contact: string;
  /** Recherche cote client. */
  search: string;
  /** Flux RSS de la langue en cours. */
  rss: string;
  /** Plan du site, unique pour tout le domaine et donc jamais prefixe. */
  sitemap: string;
  /** Mentions legales. */
  imprint: string;
  /** Politique de confidentialite. */
  privacy: string;
  /** Conditions d'utilisation, servies depuis src/config/legalData.json.ts. */
  terms: string;
}
