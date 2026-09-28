// src/moteur/cadre.ts - ce que le cadre du site lit sur la requete : les reglages natifs du moteur, l'entree "site" de la langue, les menus, et les donnees brutes de chaque section (photos, liens, bloc masque).
//
// MOTEUR ETEINT, RIEN N'EST POSE : chaque fonction rend le repli des fichiers
// (la configuration du theme, ses liens, la photo livree avec lui), et le build statique ne
// change pas d'un octet. Moteur allume, source.emdash.ts lit la base une fois
// par requete et textes.ts pose le resultat sur Astro.locals.cadre et
// Astro.locals.sections ; les composants lisent ici, jamais la base.
//
// LA REGLE : UN REGLAGE VIDE REND LE THEME TEL QU'IL EST. Un nom de site vide,
// un logo absent, une photo non choisie donnent le rendu des fichiers.
//
// GENERIQUE : ce fichier ne sait rien du theme. Ce que le theme sait (son nom
// et son image de partage livres, ses menus), il le passe en argument, depuis
// son adaptateur src/moteur/theme.ts (voir docs/moteur.md, "Le socle").
//
// Pur, sans aucune importation : les composants du site l'importent, et le
// scan de Tailwind ignore src/moteur/.

/** Une image choisie dans la mediatheque, telle que le moteur l'ecrit dans un champ image. */
export interface Media {
  id?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  focalX?: number;
  focalY?: number;
  meta?: Record<string, unknown>;
}

/** Une reference de media des reglages natifs (logo, favicon, image de partage), resolue par le moteur. */
export interface MediaDesReglages {
  mediaId?: string;
  alt?: string;
  url?: string;
  contentType?: string;
  width?: number;
  height?: number;
}

/** Les reglages natifs du moteur (ecran Reglages), tels que getSiteSettings les rend. */
export interface Reglages {
  title?: string;
  tagline?: string;
  logo?: MediaDesReglages;
  favicon?: MediaDesReglages;
  social?: Partial<Record<"twitter" | "github" | "facebook" | "instagram" | "linkedin" | "youtube", string>>;
  seo?: { titleSeparator?: string; defaultOgImage?: MediaDesReglages; googleVerification?: string; bingVerification?: string };
}

/** L'entree "site" d'une langue : ce que les reglages natifs n'ont pas et qui change avec la langue. */
export interface DonneesDuSite {
  description?: string;
  og_alt?: string;
  email?: string;
  form_newsletter?: string;
  form_contact?: string;
  credit_name?: string;
  credit_link?: string;
  brand_color?: string;
}

/** Un lien d'un menu natif, resolu par le moteur. */
export interface LienDeMenu {
  label: string;
  url: string;
  target?: string;
  cssClasses?: string;
  children: LienDeMenu[];
}

/** Un menu natif d'une langue. */
export interface MenuLu {
  name: string;
  label: string;
  locale: string;
  items: LienDeMenu[];
}

/** Tout ce que la page pose sur la requete pour le cadre. */
export interface Cadre {
  reglages?: Reglages;
  site?: DonneesDuSite;
  menus: ReadonlyMap<string, MenuLu>;
}

/** Les donnees brutes d'une entree publiee de `sections`, par identifiant. */
export type DonneesDesSections = ReadonlyMap<string, Record<string, unknown>>;

/**
 * Ce que le theme affiche quand rien n'est regle dans le back office : son nom,
 * sa description, son image de partage, son e-mail, son credit, son compte X.
 * L'adaptateur du theme (theme.ts, repliDuSite) le construit depuis ses
 * fichiers de configuration.
 */
export interface RepliDuSite {
  nom: string;
  description: string;
  image: { src: string; alt: string };
  email: string;
  credit: string;
  /** Le compte X sans arobase, ou une chaine vide. */
  twitter: string;
}

type Page = { locals?: { cadre?: Cadre; sections?: DonneesDesSections; editions?: ReadonlyMap<string, unknown> } };

const texte = (valeur: unknown): string | null => (typeof valeur === "string" && valeur.trim() !== "" ? valeur.trim() : null);

/**
 * Une image d'un champ du moteur, ou null si le champ est vide. EmDash 0.38
 * range une image de sa mediatheque sans son adresse (seulement
 * meta.storageKey, mesure du 28 septembre 2026) : l'adresse de son fichier se
 * deduit de cette cle ; une image d'un fournisseur externe porte previewUrl.
 */
export function media(valeur: unknown): Media | null {
  if (!valeur || typeof valeur !== "object") return null;
  const m = valeur as Media & { provider?: string; previewUrl?: string };
  if (texte(m.src)) return m;
  const cle = texte((m.meta as { storageKey?: unknown } | undefined)?.storageKey);
  if (cle && (!m.provider || m.provider === "local")) return { ...m, src: `/_emdash/api/media/file/${cle}` };
  if (texte(m.previewUrl)) return { ...m, src: m.previewUrl };
  return null;
}

/** La position de l'image autour de son point focal, en pourcentages CSS ; null sans point focal. */
export function positionFocale(m: Media): string | null {
  return typeof m.focalX === "number" && typeof m.focalY === "number" ? `${Math.round(m.focalX * 100)}% ${Math.round(m.focalY * 100)}%` : null;
}

/** L'identite du site telle que la page la rend : les reglages natifs et l'entree "site", sinon le repli du theme. */
export interface Identite {
  nom: string;
  description: string;
  /** Le logo choisi dans les reglages, ou null : le theme dessine alors son pictogramme. */
  logo: MediaDesReglages | null;
  /** Le favicon choisi dans les reglages, ou null : les favicons fabriques au build. */
  favicon: MediaDesReglages | null;
  /** L'image de partage par defaut et son texte alternatif. */
  image: { src: string; alt: string };
  /** Le separateur des titres ("Titre | Marque"). */
  separateur: string;
  /** Le compte X sans arobase (twitter:site), ou null. */
  twitter: string | null;
  /** Les reseaux renseignes dans les reglages, dans l'ordre : nom du reseau et adresse. */
  reseaux: { reseau: string; url: string }[];
  email: string;
  credit: { nom: string; lien: string };
  verification: { google: string | null; bing: string | null };
  formulaires: { newsletter: string | null; contact: string | null };
}

/** L'identite du site pour la page en cours : les reglages et l'entree "site" de la requete, sinon le repli du theme (moteur eteint : le repli seul). */
export function identite(page: Page, repli: RepliDuSite): Identite {
  const reglages = page.locals?.cadre?.reglages ?? {};
  const site = page.locals?.cadre?.site ?? {};
  // Le reglage X accepte un compte ("@onda", "onda") ou une adresse ("https://x.com/onda").
  const saisi = texte(reglages.social?.twitter);
  const compte = saisi ? saisi.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0] || null : texte(repli.twitter);
  const twitter = compte ? `https://x.com/${compte}` : null;
  const reseaux: Identite["reseaux"] = [];
  if (twitter) reseaux.push({ reseau: "X", url: twitter });
  for (const reseau of ["github", "facebook", "instagram", "linkedin", "youtube"] as const) {
    const url = texte(reglages.social?.[reseau]);
    if (url) reseaux.push({ reseau: reseau.charAt(0).toUpperCase() + reseau.slice(1), url });
  }
  const credit = texte(site.credit_name) ?? repli.credit;
  const email = texte(site.email) ?? repli.email;
  const imageDesReglages = reglages.seo?.defaultOgImage;
  return {
    nom: texte(reglages.title) ?? repli.nom,
    description: texte(site.description) ?? repli.description,
    logo: reglages.logo?.url ? reglages.logo : null,
    favicon: reglages.favicon?.url ? reglages.favicon : null,
    image: {
      src: imageDesReglages?.url ?? repli.image.src,
      alt: texte(site.og_alt) ?? (imageDesReglages?.url ? texte(imageDesReglages.alt) ?? "" : repli.image.alt),
    },
    // Saisi avec ou sans espaces ("|" ou " | "), toujours rendu entoure d'une espace.
    separateur: texte(reglages.seo?.titleSeparator) ? ` ${texte(reglages.seo?.titleSeparator)} ` : " | ",
    twitter: compte,
    reseaux,
    email,
    credit: { nom: credit, lien: texte(site.credit_link) ?? (twitter && !texte(site.credit_name) ? twitter : `mailto:${email}`) },
    verification: { google: texte(reglages.seo?.googleVerification), bing: texte(reglages.seo?.bingVerification) },
    formulaires: { newsletter: texte(site.form_newsletter), contact: texte(site.form_contact) },
  };
}

/** Un menu natif de la langue de la page, s'il existe et porte au moins un lien ; null sinon (le rendu retombe sur navData). */
export function menuDe(page: Page, nom: string, locale: string): MenuLu | null {
  const menu = page.locals?.cadre?.menus.get(nom);
  return menu && menu.locale === locale && menu.items.length > 0 ? menu : null;
}

/** Un lien tel que la barre et le pied le rendent : le libelle, l'adresse, s'il est un bouton plein, sa cible. */
export interface LienRendu {
  text: string;
  href: string;
  bouton?: boolean;
  target?: string;
}

/**
 * Les liens d'un menu natif de la langue, ou le repli des fichiers (navData)
 * quand le menu n'existe pas, est vide ou vient d'une autre langue. Un lien
 * porte la classe "bouton" (posee par la graine) quand il se rend en bouton.
 */
export function liensDuMenu(page: Page, nom: string, locale: string, repli: readonly LienRendu[]): LienRendu[] {
  const menu = menuDe(page, nom, locale);
  if (!menu) return [...repli];
  return menu.items.map((item) => ({
    text: item.label,
    href: item.url,
    ...((item.cssClasses ?? "").split(/\s+/).includes("bouton") ? { bouton: true } : {}),
    ...(item.target ? { target: item.target } : {}),
  }));
}

/**
 * La marque "cadre" d'un element, en mode edition seulement : ce qui vient
 * d'un menu ou d'un reglage du site n'est pas joignable par la barre (voir
 * CadreDuSite.astro). L'outil de couverture la lit ; un visiteur n'en recoit
 * rien.
 */
export function marqueCadre(page: Page, origine: string): Record<string, string> {
  return (page.locals?.editions?.size ?? 0) > 0 ? { "data-aloha-cadre": origine } : {};
}

/** Les donnees brutes d'une section publiee, ou un objet vide. */
export function donneesDe(page: Page, slug: string): Record<string, unknown> {
  return page.locals?.sections?.get(slug) ?? {};
}

/** Vrai quand l'editeur a masque le bloc (champ "hidden") : la page ne le monte pas pour les visiteurs. */
export function masquee(page: Page, slug: string): boolean {
  return donneesDe(page, slug).hidden === true;
}

/**
 * Vrai quand le bloc se rend : toujours pour un visiteur tant qu'il n'est pas
 * masque ; toujours en mode edition, ou le bloc masque reste visible, estompe,
 * avec sa pastille (voir styleDuBloc dans annotations.ts).
 */
export function blocVisible(page: Page, slug: string): boolean {
  return !masquee(page, slug) || (page.locals?.editions?.size ?? 0) > 0;
}

/** L'image d'un champ de la section, ou null : le theme rend alors sa photo. */
export function imageDe(page: Page, slug: string, champ = "image"): Media | null {
  return media(donneesDe(page, slug)[champ]);
}

/** L'image de partage choisie pour une page (champ meta_image de l'entree qui porte sa tete), ou undefined : celle du site. */
export function imageDePartage(page: Page, slug: string): { src: string; alt: string } | undefined {
  const m = imageDe(page, slug, "meta_image");
  return m?.src ? { src: m.src, alt: m.alt ?? "" } : undefined;
}

/** L'adresse saisie par l'editeur pour un champ de lien (cta_link, video...), ou null : la route calculee par le code. */
export function lienDe(page: Page, slug: string, champ: string): string | null {
  return texte(donneesDe(page, slug)[champ]);
}

/** La ligne de rang donne du champ "arguments" d'une section, pour ses sous-champs icon, anchor, image, link. */
export function argumentDe(page: Page, slug: string, rang: number): Record<string, unknown> {
  const lignes = donneesDe(page, slug).arguments;
  return Array.isArray(lignes) ? ((lignes[rang] as Record<string, unknown> | undefined) ?? {}) : {};
}

/**
 * La marque "interface" d'un element, en mode edition seulement : une commande
 * de l'interface laissee au code (selecteur de langue, bouton clair ou sombre),
 * que l'outil de couverture range a part. Un visiteur n'en recoit rien.
 */
export function marqueInterface(page: Page): Record<string, string> {
  return (page.locals?.editions?.size ?? 0) > 0 ? { "data-aloha-interface": "" } : {};
}
