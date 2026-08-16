// src/pages/[...locale]/rss.xml.ts - flux RSS 2.0 ecrit a la main, un par langue : lit la collection posts, zero dependance.
//
// Un flux PAR LANGUE, et pas un flux melange : un lecteur francophone qui
// s'abonne ne veut pas voir arriver la moitie des titres en anglais. L'anglais
// garde /rss.xml, le francais obtient /fr/rss.xml, et chaque page declare le
// sien dans son <head> (voir BaseHead).
import siteData from "@config/siteData.json";
import { getLocale, localeMeta, localePaths, localizePath, useTranslations } from "@i18n";
import { getResolvedPosts } from "@js/posts";
import type { APIRoute } from "astro";

export const getStaticPaths = localePaths;

// Echappement XML minimal, suffisant pour des titres et des descriptions.
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async ({ site, url, currentLocale }) => {
  const base = site ?? url;
  const absolute = (path: string): string => new URL(path, base).href;

  const locale = getLocale({ currentLocale });
  const t = useTranslations(locale);

  // getResolvedPosts ecarte deja les brouillons et trie du plus recent au plus
  // ancien : le flux ne peut donc pas diverger des listes du site.
  const posts = await getResolvedPosts(locale);

  const items = posts
    .map(({ post, topic, slug, author }) => {
      const link = absolute(localizePath(`/blog/${slug}/`, locale));
      return [
        "    <item>",
        `      <title>${escapeXml(post.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <description>${escapeXml(post.data.description)}</description>`,
        `      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>`,
        `      <category>${escapeXml(topic.data.name)}</category>`,
        // dc:creator plutot que <author> : la balise RSS 2.0 native exige une
        // adresse email, qu'un theme n'a aucune raison de publier.
        `      <dc:creator>${escapeXml(author.data.name)}</dc:creator>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  // La date du flux est celle du dernier billet : le build reste deterministe,
  // deux constructions du meme contenu produisent le meme fichier.
  const newest = posts.at(0);
  const lastBuild = newest
    ? `\n    <lastBuildDate>${newest.post.data.pubDate.toUTCString()}</lastBuildDate>`
    : "";

  const self = absolute(localizePath("/rss.xml", locale));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteData.title)}</title>
    <link>${absolute(localizePath("/", locale))}</link>
    <description>${escapeXml(t.archive.metaDescription)}</description>
    <language>${localeMeta[locale].intl.toLowerCase()}</language>
    <atom:link href="${self}" rel="self" type="application/rss+xml"/>${lastBuild}
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
