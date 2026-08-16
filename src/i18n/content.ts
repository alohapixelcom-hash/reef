// src/i18n/content.ts - le pont entre les collections de contenu et les langues.
//
// Les fichiers de src/data vivent dans un sous-dossier par langue, donc leurs id
// sont prefixes : "en/from-nps-to-roadmap", "fr/from-nps-to-roadmap". Ces deux
// entrees sont le MEME billet dans deux langues, et c'est cette convention qui
// permet au selecteur de langue d'emmener le lecteur sur la traduction de
// l'article qu'il lit, au lieu de le renvoyer a l'accueil.
//
// Tout ce qui manipule un id de collection passe par ici. Aucun composant ne
// decoupe une chaine a la main.

import { getCollection, type CollectionEntry, type CollectionKey } from "astro:content";
import { defaultLocale, isLocale, locales, type Locale } from "./config";

/** "en/from-nps-to-roadmap" -> "from-nps-to-roadmap". Le slug est le meme dans toutes les langues. */
export function entrySlug(id: string): string {
  const at = id.indexOf("/");
  if (at < 0) return id;
  return isLocale(id.slice(0, at)) ? id.slice(at + 1) : id;
}

/** "en/from-nps-to-roadmap" -> "en". Retombe sur la langue par defaut pour un contenu non range. */
export function entryLocale(id: string): Locale {
  const at = id.indexOf("/");
  if (at < 0) return defaultLocale;
  const head = id.slice(0, at);
  return isLocale(head) ? head : defaultLocale;
}

/** L'id de la meme entree dans une autre langue. Ne garantit pas qu'elle existe. */
export function entryIdIn(id: string, locale: Locale): string {
  return `${locale}/${entrySlug(id)}`;
}

/**
 * Les entrees d'une collection pour une langue donnee.
 *
 * `filter` s'applique APRES le filtre de langue, ce qui evite d'avoir a repeter
 * la condition de langue dans chaque appelant.
 */
export async function getLocalizedCollection<C extends CollectionKey>(
  collection: C,
  locale: Locale,
  filter?: (entry: CollectionEntry<C>) => boolean,
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection, (entry: CollectionEntry<C>) => {
    if (entryLocale(entry.id) !== locale) return false;
    return filter ? filter(entry) : true;
  });
  return entries;
}

/**
 * Les langues dans lesquelles une entree existe reellement.
 *
 * Un billet traduit en francais mais pas en espagnol ne doit pas apparaitre
 * dans le hreflang espagnol : declarer une alternative qui renvoie un 404 est
 * pire que ne rien declarer du tout.
 */
export async function localesForEntry<C extends CollectionKey>(
  collection: C,
  slug: string,
): Promise<Locale[]> {
  const all = await getCollection(collection);
  const available = new Set(all.map((entry) => entryLocale(entry.id) + "/" + entrySlug(entry.id)));
  return locales.filter((locale) => available.has(`${locale}/${slug}`));
}
