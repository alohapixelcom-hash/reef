// src/moteur/source.emdash.ts - la source des billets quand le moteur est allume : la base, lue a chaque requete.
//
// Un billet de la base prend ICI la forme d'une entree de collection, celle
// que les cartes, l'en-tete d'article et le flux connaissent deja. Aucun
// composant n'a ete reecrit pour le moteur, et c'est voulu : deux formes de
// billet feraient deux themes a maintenir.
import { getLegalData } from "@config/legalData.json.ts";
import { type Locale, useTranslations } from "@i18n";
import { getLocalizedCollection } from "@i18n/content";
import type { MarkdownHeading } from "astro";
import type { CollectionEntry } from "astro:content";
import { defaultLocale } from "@i18n";
import { getEmDashCollection, getEmDashEntry, getRequestContext, getSiteSettings, getTaxonomyTerms } from "emdash";
import GithubSlugger from "github-slugger";
import { annotationDe, estEditable, type Annotation, type Editions } from "./annotations";
import type { Cadre, DonneesDesSections } from "./cadre";
import { lireLeCadre } from "./cadre.emdash";
import { adresseDeLaCarte, cleDeLaCouverture } from "./carte-du-billet.regles";
import { type DonneesDeSection, type Textes, textesAvecLaBase } from "./contenu";
import { type DonneesAuteur, type DonneesSujet, liensDeLAuteur, teinteDuSujet } from "./listes";
import { adresseDeLaReference, ficheDe, type IndexDesFiches, indexer } from "./references";
import { MENUS } from "./theme";
import type { CorpsDeBillet } from "./types";
// Le texte brut d'un billet (temps de lecture, comme `body` pour un fichier) : jamais d'exception, meme sans texte (socle).
import { texteBrut } from "./texte-brut";

export const MOTEUR = true;

interface Bloc {
  _type: string;
  _key?: string;
  style?: string;
  code?: string;
  children?: { text?: string }[];
}

interface DonneesBillet {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content?: Bloc[];
  cover?: { id?: string; src?: string; alt?: string; width?: number; height?: number; meta?: { storageKey?: string } };
  topic: string;
  author: string;
  /** L'ancienne liste de mots (champ "Mots-cles"), avant la migration des etiquettes natives (`terms`). */
  tags?: unknown;
  terms?: { tag?: { slug?: string; label?: string; translationGroup?: string | null }[] };
  featured?: boolean;
  pub_date?: Date | string | null;
  updated_date?: Date | string | null;
  publishedAt?: Date | string | null;
  seo?: unknown;
}

const texteDuBloc = (bloc: Bloc): string =>
  bloc._type === "code" ? (bloc.code ?? "") : (bloc.children ?? []).map((c) => c.text ?? "").join("");


function couverture(cover: DonneesBillet["cover"]) {
  if (!cover) return undefined;
  const cle = cover.meta?.storageKey ?? cover.id;
  const src = cover.src ?? (cle ? `/_emdash/api/media/file/${cle}` : undefined);
  if (!src || !cover.width || !cover.height) return undefined;
  return { src, width: cover.width, height: cover.height, format: "webp" as const };
}

/** Une entree telle qu'EmDash la rend : ses donnees, et son proxy d'edition. */
interface Entree {
  id: string;
  data: unknown;
  edit?: unknown;
}

/** Ce qu'il faut pour relier un billet a son auteur, son sujet et ses etiquettes : lu une fois par requete. */
interface Liens {
  auteurs: IndexDesFiches;
  sujets: IndexDesFiches;
  /** Groupe de traductions d'une etiquette vers son adresse dans la langue par defaut (l'adresse commune). */
  etiquettes: Map<string, string>;
}

/**
 * Les etiquettes d'un billet : les etiquettes natives d'EmDash (taxonomie
 * "tag", panneau "Etiquettes" de l'article), a l'adresse commune de leur
 * groupe ; une base qui n'a pas encore migre garde sa liste de mots.
 */
function etiquettesDe(d: DonneesBillet, adresses: Map<string, string>): { slug: string; label: string }[] | undefined {
  // EmDash pose `terms` sur chaque billet des que la collection a une
  // taxonomie : c'est alors la seule source, meme vide (un billet sans
  // etiquette). La liste de mots d'avant ne sert qu'a un moteur sans `terms`.
  if (typeof d.terms !== "object" || d.terms === null) return undefined;
  return (d.terms.tag ?? [])
    .filter((e) => typeof e.slug === "string" && typeof e.label === "string")
    .map((e) => ({ slug: (e.translationGroup && adresses.get(e.translationGroup)) || (e.slug as string), label: e.label as string }));
}

/** Une entree de la base, sous la forme qu'attend tout le theme. */
function enBillet(entree: Entree, locale: Locale, liens: Liens): CollectionEntry<"posts"> {
  const d = entree.data as DonneesBillet;
  const etiquettes = etiquettesDe(d, liens.etiquettes);
  const date = d.pub_date ?? d.publishedAt ?? new Date();
  return {
    // Le slug, pas entree.id : l'id d'une traduction porte deja sa langue.
    id: `${locale}/${d.slug}`,
    collection: "posts",
    // Un billet sans texte (content null, un brouillon a peine commence) ne doit pas casser toutes les pages.
    body: texteBrut(d.content, texteDuBloc),
    data: {
      title: d.title,
      description: d.description ?? "",
      pubDate: new Date(date),
      updatedDate: d.updated_date ? new Date(d.updated_date) : undefined,
      // L'auteur et le sujet sont choisis par leur nom dans le back office
      // (champ "reference") : la base range l'identifiant de l'entree,
      // le site le ramene a son adresse. Une base d'avant range l'adresse.
      author: { collection: "authors", id: `${locale}/${adresseDeLaReference(d.author, locale, liens.auteurs)}` },
      topic: { collection: "topics", id: `${locale}/${adresseDeLaReference(d.topic, locale, liens.sujets)}` },
      tags: etiquettes ? etiquettes.map((e) => e.label) : Array.isArray(d.tags) ? d.tags.map(String) : [],
      cover: couverture(d.cover),
      coverAlt: d.cover?.alt,
      featured: d.featured === true,
      draft: false,
    },
    // Garde pour corpsDuBillet : les blocs voyagent avec l'entree, hors du schema.
    blocs: d.content ?? [],
    // Les etiquettes natives, hors du schema (src/js/etiquettes.ts les lit).
    ...(etiquettes ? { etiquettes } : {}),
    // Le panneau SEO de l'entree (titre, description, image, canonique,
    // noindex), lu par la page du billet et le plan du site ; hors du schema.
    seo: d.seo,
    // LE PROXY D'EDITION D'EMDASH, en mode edition seulement (voir
    // annotations.ts) : c'est lui qui donne aux gabarits l'attribut que la
    // barre d'EmDash cherche. Hors edition la cle n'existe pas, et le billet
    // a exactement la forme qu'il avait avant.
    ...(estEditable(entree.edit) ? { edition: entree.edit } : {}),
  } as unknown as CollectionEntry<"posts">;
}

// UNE LECTURE PAR REQUETE. Une page de billet demande les billets de sa
// langue trois fois (la page, son pied, les lectures suivantes), et chacune de
// ces demandes lisait aussi les sujets et les auteurs : neuf lectures de la
// base pour trois listes. Le resultat est garde le temps de la requete, dans
// le contexte que le moteur ouvre pour elle (le meme mecanisme que son propre
// cache de requete) ; hors requete (un script), rien n'est garde. La requete
// suivante relit la base : une publication se voit toujours a la visite
// suivante.
const PAR_REQUETE = new WeakMap<object, Map<string, Promise<unknown>>>();

function parRequete<T>(cle: string, lire: () => Promise<T>): Promise<T> {
  const contexte = getRequestContext() as object | undefined;
  if (!contexte) return lire();
  let memoire = PAR_REQUETE.get(contexte);
  if (!memoire) PAR_REQUETE.set(contexte, (memoire = new Map()));
  if (!memoire.has(cle)) memoire.set(cle, lire());
  return memoire.get(cle) as Promise<T>;
}

export async function billetsPublies(locale: Locale): Promise<CollectionEntry<"posts">[]> {
  // Une copie de la liste gardee : un appelant peut la trier sans deranger les autres.
  return [...(await parRequete(`billets:${locale}`, () => lireLesBillets(locale)))];
}

/** L'index d'une collection referencee (auteurs, sujets) dans une langue, lu une fois par requete. */
function indexDe(collection: string, locale: Locale): Promise<IndexDesFiches> {
  return parRequete(`index:${collection}:${locale}`, async () => indexer(((await toutesPubliees(collection, locale)) ?? []).map((e) => ficheDe(e.data, locale))));
}

/** Les adresses communes des etiquettes : celles de la langue par defaut, par groupe de traductions. */
function adressesDesEtiquettes(): Promise<Map<string, string>> {
  return parRequete("etiquettes", async () => {
    try {
      const termes = await getTaxonomyTerms("tag", { locale: defaultLocale, includeCounts: false });
      return new Map(termes.map((t) => [t.translationGroup ?? t.id, t.slug]));
    } catch {
      return new Map();
    }
  });
}

async function liensDe(locale: Locale): Promise<Liens> {
  const [auteurs, sujets, etiquettes] = await Promise.all([indexDe("auteurs", locale), indexDe("sujets", locale), adressesDesEtiquettes()]);
  return { auteurs, sujets, etiquettes };
}

async function lireLesBillets(locale: Locale): Promise<CollectionEntry<"posts">[]> {
  const liens = await liensDe(locale);
  const billets: CollectionEntry<"posts">[] = [];
  let cursor: string | undefined;
  do {
    const page = await getEmDashCollection("posts", { locale, status: "published", limit: 100, cursor });
    if (page.error) throw page.error;
    for (const entree of page.entries) billets.push(enBillet(entree, locale, liens));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return billets;
}

export async function billetParSlug(locale: Locale, slug: string): Promise<CollectionEntry<"posts"> | undefined> {
  const { entry, fallbackLocale } = await getEmDashEntry("posts", slug, { locale });
  // Un repli de langue servirait le billet anglais a une adresse francaise :
  // une traduction absente est un 404, pas un contenu dans la mauvaise langue.
  if (!entry || fallbackLocale) return undefined;
  return enBillet(entry, locale, await liensDe(locale));
}

/** Toutes les entrees publiees d'une collection dans une langue ; null si la collection n'existe pas (une base pas encore migree). */
async function toutesPubliees(collection: string, locale: Locale): Promise<Entree[] | null> {
  const entrees: Entree[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await getEmDashCollection(collection, { locale, status: "published", limit: 100, cursor });
      if (page.error) return null;
      entrees.push(...(page.entries as Entree[]));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  } catch {
    return null;
  }
  return entrees;
}

/** Une media de la base, reduite a ce que le theme lit d'une image de contenu (src, largeur, hauteur). */
function imageDe(valeur: unknown): { src: string; width: number; height: number } | undefined {
  const m = valeur as DonneesBillet["cover"];
  if (!m) return undefined;
  const cle = m.meta?.storageKey ?? m.id;
  const src = m.src ?? (cle ? `/_emdash/api/media/file/${cle}` : undefined);
  return src ? { src, width: m.width ?? 0, height: m.height ?? 0 } : undefined;
}

/** Un sujet de la base, sous la forme d'une entree de la collection topics. */
function enSujet(entree: Entree, locale: Locale): CollectionEntry<"topics"> {
  const d = entree.data as DonneesSujet;
  const slug = d.slug ?? entree.id;
  return {
    id: `${locale}/${slug}`,
    collection: "topics",
    data: { name: d.name ?? slug, description: d.description ?? "", accent: teinteDuSujet(d.color), order: typeof d.order === "number" ? d.order : 0 },
    image: imageDe(d.image),
    seo: d.seo,
    ...(estEditable(entree.edit) ? { edition: entree.edit } : {}),
  } as unknown as CollectionEntry<"topics">;
}

/** Un auteur de la base, sous la forme d'une entree de la collection authors. */
function enAuteur(entree: Entree, locale: Locale): CollectionEntry<"authors"> {
  const d = entree.data as DonneesAuteur;
  const slug = d.slug ?? entree.id;
  return {
    id: `${locale}/${slug}`,
    collection: "authors",
    data: { name: d.name ?? slug, role: d.role ?? "", bio: d.bio ?? "", avatar: imageDe(d.avatar), links: liensDeLAuteur(d.links) },
    seo: d.seo,
    ...(estEditable(entree.edit) ? { edition: entree.edit } : {}),
  } as unknown as CollectionEntry<"authors">;
}

/**
 * Les sujets publies d'une langue (collection "sujets"). Une base qui n'a pas
 * la collection, ou qui n'en publie aucun dans la langue, rend les fichiers de
 * src/data/topics : le rendu des fichiers.
 */
export async function sujetsPublies(locale: Locale): Promise<CollectionEntry<"topics">[]> {
  return [...(await parRequete(`sujets:${locale}`, () => lireLesSujets(locale)))];
}

async function lireLesSujets(locale: Locale): Promise<CollectionEntry<"topics">[]> {
  const entrees = await toutesPubliees("sujets", locale);
  if (!entrees || entrees.length === 0) return getLocalizedCollection("topics", locale);
  return entrees.map((entree) => enSujet(entree, locale));
}

/** Les auteurs publies d'une langue (collection "auteurs"), sinon les fichiers de src/data/authors. */
export async function auteursPublies(locale: Locale): Promise<CollectionEntry<"authors">[]> {
  return [...(await parRequete(`auteurs:${locale}`, () => lireLesAuteurs(locale)))];
}

async function lireLesAuteurs(locale: Locale): Promise<CollectionEntry<"authors">[]> {
  const entrees = await toutesPubliees("auteurs", locale);
  if (!entrees || entrees.length === 0) return getLocalizedCollection("authors", locale);
  return entrees.map((entree) => enAuteur(entree, locale));
}

/** Le nombre de billets par page des listes : le reglage "Articles par page" du back office, sinon 9 (le theme). */
export async function billetsParPage(): Promise<number> {
  return parRequete("par-page", lireLeNombreParPage);
}

async function lireLeNombreParPage(): Promise<number> {
  try {
    const n = ((await getSiteSettings()) as { postsPerPage?: unknown } | null)?.postsPerPage;
    return typeof n === "number" && Number.isInteger(n) && n >= 1 ? n : 9;
  } catch {
    return 9;
  }
}

/** Les titres du billet, avec les memes ancres que celles d'un fichier Markdown. */
export async function corpsDuBillet(billet: CollectionEntry<"posts">): Promise<CorpsDeBillet> {
  const blocs = ((billet as unknown as { blocs?: Bloc[] }).blocs ?? []) as Bloc[];
  // Le meme fabricant d'ancres qu'Astro pour un fichier Markdown : un lien
  // deja partage vers un intertitre survit au passage en base.
  const ancres = new GithubSlugger();
  const headings: MarkdownHeading[] = [];
  for (const bloc of blocs) {
    const m = bloc._type === "block" ? /^h([1-6])$/.exec(bloc.style ?? "") : null;
    if (!m) continue;
    const text = texteDuBloc(bloc);
    const slug = ancres.slug(text);
    // L'ancre voyage sur le bloc : TitreAncre.astro la pose sur la balise.
    (bloc as Bloc & { ancre?: string }).ancre = slug;
    headings.push({ depth: Number(m[1]), slug, text });
  }
  return { blocs, headings };
}

/**
 * L'attribut data-emdash-ref d'un billet (champ absent) ou d'un de ses champs
 * ("title", "description", "cover"), a etaler sur la balise qui l'affiche.
 * Un objet vide pour un visiteur anonyme : voir annotations.ts.
 */
export const annotation = (billet: CollectionEntry<"posts">, champ?: string): Annotation =>
  annotationDe((billet as unknown as { edition?: unknown }).edition, champ);

/**
 * L'adresse de la carte de partage d'un billet : sa couverture de la
 * mediatheque, recadree a la demande en JPEG 1200x630 par la route
 * /og/billet/<cle>.jpg (carte-du-billet.ts). Sans couverture, ou pour une
 * couverture hors de la mediatheque, undefined : la page prend la carte par
 * defaut du site.
 */
export async function carteDuBillet(billet: CollectionEntry<"posts">): Promise<string | undefined> {
  const src = billet.data.cover?.src;
  const cle = src ? cleDeLaCouverture(src) : undefined;
  return cle ? adresseDeLaCarte(cle) : undefined;
}

/** Les textes des fichiers d'une langue : le dictionnaire complet et les deux documents legaux, sur lesquels la base se pose. */
export function textesDesFichiers(locale: Locale): Textes {
  return { ...useTranslations(locale), legalData: getLegalData(locale) };
}

/**
 * Les sections PUBLIEES d'une langue, par slug, et leurs proxys d'edition (en
 * mode edition seulement : voir annotations.ts). Une base qui n'a pas encore
 * la collection (migrations/import-3.3.0-reef.sql pas encore passe, voir
 * DEPLOY.md) ne casse pas le site : la page garde les textes des
 * fichiers, et le journal du Worker le dit.
 */
async function sectionsPubliees(locale: Locale): Promise<{ sections: Map<string, DonneesDeSection>; editions: Editions }> {
  const sections = new Map<string, DonneesDeSection>();
  const editions = new Map<string, unknown>();
  try {
    let cursor: string | undefined;
    do {
      const page = await getEmDashCollection("sections", { locale, status: "published", limit: 100, cursor });
      if (page.error) throw page.error;
      for (const entree of page.entries as Entree[]) {
        const donnees = entree.data as DonneesDeSection & { slug?: string };
        const slug = donnees.slug ?? entree.id;
        sections.set(slug, donnees);
        if (estEditable(entree.edit)) editions.set(slug, entree.edit);
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  } catch (erreur) {
    console.error("[reef] sections illisibles, textes des fichiers :", erreur);
    return { sections: new Map(), editions: new Map() };
  }
  return { sections, editions };
}

/**
 * Les textes rediges de la page dans cette langue (les fichiers, completes par
 * ce que la base publie), les proxys d'edition des sections, le CADRE (les
 * reglages natifs, l'entree "site" de la langue et les menus natifs de la
 * langue, lus par cadre.ts) et les donnees brutes de chaque section (photos,
 * adresses des boutons, bloc masque), lues une fois par requete.
 */
export async function lireLaPage(locale: Locale): Promise<{ textes: Textes; editions: Editions; cadre: Cadre; sections: DonneesDesSections }> {
  const [{ sections, editions }, cadreLu] = await Promise.all([sectionsPubliees(locale), lireLeCadre(locale, MENUS.map((m) => m.nom))]);
  if (estEditable(cadreLu.edition)) (editions as Map<string, unknown>).set("site", cadreLu.edition);
  return {
    textes: textesAvecLaBase(textesDesFichiers(locale), sections),
    editions,
    cadre: { reglages: cadreLu.reglages, site: cadreLu.site, menus: cadreLu.menus },
    sections,
  };
}
