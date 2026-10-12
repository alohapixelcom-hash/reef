// src/moteur/plan-du-site.xml.ts - le plan du site des pages gerees, rendu a la demande (generique) : le site donne la table de ses chemins, ce module ecrit le XML.
//
// SANS IMPORTER LES PAGES (modele : Nalu). Une page importee par un
// module qui n'est pas une page cesse d'etre une frontiere pour le partage
// des feuilles de style d'Astro : des que les pages se rendent a la demande,
// chacune recevait les feuilles de toutes les autres. Le site recalcule donc
// les params de chaque page geree dans sa table CHEMINS, depuis @i18n
// (localePaths) et son catalogue, et `pnpm lint:house` refuse un
// import.meta.glob dans src/moteur/plan-du-site*.ts.
//
// Dans le site (src/moteur/plan-du-site.ts) :
//   export const prerender = false;
//   export const GET = planDuSite({ chemins: CHEMINS, horsDuPlan: /^\/(?:[a-z]{2}\/)?404\/$/ });
// Une page geree absente de CHEMINS est une erreur : le plan le dit au lieu
// de l'oublier. null : une page sans adresse a lister (404, llms.txt).
import { defaultLocale, localePrefix, locales } from "@i18n";
import { pagesLibres } from "@moteur/cadre-base";
import type { APIRoute } from "astro";
import { PAGES_GEREES } from "./pages-gerees.mjs";

export type Params = Record<string, string | number | undefined>;

export interface OptionsDuPlan {
  /** Les params de chaque page geree, tels que son getStaticPaths les donnerait ; null pour une page sans adresse a lister. */
  chemins: Record<string, (() => Promise<Params[]> | Params[]) | null>;
  /** Les adresses que le plan fige excluait aussi (404, panier...). */
  horsDuPlan?: RegExp;
  /** Des adresses a ajouter, lues a la demande (un rayon publie dans le back office, qui a sa page sans etre au catalogue). */
  ajoutees?: () => Promise<string[]>;
  /** Des adresses a retirer, lues a la demande (une entree en noindex) ; elles passent apres les ajouts. */
  exclues?: () => Promise<string[]>;
  /** Les images de chaque page (adresse de la page vers les adresses de ses photos), lues a la demande : elles partent en image:image (plan d'images de Google). */
  images?: () => Promise<Record<string, string[]>>;
}

/** Une adresse dans un texte XML : les caracteres reserves echappes. */
const xml = (texte: string): string => texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** "src/pages/[...locale]/legal.astro" + params -> "/fr/legal/". */
export function adresseDeLaPage(page: string, params: Params): string {
  const segments = page
    .replace(/^src\/pages\//, "")
    .replace(/\.astro$/, "")
    .split("/")
    .filter((segment) => segment !== "index")
    .map((segment) => segment.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (_, nom: string) => String(params[nom] ?? "")))
    .filter((segment) => segment !== "");
  return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
}

/** "/fr/legal/" -> { langue: "fr", suffixe: "/legal/" } : deux langues d'une meme page partagent le suffixe. */
function decouper(chemin: string): { langue: string; suffixe: string } {
  const tete = chemin.split("/")[1] ?? "";
  const autre = (locales as readonly string[]).includes(tete) && tete !== defaultLocale;
  return autre ? { langue: tete, suffixe: chemin.slice(tete.length + 1) } : { langue: defaultLocale, suffixe: chemin };
}

/**
 * Les adresses de toutes les pages du plan : pages gerees, pages libres publiees hors noindex, ajouts du site, moins ses exclusions.
 * Toutes les sources sont lues en meme temps : chacune interroge la base, et
 * en serie le plan d'une boutique payait leurs allers-retours l'un apres
 * l'autre. Les ajouts sont demandes avant les exclusions (un site peut garder
 * la lecture des premiers pour les secondes), puis appliques dans cet ordre.
 */
export async function adressesDuPlan(options: OptionsDuPlan): Promise<string[]> {
  const pages = PAGES_GEREES.map((page) => {
    const lister = options.chemins[page];
    if (lister === undefined) throw new Error(`Page geree sans chemins dans le plan de site : ${page}`);
    return { page, lister };
  });
  const [parPage, libres, ajoutees, exclues] = await Promise.all([
    Promise.all(pages.map(async ({ page, lister }) => (lister === null ? [] : (await lister()).map((params) => adresseDeLaPage(page, params))))),
    Promise.all(locales.map(async (l) => (await pagesLibres(l)).filter((p) => !p.noindex).map((p) => `${localePrefix(l)}/${p.slug}/`))),
    options.ajoutees?.() ?? Promise.resolve([] as string[]),
    options.exclues?.() ?? Promise.resolve([] as string[]),
  ]);
  const chemins = new Set<string>();
  for (const chemin of parPage.flat()) if (!options.horsDuPlan?.test(chemin)) chemins.add(chemin);
  for (const chemin of libres.flat()) chemins.add(chemin);
  for (const ajoutee of ajoutees) chemins.add(ajoutee);
  for (const exclue of exclues) chemins.delete(exclue);
  return [...chemins].sort();
}

/** La route du plan : chaque adresse, avec ses alternatives de langue (x-default compris) quand elle en a. */
export function planDuSite(options: OptionsDuPlan): APIRoute {
  return async ({ site, url }) => {
    const base = site ?? url;
    const chemins = await adressesDuPlan(options);
    const parSuffixe = new Map<string, Map<string, string>>();
    for (const chemin of chemins) {
      const { langue, suffixe } = decouper(chemin);
      if (!parSuffixe.has(suffixe)) parSuffixe.set(suffixe, new Map());
      parSuffixe.get(suffixe)!.set(langue, chemin);
    }
    const absolue = (chemin: string): string => new URL(chemin, base).href;
    const images = (await options.images?.()) ?? {};
    const avecImages = Object.values(images).some((liste) => liste.length > 0);
    const urls = chemins.map((chemin) => {
      const langues = parSuffixe.get(decouper(chemin).suffixe)!;
      const liens =
        langues.size > 1
          ? [...locales.filter((l) => langues.has(l)).map((l) => [l, langues.get(l)!] as const), ["x-default", langues.get(defaultLocale) ?? chemin] as const]
              .map(([l, c]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absolue(c)}"/>`)
              .join("")
          : "";
      const photos = [...new Set((images[chemin] ?? []).map(absolue))]
        .map((src) => `<image:image><image:loc>${xml(src)}</image:loc></image:image>`)
        .join("");
      return `<url><loc>${xml(absolue(chemin))}</loc>${liens}${photos}</url>`;
    });
    const espaceImages = avecImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
    const corps = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"${espaceImages}>${urls.join("")}</urlset>`;
    return new Response(corps, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  };
}
