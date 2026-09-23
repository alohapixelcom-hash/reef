// src/moteur/plan-du-site.ts - le plan de site des pages gerees, rendu a la demande : /sitemap-contenu.xml.
//
// POURQUOI UN SECOND PLAN : l'integration sitemap ecrit le sien au build et ne
// connait que les pages figees. Moteur allume, l'accueil, l'archive et chaque
// billet en sortaient, soit tout ce qu'un moteur de recherche vient chercher.
// Ce plan-ci les inventorie a chaque requete, et l'index du site le declare
// (customSitemaps, astro.config.mjs).
//
// Comme propsDeLaPage, il REJOUE le getStaticPaths de chaque page geree : le
// plan liste exactement les adresses que le build statique aurait produites,
// avec les memes alternatives de langue que le plan fige.
//
// SANS IMPORTER LES PAGES. Une page importee par un module qui n'est pas une
// page cesse d'etre une frontiere pour le partage des feuilles de style
// d'Astro : le CSS du theme (127 ko) se retrouvait dans le back office et
// dans le manifeste de 73 routes d'API (mesure le 21 septembre 2026). Les
// chemins vivent donc dans des modules partages (@i18n, @js/archive,
// @js/adresses), que la page et ce plan importent chacun de leur cote.
import { defaultLocale, localePaths, locales } from "@i18n";
import { cheminsDeLAuteur, cheminsDuBillet, cheminsDuSujet } from "@js/adresses";
import { cheminsArchive } from "@js/archive";
import type { APIRoute, GetStaticPaths } from "astro";
import { paginer } from "./chemins";
import { PAGES_GEREES } from "./pages-gerees.mjs";

export const prerender = false;

// Les memes exclusions que le plan fige (astro.config.mjs).
const EXCLUES = ["/404/", "/examples/", "/secret-spot/"];

type Params = Record<string, string | number | undefined>;

// Le getStaticPaths de chaque page geree, tel que la page l'exporte. Une page
// geree absente d'ici est une erreur, et le plan le dit au lieu de l'oublier.
// Les flux (rss.xml, llms.txt) n'y sont pas : comme le plan fige, celui-ci
// n'inventorie que des pages.
const CHEMINS: Record<string, GetStaticPaths | null> = {
  "src/pages/[...locale]/index.astro": localePaths,
  "src/pages/[...locale]/blog/[id].astro": cheminsDuBillet,
  "src/pages/[...locale]/blog/[...page].astro": cheminsArchive,
  "src/pages/[...locale]/topics/index.astro": localePaths,
  "src/pages/[...locale]/topics/[topic]/[...page].astro": cheminsDuSujet,
  "src/pages/[...locale]/authors/index.astro": localePaths,
  "src/pages/[...locale]/authors/[author].astro": cheminsDeLAuteur,
  "src/pages/[...locale]/search.astro": localePaths,
  "src/pages/[...locale]/about.astro": localePaths,
  "src/pages/[...locale]/rss.xml.ts": null,
  "src/pages/llms.txt.ts": null,
};

/** "src/pages/[...locale]/blog/[id].astro" + params -> "/fr/blog/mon-billet/". */
function adresse(page: string, params: Params): string {
  const segments = page
    .replace(/^src\/pages\//, "")
    .replace(/\.astro$/, "")
    .split("/")
    .filter((segment) => segment !== "index")
    .map((segment) => segment.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (_, nom: string) => String(params[nom] ?? "")))
    .filter((segment) => segment !== "");
  return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
}

/** "/fr/blog/x/" -> { langue: "fr", suffixe: "/blog/x/" } : deux langues d'une meme page partagent le suffixe. */
function decouper(chemin: string): { langue: string; suffixe: string } {
  const tete = chemin.split("/")[1] ?? "";
  const autre = (locales as readonly string[]).includes(tete) && tete !== defaultLocale;
  return autre ? { langue: tete, suffixe: chemin.slice(tete.length + 1) } : { langue: defaultLocale, suffixe: chemin };
}

export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? url;
  const chemins = new Set<string>();
  for (const page of PAGES_GEREES) {
    const getStaticPaths = CHEMINS[page];
    if (getStaticPaths === undefined) throw new Error(`Page geree sans chemins dans le plan de site : ${page}`);
    if (getStaticPaths === null) continue;
    const liste = (await getStaticPaths({ paginate: paginer, routePattern: "" })) as { params: Params }[];
    for (const { params } of liste.flat()) {
      const chemin = adresse(page, params);
      if (!EXCLUES.some((exclue) => chemin.includes(exclue))) chemins.add(chemin);
    }
  }

  const parSuffixe = new Map<string, Map<string, string>>();
  for (const chemin of chemins) {
    const { langue, suffixe } = decouper(chemin);
    if (!parSuffixe.has(suffixe)) parSuffixe.set(suffixe, new Map());
    parSuffixe.get(suffixe)!.set(langue, chemin);
  }

  const absolue = (chemin: string): string => new URL(chemin, base).href;
  const urls = [...chemins].sort().map((chemin) => {
    const langues = parSuffixe.get(decouper(chemin).suffixe)!;
    const liens =
      langues.size > 1
        ? [
            ...locales.filter((l) => langues.has(l)).map((l) => [l, langues.get(l)!] as const),
            ["x-default", langues.get(defaultLocale) ?? chemin] as const,
          ]
            .map(([l, c]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absolue(c)}"/>`)
            .join("")
        : "";
    return `<url><loc>${absolue(chemin)}</loc>${liens}</url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
