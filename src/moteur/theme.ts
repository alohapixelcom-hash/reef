// src/moteur/theme.ts - L'ADAPTATEUR DE REEF au socle Aloha Pixel : ce que les fichiers generiques du moteur ont besoin de savoir de ce theme-ci, et rien d'autre.
//
// LE SOCLE (cadre.ts, menus.ts, site.ts, palette.ts, icones.ts, pages.ts,
// textes-edition.ts, cadre.emdash.ts, cadre.fichiers.ts, CadreDuSite.astro,
// Pastilles.astro, PhotoDuMoteur.astro, texte-riche.*.astro, et les scripts
// navigateur.mjs, couverture-edition.mjs, sql-par-difference.mjs) est le meme
// dans tous les sites de la maison, copie a l'octet depuis Swell. Chaque theme
// fournit ce fichier, sous ce nom, avec ces exports :
//   - MENUS et COLONNES_DU_PIED : ses menus natifs (noms, libelles, routes) ;
//   - routesDesMenus(locale) : les adresses que ses menus ouvrent ;
//   - repliDuSite(locale) et identiteDuSite(page, locale) : son identite
//     livree, rendue quand les reglages du back office sont vides ;
//   - variablesDeLaPalette(teinte) : ses jetons de couleur pour la teinte
//     VISIBLE que le nom de la couleur dit (palette.ts), par la
//     recette de son `pnpm rebrand` ;
//   - VARIABLES_DE_POLICE : ses jetons de police (texte et titres), que la
//     police choisie dans le back office repeint (typographie.ts, socle) ;
//   - VARIABLES_D_EDITION : ses jetons, pour les pastilles et le panneau du
//     mode edition ;
//   - ROUTES_DU_THEME : les segments d'adresse que ses pages fixes prennent
//     (une page libre du back office ne peut pas s'appeler ainsi) ;
//   - ICONES : les noms francais des icones qu'un editeur choisit ;
//   - ADMIN_EXTERNE : le back office d'un catalogue externe ; null ici ;
//   - ADRESSES_DE_COUVERTURE : les pages que scripts/couverture-edition.mjs
//     parcourt (un exemplaire de chaque gabarit, dans les deux langues) ;
//   - ESSAI_DE_L_ADMINISTRATION : les parametres des gestes communs du guide
//     rejoue (essai-administrer.mjs ; forme : essai.ts).
import type { IconName } from "@components/svg/icons";
import { getSiteRoutes } from "@config/navData.json.ts";
import siteData from "@config/siteData.json";
import type { Locale } from "@i18n";
import { ACTIONS, type MenuDuSite, PRINCIPAL, TIROIR } from "./menus.ts";
import { identite, type Identite, type RepliDuSite } from "./cadre.ts";
import type { ParametresDeLEssai } from "./essai.ts";
import { garantirLeContraste, type RegleDeContraste } from "./palette.ts";
import type { VariablesDePolice } from "./typographie.ts";

/** Les menus de Reef, dans l'ordre du back office : la barre, le tiroir, le bouton S'abonner, les trois colonnes du pied. */
export const MENUS: readonly MenuDuSite[] = [
  {
    nom: PRINCIPAL,
    libelle: "",
    liens: [
      { libelle: "nav.posts", route: "posts" },
      { libelle: "nav.topics", route: "topics" },
      { libelle: "nav.about", route: "about" },
      { libelle: "nav.contact", route: "contact" },
    ],
  },
  {
    nom: TIROIR,
    libelle: "",
    liens: [
      { libelle: "nav.authors", route: "authors" },
      { libelle: "nav.search", route: "search" },
    ],
  },
  {
    nom: ACTIONS,
    libelle: "",
    liens: [{ libelle: "nav.subscribe", route: "newsletter", classes: "bouton" }],
  },
  {
    nom: "pied-lire",
    libelle: "footer.colRead",
    liens: [
      { libelle: "nav.posts", route: "posts" },
      { libelle: "nav.topics", route: "topics" },
      { libelle: "nav.authors", route: "authors" },
      { libelle: "footer.rss", route: "rss" },
    ],
  },
  {
    nom: "pied-studio",
    libelle: "footer.colStudio",
    liens: [
      { libelle: "nav.about", route: "about" },
      { libelle: "nav.contact", route: "contact" },
    ],
  },
  {
    nom: "pied-legal",
    libelle: "footer.colLegal",
    liens: [
      { libelle: "footer.imprint", route: "imprint" },
      { libelle: "footer.privacy", route: "privacy" },
    ],
  },
];

/** Les colonnes du pied, dans l'ordre de getFooterData (src/config/navData.json.ts). */
export const COLONNES_DU_PIED = ["pied-lire", "pied-studio", "pied-legal"] as const;

/**
 * Les adresses que les menus de Reef ouvrent dans une langue : les routes du
 * theme, plus l'ancre de la lettre d'information, la meme sur toutes les pages
 * et dans toutes les langues (le bouton S'abonner la vise, voir Navbar.astro).
 */
export function routesDesMenus(locale: Locale): Record<string, string> {
  return { ...(getSiteRoutes(locale) as unknown as Record<string, string>), newsletter: "#newsletter" };
}

/** L'identite livree de Reef dans une langue : siteData, ce que la page montre quand les reglages sont vides. */
export function repliDuSite(locale: "en" | "fr"): RepliDuSite {
  return {
    nom: siteData.name,
    description: siteData.description,
    image: { src: siteData.defaultImage.src, alt: siteData.defaultImage.alt[locale] },
    email: siteData.author.email,
    credit: siteData.author.name,
    twitter: siteData.author.twitter ?? "",
  };
}

/** L'identite du site pour la page en cours (reglages, entree "site", sinon siteData). */
export function identiteDuSite(page: Parameters<typeof identite>[0], locale: "en" | "fr"): Identite {
  return identite(page, repliDuSite(locale));
}

/** Les jetons de police de Reef (tokens.css) : Instrument Sans pour le texte, Space Grotesk pour les titres. */
export const VARIABLES_DE_POLICE: VariablesDePolice = { texte: ["--font-sans"], titre: ["--font-display"] };

/** Les jetons de Reef pour les pastilles et le panneau "Cadre du site" (voir STYLES dans textes-edition.ts). */
export const VARIABLES_D_EDITION: Record<string, string> = {
  "--edition-accent": "var(--reef-primary)",
  "--edition-accent-encre": "var(--reef-primary-foreground)",
  "--edition-fond": "var(--reef-background)",
  "--edition-encre": "var(--reef-foreground)",
  "--edition-bord": "var(--reef-border)",
  "--edition-discret": "var(--reef-muted-foreground)",
  "--edition-police": "var(--font-sans)",
  "--edition-police-titre": "var(--font-display)",
};

/** Les segments d'adresse que Reef prend deja : une page libre du back office ne peut pas s'appeler ainsi. */
export const ROUTES_DU_THEME = [
  "blog",
  "topics",
  "authors",
  "about",
  "contact",
  "search",
  "legal",
  "privacy",
  "terms",
  "og",
  "rss.xml",
  "404",
  "404-introuvable",
  "page-libre",
  "page-introuvable",
  "secret-spot",
  "sections",
  "sujets",
  "auteurs",
  "posts",
  "pages",
  "site",
];

/**
 * Les icones qu'un editeur peut choisir, sous un nom francais, et l'icone de
 * Reef que chaque nom dessine. Aucun bloc de Reef ne dessine encore d'icone
 * par element : la table est la meme que celle des autres themes, pour qu'un
 * bloc qui en prendrait une parle la meme langue.
 */
export const ICONES = {
  Coche: "check",
  "Coche dans un cercle": "check-circle",
  Éclair: "zap",
  Bouclier: "shield",
  Cadenas: "lock",
  Enveloppe: "mail",
  Téléphone: "phone",
  Lieu: "map-pin",
  Calendrier: "calendar",
  Horloge: "clock",
  Personne: "user",
  Équipe: "users",
  Réglages: "settings",
  Graphique: "chart-bar",
  Courbe: "chart-line",
  Tendance: "trending-up",
  Étincelles: "sparkles",
  Vague: "wave",
  Calques: "layers",
  Grille: "grid",
  Code: "code",
  Fusée: "rocket",
  Globe: "globe",
  Lien: "link",
  Téléchargement: "download",
  Envoi: "send",
  Lecture: "play",
  Citation: "quote",
  Information: "info",
  Alerte: "alert-triangle",
  "Carte bancaire": "credit-card",
  Reçu: "receipt",
  Colis: "box",
  Cadeau: "gift",
  Livre: "book",
  Document: "file-text",
  Dossier: "folder",
  Image: "image",
  Cœur: "heart",
  Étoile: "star",
} as const satisfies Record<string, IconName>;

/** Les pages que l'outil de couverture de la barre parcourt : chaque gabarit, dans les deux langues, la page introuvable comprise. */
export const ADRESSES_DE_COUVERTURE = [
  "/", "/fr/",
  "/blog/", "/fr/blog/",
  "/blog/a-type-scale-you-can-defend/", "/fr/blog/a-type-scale-you-can-defend/",
  "/topics/", "/fr/topics/",
  "/topics/craft/", "/fr/topics/craft/",
  "/authors/", "/fr/authors/",
  "/authors/mara-lindqvist/", "/fr/authors/mara-lindqvist/",
  "/search/", "/fr/search/",
  "/about/", "/fr/about/",
  "/contact/", "/fr/contact/",
  "/legal/", "/fr/legal/",
  "/privacy/", "/fr/privacy/",
  "/terms/", "/fr/terms/",
  "/nope/", "/fr/nope/",
];

/** Reef n'a pas de catalogue externe. */
export const ADMIN_EXTERNE: { libelle: string; url: string } | null = null;

// LA COULEUR DE LA MARQUE, par la recette de scripts/rebrand.mjs : l'accent
// (rampe coral : liens, mot en script) sur la teinte nommee, telle quelle
// (palette.ts : "Bleu océan" est un bleu), les deux neutres (ink
// et paper) sur une teinte froide d'ancrage. Les boutons pleins (rampe reef)
// prennent AUSSI la teinte nommee : `pnpm rebrand` tourne cette rampe
// de 181 degres, ce qui rendait "Bleu océan" en boutons orange.
function hslVersHex(h: number, s: number, l: number): string {
  const t = ((h % 360) + 360) % 360;
  const f = (n: number): string => {
    const k = (n + t / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Les paliers et rotations de scripts/rebrand.mjs, recopies a l'identique.
const CORAL: [number, number, number][] = [
  [50, 0.97, 0.55], [100, 0.93, 0.7], [200, 0.85, 0.85], [300, 0.75, 0.95], [400, 0.63, 1.0],
  [500, 0.55, 1.0], [600, 0.47, 0.95], [700, 0.39, 0.9], [800, 0.33, 0.85], [900, 0.28, 0.8],
];
const INK: [number, number, number][] = [
  [50, 0.965, 0.4], [100, 0.93, 0.34], [200, 0.85, 0.3], [300, 0.72, 0.26], [400, 0.56, 0.22], [500, 0.42, 0.23],
  [600, 0.32, 0.26], [700, 0.25, 0.27], [800, 0.17, 0.3], [900, 0.12, 0.32], [950, 0.06, 0.38],
];
const PAPER: [number, number, number][] = [
  [50, 0.985, 0.55], [100, 0.96, 0.44], [200, 0.92, 0.38],
];
const REEF: [number, number, number][] = [
  [300, 0.72, 0.78], [400, 0.56, 0.72], [500, 0.44, 0.77], [600, 0.35, 0.78], [700, 0.28, 0.78],
];
const ROTATION_INK = 205;
const estFroid = (h: number): boolean => h >= 150 && h <= 280;

function teinteAncrage(h: number): number {
  const tournee = (h + ROTATION_INK) % 360;
  if (estFroid(tournee)) return tournee;
  if (estFroid(h % 360)) return h % 360;
  return Math.abs(tournee - 150) <= Math.abs(tournee - 280) ? 150 : 280;
}

/** Les variables des quatre rampes de tokens.css pour la teinte visible nommee (palette.ts). */
function rampesDeLaPalette(h: number): Record<string, string> {
  const vars: Record<string, string> = {};
  // L'accent est pose sur la luminosite du palier 400 : pas de decalage de courbe.
  for (const [pas, l, sat] of CORAL) vars[`--color-coral-${pas}`] = hslVersHex(h, Math.min(1, sat), l);
  const base = teinteAncrage(h);
  for (const [pas, l, s] of INK) vars[`--color-ink-${pas}`] = hslVersHex(base, s, l);
  for (const [pas, l, s] of PAPER) vars[`--color-paper-${pas}`] = hslVersHex(base, s, l);
  // Les boutons disent le nom de la couleur : meme teinte que l'accent, sans rotation.
  for (const [pas, l, s] of REEF) vars[`--color-reef-${pas}`] = hslVersHex(h, s, l);
  return vars;
}

// LE CONTRASTE DES BOUTONS : le fond des boutons pleins et
// l'encre qui s'y ecrit, en clair (palier 600, texte blanc) et en sombre
// (palier 400, texte du fond le plus sombre), releves dans le Chrome du Mac
// sur le build. garantirLeContraste (palette.ts)
// pousse ces fonds jusqu'a 4,5:1 au moins pour chaque couleur de la marque.
// Les noms des variables sont composes : ecrits en entier, Tailwind les
// lirait ici et les ajouterait a la feuille.
const NEUTRE = "--color-ink";
const RAMPE = "--color-reef";
export const CONTRASTE_DES_BOUTONS: RegleDeContraste[] = [
  { fond: `${RAMPE}-600`, encre: "#ffffff" },
  { fond: `${RAMPE}-400`, encre: `${NEUTRE}-950` },
];

/** Les variables de tokens.css pour la teinte visible nommee (palette.ts), chaque bouton lisible (CONTRASTE_DES_BOUTONS). */
export function variablesDeLaPalette(teinte: number): Record<string, string> {
  return garantirLeContraste(rampesDeLaPalette(teinte), CONTRASTE_DES_BOUTONS);
}

/** Les gestes communs du guide rejoue (scripts/essai-administrer.mjs) ; les reglages, sujets et billets sont dans scripts/essai-administrer.site.mjs. */
export const ESSAI_DE_L_ADMINISTRATION: ParametresDeLEssai = {
  image: "public/reef-iphone-poster.webp",
  titre: { entree: "hero", selecteur: "#hero-title" },
  bandeau: { selecteur: '[data-slot="home-hero"]' },
  masquer: { entree: "signatures", marqueur: 'aria-labelledby="writers-title"' },
  menu: { nom: "principal", rang: 0, libelle: "Posts" },
  pied: { menu: "pied-studio", page: "/about/" },
  nomDuSite: { valeur: "Reef", page: "/about/" },
  logo: { motif: 'style="height:1\\.5rem;width:auto"' },
  pageLibre: { menu: "principal" },
  redirection: { vers: "/about/" },
  seo: { entree: "contact", page: "/contact/" },
};

// LA CARTE DES CHAMPS DE CHAQUE BLOC : relevee par la sonde, textes compris,
// dans champs-des-blocs.site.ts (un champ qui ne change rien sur la page d'un bloc est cache dans son ecran).
export { CHAMPS_DES_BLOCS } from "./champs-des-blocs.site.ts";
