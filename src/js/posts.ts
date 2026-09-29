// src/js/posts.ts - resout les billets d'une langue et leurs references (auteur, sujet) en une seule passe.
//
// Six pages listent des billets : l'accueil, l'archive, chaque sujet, chaque
// auteur, la recherche et le flux RSS. Sans ce module, chacune reecrirait le
// meme tri, le meme filtre de brouillons et la meme resolution de references,
// et la premiere qui oublierait `draft !== true` publierait un brouillon.
//
// Les references sont resolues ICI plutot que dans les cartes : une carte qui
// va chercher son auteur elle-meme force chaque grille a attendre neuf allers
// et retours au lieu d'un seul.

import { defaultLocale, type Locale } from "@i18n";
import { entrySlug } from "@i18n/content";
import { auteursPublies, billetsPublies, MOTEUR, sujetsPublies } from "@moteur/source";
import { type Etiquette, etiquettesDuBillet, versionsParDefaut } from "@js/etiquettes";
import { readingTime } from "@js/textUtils";
import { getEntry, type CollectionEntry } from "astro:content";

export interface ResolvedPost {
  post: CollectionEntry<"posts">;
  author: CollectionEntry<"authors">;
  topic: CollectionEntry<"topics">;
  /** L'id sans son prefixe de langue : le seul segment d'URL valide pour ce billet. */
  slug: string;
  /** Le slug du sujet, deja debarrasse de son prefixe de langue. */
  topicSlug: string;
  /** Le slug de l'auteur, deja debarrasse de son prefixe de langue. */
  authorSlug: string;
  /** Temps de lecture en minutes, calcule sur le corps du billet. */
  minutes: number;
  /** Les etiquettes : libelle de la langue, adresse commune (voir etiquettes.ts). */
  etiquettes: Etiquette[];
}

/**
 * Les billets PUBLIES d'une langue, du plus recent au plus ancien.
 *
 * Un brouillon se construit en local pour etre relu, mais ne rentre jamais dans
 * une liste, un flux ou un index de recherche : c'est la regle du depot, et
 * c'est cette fonction qui la tient pour tout le monde.
 *
 * Une reference cassee arrete le build au lieu de produire une page a moitie
 * vide en production : dans un site statique, l'erreur bruyante est le cadeau.
 */
export async function getResolvedPosts(locale: Locale): Promise<ResolvedPost[]> {
  // Fichiers ou base : la source est choisie par l'alias "@moteur/source", et
  // tout ce qui suit (tri, references, temps de lecture) vaut pour les deux.
  const posts = (await billetsPublies(locale)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  // Les adresses des etiquettes viennent de la version par defaut de chaque billet.
  const parDefaut = versionsParDefaut(locale, locale === defaultLocale ? [] : await billetsPublies(defaultLocale));

  return Promise.all(
    posts.map(async (post) => {
      const { author, topic } = await referencesDuBillet(post);
      return {
        post,
        author,
        topic,
        slug: entrySlug(post.id),
        topicSlug: entrySlug(topic.id),
        authorSlug: entrySlug(author.id),
        minutes: readingTime(post.body ?? "").minutes,
        etiquettes: etiquettesDuBillet(post, parDefaut.get(entrySlug(post.id))),
      };
    }),
  );
}

/**
 * L'auteur et le sujet d'un billet, lus dans les listes de la source (les
 * fichiers, ou moteur allume les collections "auteurs" et "sujets" du back
 * office), sinon dans les fichiers. Moteur eteint, une reference cassee arrete
 * le build ; moteur allume, un billet dont l'auteur ou le sujet n'est pas (ou
 * pas encore) publie garde son identifiant pour nom, plutot que de faire
 * tomber la page.
 */
export async function referencesDuBillet(post: CollectionEntry<"posts">): Promise<{ author: CollectionEntry<"authors">; topic: CollectionEntry<"topics"> }> {
  const locale = post.id.split("/")[0] as Locale;
  const [auteurs, sujets] = await Promise.all([auteursPublies(locale), sujetsPublies(locale)]);
  const author = auteurs.find((a) => a.id === post.data.author.id) ?? (await getEntry(post.data.author)) ?? repli("authors", post.data.author.id);
  if (!author) throw new Error(`Auteur inconnu "${post.data.author.id}" dans "${post.id}"`);
  const topic = sujets.find((s) => s.id === post.data.topic.id) ?? (await getEntry(post.data.topic)) ?? repli("topics", post.data.topic.id);
  if (!topic) throw new Error(`Sujet inconnu "${post.data.topic.id}" dans "${post.id}"`);
  return { author: author as CollectionEntry<"authors">, topic: topic as CollectionEntry<"topics"> };
}

/** Moteur allume seulement : une fiche minimale, nommee par son identifiant. */
function repli(collection: "authors" | "topics", id: string): CollectionEntry<"authors"> | CollectionEntry<"topics"> | undefined {
  if (!MOTEUR) return undefined;
  const nom = entrySlug(id);
  const data = collection === "authors" ? { name: nom, role: "", bio: "", links: [] } : { name: nom, description: "", accent: "coral", order: 0 };
  return { id, collection, data } as unknown as CollectionEntry<"authors">;
}

/** Les auteurs d'une langue, par nom : l'ordre de toutes les listes d'auteurs du theme. */
export async function getSortedAuthors(locale: Locale): Promise<CollectionEntry<"authors">[]> {
  return (await auteursPublies(locale)).sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/**
 * Les sujets d'une langue, dans l'ordre editorial (champ `order`, puis nom).
 *
 * Le tri vit ici et pas dans les pages : deux pages qui trient differemment la
 * meme liste donnent deux navigations differentes, et c'est le lecteur qui paie.
 */
export async function getSortedTopics(locale: Locale): Promise<CollectionEntry<"topics">[]> {
  const topics = await sujetsPublies(locale);
  return topics.sort(
    (a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name),
  );
}

/** Les etiquettes d'un seul billet (la page du billet), avec les adresses de sa version par defaut. */
export async function etiquettesDe(post: CollectionEntry<"posts">): Promise<Etiquette[]> {
  const locale = post.id.split("/")[0] as Locale;
  if (locale === defaultLocale) return etiquettesDuBillet(post);
  const slug = entrySlug(post.id);
  return etiquettesDuBillet(post, (await billetsPublies(defaultLocale)).find((p) => entrySlug(p.id) === slug));
}
