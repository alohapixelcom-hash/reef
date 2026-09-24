// src/moteur/source.emdash.ts - la source des billets quand le moteur est allume : la base, lue a chaque requete.
//
// Un billet de la base prend ICI la forme d'une entree de collection, celle
// que les cartes, l'en-tete d'article et le flux connaissent deja. Aucun
// composant n'a ete reecrit pour le moteur, et c'est voulu : deux formes de
// billet feraient deux themes a maintenir.
import type { Locale } from "@i18n";
import type { MarkdownHeading } from "astro";
import type { CollectionEntry } from "astro:content";
import { getEmDashCollection, getEmDashEntry } from "emdash";
import GithubSlugger from "github-slugger";
import { annotationDe, estEditable, type Annotation } from "./annotations";
import { adresseDeLaCarte, cleDeLaCouverture } from "./carte-du-billet.regles";
import type { CorpsDeBillet } from "./types";

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
  tags?: unknown;
  featured?: boolean;
  pub_date?: Date | string | null;
  updated_date?: Date | string | null;
  publishedAt?: Date | string | null;
}

const texteDuBloc = (bloc: Bloc): string =>
  bloc._type === "code" ? (bloc.code ?? "") : (bloc.children ?? []).map((c) => c.text ?? "").join("");

/** Le texte brut d'un billet : sert au temps de lecture, comme `body` pour un fichier. */
const texteBrut = (blocs: Bloc[] = []): string => blocs.map(texteDuBloc).join("\n\n");

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

/** Une entree de la base, sous la forme qu'attend tout le theme. */
function enBillet(entree: Entree, locale: Locale): CollectionEntry<"posts"> {
  const d = entree.data as DonneesBillet;
  const date = d.pub_date ?? d.publishedAt ?? new Date();
  return {
    // Le slug, pas entree.id : l'id d'une traduction porte deja sa langue.
    id: `${locale}/${d.slug}`,
    collection: "posts",
    body: texteBrut(d.content),
    data: {
      title: d.title,
      description: d.description ?? "",
      pubDate: new Date(date),
      updatedDate: d.updated_date ? new Date(d.updated_date) : undefined,
      author: { collection: "authors", id: `${locale}/${d.author}` },
      topic: { collection: "topics", id: `${locale}/${d.topic}` },
      tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
      cover: couverture(d.cover),
      coverAlt: d.cover?.alt,
      featured: d.featured === true,
      draft: false,
    },
    // Garde pour corpsDuBillet : les blocs voyagent avec l'entree, hors du schema.
    blocs: d.content ?? [],
    // LE PROXY D'EDITION D'EMDASH, en mode edition seulement (voir
    // annotations.ts) : c'est lui qui donne aux gabarits l'attribut que la
    // barre d'EmDash cherche. Hors edition la cle n'existe pas, et le billet
    // a exactement la forme qu'il avait avant.
    ...(estEditable(entree.edit) ? { edition: entree.edit } : {}),
  } as unknown as CollectionEntry<"posts">;
}

export async function billetsPublies(locale: Locale): Promise<CollectionEntry<"posts">[]> {
  const billets: CollectionEntry<"posts">[] = [];
  let cursor: string | undefined;
  do {
    const page = await getEmDashCollection("posts", { locale, status: "published", limit: 100, cursor });
    if (page.error) throw page.error;
    for (const entree of page.entries) billets.push(enBillet(entree, locale));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return billets;
}

export async function billetParSlug(locale: Locale, slug: string): Promise<CollectionEntry<"posts"> | undefined> {
  const { entry, fallbackLocale } = await getEmDashEntry("posts", slug, { locale });
  // Un repli de langue servirait le billet anglais a une adresse francaise :
  // une traduction absente est un 404, pas un contenu dans la mauvaise langue.
  if (!entry || fallbackLocale) return undefined;
  return enBillet(entry, locale);
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
