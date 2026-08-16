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

import type { Locale } from "@i18n";
import { entrySlug, getLocalizedCollection } from "@i18n/content";
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
  const posts = (
    await getLocalizedCollection("posts", locale, ({ data }) => data.draft !== true)
  ).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return Promise.all(
    posts.map(async (post) => {
      const author = await getEntry(post.data.author);
      if (!author) throw new Error(`Auteur inconnu "${post.data.author.id}" dans "${post.id}"`);
      const topic = await getEntry(post.data.topic);
      if (!topic) throw new Error(`Sujet inconnu "${post.data.topic.id}" dans "${post.id}"`);
      return {
        post,
        author,
        topic,
        slug: entrySlug(post.id),
        topicSlug: entrySlug(topic.id),
        authorSlug: entrySlug(author.id),
        minutes: readingTime(post.body ?? "").minutes,
      };
    }),
  );
}

/**
 * Les sujets d'une langue, dans l'ordre editorial (champ `order`, puis nom).
 *
 * Le tri vit ici et pas dans les pages : deux pages qui trient differemment la
 * meme liste donnent deux navigations differentes, et c'est le lecteur qui paie.
 */
export async function getSortedTopics(locale: Locale): Promise<CollectionEntry<"topics">[]> {
  const topics = await getLocalizedCollection("topics", locale);
  return topics.sort(
    (a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name),
  );
}
