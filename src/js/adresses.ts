// src/js/adresses.ts - les chemins des pages dynamiques (billet, sujet, auteur), partages par chaque page et, moteur allume, par le plan de site.
//
// POURQUOI ILS SORTENT DES PAGES : le plan de site du moteur (src/moteur/
// plan-du-site.ts) rejoue le getStaticPaths de chaque page geree. Tant qu'il
// importait les pages elles-memes, chacune cessait d'etre une frontiere pour
// Astro, qui a alors verse la feuille de style du theme (127 ko) dans le
// back office et dans le manifeste de 73 routes d'API. Mesure le 21 septembre
// 2026 : le back office heritait de la taille de police fluide du site. Une
// page n'est importee par personne ; ses chemins, si.
import { defaultLocale, locales } from "@i18n";
import { entryLocale, entrySlug } from "@i18n/content";
import { getResolvedPosts, getSortedTopics, referencesDuBillet } from "@js/posts";
import { auteursPublies, billetsParPage, billetsPublies } from "@moteur/source";
import type { GetStaticPaths } from "astro";

/** Un billet par langue : l'adresse ne porte que le slug, la langue est deja dans le param locale. */
export const cheminsDuBillet = (async () => {
  // Les brouillons se previsualisent dans l'editeur prive, jamais a une URL publique.
  // Fichiers ou base : la source ne rend que les billets publies.
  const posts = (await Promise.all(locales.map((locale) => billetsPublies(locale)))).flat();

  return Promise.all(
    posts.map(async (post) => {
      // Une reference cassee arrete le build avec le nom du fichier fautif,
      // plutot que de rendre une page a moitie vide en production.
      const { author, topic } = await referencesDuBillet(post);

      const locale = entryLocale(post.id);
      return {
        params: {
          // undefined genere la route sans prefixe : l'anglais est servi a la
          // racine, les autres langues sous leur code.
          locale: locale === defaultLocale ? undefined : locale,
          id: entrySlug(post.id),
        },
        props: { post, author, topic },
      };
    }),
  );
}) satisfies GetStaticPaths;

/** L'archive paginee d'un sujet, par langue. */
export const cheminsDuSujet = (async ({ paginate }) => {
  const pageSize = await billetsParPage();
  const groups = await Promise.all(
    locales.map(async (locale) => {
      const posts = await getResolvedPosts(locale);
      const topics = await getSortedTopics(locale);

      return topics.flatMap((topic) => {
        const slug = entrySlug(topic.id);
        const inTopic = posts.filter((entry) => entry.topicSlug === slug);
        return paginate(inTopic, {
          pageSize,
          params: { locale: locale === defaultLocale ? undefined : locale, topic: slug },
          props: { topic, topics },
        });
      });
    }),
  );
  return groups.flat();
}) satisfies GetStaticPaths;

/** La page d'un auteur avec ses billets, par langue. */
export const cheminsDeLAuteur = (async () => {
  const groups = await Promise.all(
    locales.map(async (locale) => {
      const authors = await auteursPublies(locale);
      const posts = await getResolvedPosts(locale);

      return authors.map((author) => {
        const slug = entrySlug(author.id);
        return {
          params: { locale: locale === defaultLocale ? undefined : locale, author: slug },
          props: { author, posts: posts.filter((entry) => entry.authorSlug === slug) },
        };
      });
    }),
  );
  return groups.flat();
}) satisfies GetStaticPaths;

/**
 * L'archive paginee d'une etiquette, par langue. Une page par
 * etiquette portee par au moins un billet publie de la langue : une etiquette
 * sans billet n'a pas de page, et son adresse repond 404.
 */
export const cheminsDeLEtiquette = (async ({ paginate }) => {
  const pageSize = await billetsParPage();
  const groups = await Promise.all(
    locales.map(async (locale) => {
      const posts = await getResolvedPosts(locale);
      const libelles = new Map<string, string>();
      for (const entry of posts) for (const e of entry.etiquettes) if (!libelles.has(e.slug)) libelles.set(e.slug, e.label);
      return [...libelles].flatMap(([slug, label]) =>
        paginate(
          posts.filter((entry) => entry.etiquettes.some((e) => e.slug === slug)),
          { pageSize, params: { locale: locale === defaultLocale ? undefined : locale, tag: slug }, props: { etiquette: { slug, label } } },
        ),
      );
    }),
  );
  return groups.flat();
}) satisfies GetStaticPaths;
