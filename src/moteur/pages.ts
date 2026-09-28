// src/moteur/pages.ts - les pages libres (collection "pages" du back office, generique) : quelle adresse en est une, et laquelle.
//
// UNE PAGE ECRITE DE A A Z DANS LE BACK OFFICE. L'editeur cree une entree de
// la collection "pages" (titre, introduction, texte, photo, SEO) ; elle
// repond a /<identifiant>/ en anglais et /fr/<identifiant>/ en francais,
// rendue a la demande avec le cadre du site, par src/moteur/PageLibre.astro.
// La page d'accueil ([...locale]/index.astro) attrape toute adresse a un
// segment : quand elle ne la reconnait pas, elle demande ici.
//
// Ce qui n'est jamais une page libre : un code de langue, une route fixe du
// theme (about, contact, legal), une adresse a plusieurs segments. Moteur
// eteint, aucune page : source.fichiers.ts rend toujours null.
//
// GENERIQUE : les segments pris par le theme viennent de son adaptateur
// (theme.ts, ROUTES_DU_THEME), la langue de @i18n.
import { defaultLocale, isLocale, type Locale } from "@i18n";
import { pageLibre, type PageLibre } from "@moteur/cadre-base";
import { ROUTES_DU_THEME } from "./theme";

/** L'identifiant et la langue d'une adresse de page libre, lus sur le parametre de la route [...locale] ; null sinon. */
export function adresseDePageLibre(parametre: string | undefined): { slug: string; locale: Locale } | null {
  const segments = (parametre ?? "").split("/").filter(Boolean);
  const langue = segments.length === 2 && isLocale(segments[0]) && segments[0] !== defaultLocale ? segments[0] : null;
  const reste = langue ? segments.slice(1) : segments;
  if (reste.length !== 1) return null;
  const slug = reste[0]!;
  if (isLocale(slug) || ROUTES_DU_THEME.includes(slug) || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
  return { slug, locale: langue ?? defaultLocale };
}

/** La page libre de l'adresse demandee, publiee dans sa langue (ou en brouillon pour un editeur en mode edition), ou null. */
export async function pageLibreDeLAdresse(Astro: { params: Record<string, string | undefined> }): Promise<(PageLibre & { locale: Locale }) | null> {
  const adresse = adresseDePageLibre(Astro.params.locale);
  if (!adresse) return null;
  const page = await pageLibre(adresse.slug, adresse.locale);
  return page ? { ...page, locale: adresse.locale } : null;
}
