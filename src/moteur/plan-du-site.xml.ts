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
}

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

/** Les adresses de toutes les pages du plan : pages gerees, pages libres publiees hors noindex, ajouts du site, moins ses exclusions. */
export async function adressesDuPlan(options: OptionsDuPlan): Promise<string[]> {
  const chemins = new Set<string>();
  for (const page of PAGES_GEREES) {
    const lister = options.chemins[page];
    if (lister === undefined) throw new Error(`Page geree sans chemins dans le plan de site : ${page}`);
    if (lister === null) continue;
    for (const params of await lister()) {
      const chemin = adresseDeLaPage(page, params);
      if (!options.horsDuPlan?.test(chemin)) chemins.add(chemin);
    }
  }
  for (const l of locales) for (const p of await pagesLibres(l)) if (!p.noindex) chemins.add(`${localePrefix(l)}/${p.slug}/`);
  for (const ajoutee of (await options.ajoutees?.()) ?? []) chemins.add(ajoutee);
  for (const exclue of (await options.exclues?.()) ?? []) chemins.delete(exclue);
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
    const urls = chemins.map((chemin) => {
      const langues = parSuffixe.get(decouper(chemin).suffixe)!;
      const liens =
        langues.size > 1
          ? [...locales.filter((l) => langues.has(l)).map((l) => [l, langues.get(l)!] as const), ["x-default", langues.get(defaultLocale) ?? chemin] as const]
              .map(([l, c]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absolue(c)}"/>`)
              .join("")
          : "";
      return `<url><loc>${absolue(chemin)}</loc>${liens}</url>`;
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
    return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  };
}
