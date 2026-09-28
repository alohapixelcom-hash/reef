// src/js/archive.ts - les chemins de l'archive paginee, partages par la route d'archive et, moteur allume, par la route d'article.
import { defaultLocale, locales } from "@i18n";
import { getResolvedPosts, getSortedTopics, type ResolvedPost } from "@js/posts";
import { billetsParPage } from "@moteur/source";
import type { GetStaticPaths, Page } from "astro";
import type { CollectionEntry } from "astro:content";

export interface PropsArchive {
  page: Page<ResolvedPost>;
  topics: CollectionEntry<"topics">[];
}

export const cheminsArchive = (async ({ paginate }) => {
  // Le reglage "Articles par page" du back office, sinon 9 (le theme).
  const pageSize = await billetsParPage();
  const pages = await Promise.all(
    locales.map(async (locale) => {
      const posts = await getResolvedPosts(locale);
      const topics = await getSortedTopics(locale);
      return paginate(posts, {
        pageSize,
        params: { locale: locale === defaultLocale ? undefined : locale },
        props: { topics },
      });
    }),
  );
  return pages.flat();
}) satisfies GetStaticPaths;
