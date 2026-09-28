// src/moteur/cadre.emdash.ts - moteur allume, la lecture du cadre du site dans la base (generique) : reglages natifs, entree "site" de la langue, menus natifs, pages libres.
//
// Choisi par l'alias @moteur/cadre-base (moteur.config.mjs) ; moteur eteint,
// cadre.fichiers.ts rend les memes formes, vides, et aucun paquet du moteur
// n'entre dans le build statique.
//
// JAMAIS D'EXCEPTION POUR LE CADRE : une base d'avant cette version (sans
// collection "site" ni "pages", sans menu) rend des valeurs vides, et le
// rendu retombe sur les fichiers du theme (voir cadre.ts). C'est ce qui rend
// l'ordre SQL puis deploiement, ou l'inverse, sans risque.
//
// GENERIQUE : les noms des menus a lire viennent de l'adaptateur du theme
// (theme.ts, MENUS), passes en argument.
import { getEmDashCollection, getEmDashEntry, getMenu, getSiteSettings } from "emdash";
import { estEditable } from "./annotations";
import type { DonneesDuSite, MenuLu, Reglages } from "./cadre";

/** Ce que la base dit du cadre dans une langue, et le proxy d'edition de l'entree "site". */
export interface CadreLu {
  reglages: Reglages;
  site?: DonneesDuSite;
  edition?: unknown;
  menus: Map<string, MenuLu>;
}

/** Une page libre (collection `pages`) : ses donnees (panneau SEO compris) et son proxy d'edition. */
export interface PageLibre {
  slug: string;
  data: Record<string, unknown> & { seo?: { title?: string | null; description?: string | null; image?: unknown; canonical?: string | null; noIndex?: boolean } };
  edit?: unknown;
}

/** Les reglages natifs ; une base sans reglage rend un objet vide. */
async function reglagesDuSite(): Promise<Reglages> {
  try {
    return ((await getSiteSettings()) ?? {}) as Reglages;
  } catch {
    return {};
  }
}

/** L'entree "site" de la langue (une seule, d'identifiant "site"), et son proxy d'edition. Absente, ou d'une autre langue : rien. */
async function entreeDuSite(locale: string): Promise<{ site?: DonneesDuSite; edition?: unknown }> {
  try {
    const { entry } = await getEmDashEntry("site", "site", { locale });
    if (!entry || (entry.data as { locale?: string }).locale !== locale) return {};
    return { site: entry.data as DonneesDuSite, edition: (entry as { edit?: unknown }).edit };
  } catch {
    return {};
  }
}

/** Les menus natifs demandes, par nom. Un menu d'une autre langue (repli du moteur) est garde tel quel : cadre.ts verifie sa langue. */
async function menusDuSite(noms: readonly string[], locale: string): Promise<Map<string, MenuLu>> {
  const menus = new Map<string, MenuLu>();
  await Promise.all(
    noms.map(async (nom) => {
      try {
        const menu = await getMenu(nom, { locale });
        if (menu) menus.set(nom, menu as MenuLu);
      } catch {
        // Un menu illisible ne fait jamais tomber la page : les liens des fichiers s'affichent.
      }
    }),
  );
  return menus;
}

/** Le cadre du site dans une langue : reglages, entree "site" et son proxy, menus demandes. */
export async function lireLeCadre(locale: string, nomsDesMenus: readonly string[]): Promise<CadreLu> {
  const [reglages, site, menus] = await Promise.all([reglagesDuSite(), entreeDuSite(locale), menusDuSite(nomsDesMenus, locale)]);
  return { reglages, site: site.site, edition: site.edition, menus };
}

/** Une page libre de la langue : publiee, ou en brouillon pour un editeur en mode edition ; null sinon. */
export async function pageLibre(slug: string, locale: string): Promise<PageLibre | null> {
  try {
    const { entry } = await getEmDashEntry("pages", slug, { locale });
    if (!entry) return null;
    const data = entry.data as unknown as PageLibre["data"] & { locale?: string; status?: string; slug?: string };
    const edit = (entry as { edit?: unknown }).edit;
    if (data.locale !== locale || (data.status !== "published" && !estEditable(edit))) return null;
    return { slug: data.slug ?? slug, data, edit };
  } catch {
    return null;
  }
}

/** Les pages libres publiees de la langue, pour le plan du site : leur identifiant, et si leur panneau SEO les exclut des moteurs. */
export async function pagesLibres(locale: string): Promise<{ slug: string; noindex: boolean }[]> {
  const pages: { slug: string; noindex: boolean }[] = [];
  let cursor: string | undefined;
  try {
    do {
      const lot = await getEmDashCollection("pages", { locale, status: "published", limit: 100, cursor });
      if (lot.error) return pages;
      for (const entree of lot.entries) {
        const data = entree.data as unknown as PageLibre["data"] & { slug?: string };
        pages.push({ slug: data.slug ?? entree.id, noindex: data.seo?.noIndex === true });
      }
      cursor = lot.nextCursor;
    } while (cursor);
  } catch {
    // Une base sans collection "pages" : aucune page libre.
  }
  return pages;
}
