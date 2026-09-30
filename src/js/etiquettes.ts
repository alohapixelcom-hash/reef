// src/js/etiquettes.ts - les etiquettes d'un billet : un libelle dans la langue de la page, et une adresse commune a toutes les langues.
//
// UNE ADRESSE PAR ETIQUETTE, LA MEME DANS CHAQUE LANGUE, comme les sujets
// (/topics/typography/ et /fr/topics/typography/) : c'est ce qui permet au
// selecteur de langue d'une page d'etiquette de mener a la meme etiquette.
// L'adresse est donc celle de l'etiquette dans la langue par defaut du site ;
// le libelle, lui, est celui de la page ("typographie" sous /fr/tags/typography/).
//
// DEUX SOURCES, UNE FORME :
//   - moteur allume, les etiquettes natives d'EmDash (taxonomie "tag") : le
//     billet arrive avec `etiquettes` deja resolues (source.emdash.ts) ;
//   - fichiers, le champ `tags` du billet : l'etiquette d'une traduction prend
//     l'adresse de l'etiquette de meme rang dans la version par defaut du meme
//     billet (meme regle que la migration migrations/import-3.8.3-reef.sql).
import { defaultLocale, type Locale } from "@i18n";
import { entrySlug } from "@i18n/content";
import { slug } from "github-slugger";
import type { CollectionEntry } from "astro:content";

export interface Etiquette {
  /** L'adresse, commune aux langues : /tags/<slug>/. */
  slug: string;
  /** Le libelle, dans la langue du billet. */
  label: string;
}

/** L'adresse d'un libelle d'etiquette, telle que github-slugger la fabrique (la meme regle que la migration). */
export const slugDEtiquette = (label: string): string => slug(label.trim());

/** Les etiquettes deja resolues par la source (moteur allume), ou undefined. */
function resolues(post: CollectionEntry<"posts">): Etiquette[] | undefined {
  const e = (post as unknown as { etiquettes?: unknown }).etiquettes;
  return Array.isArray(e) ? (e as Etiquette[]) : undefined;
}

/**
 * Les etiquettes d'un billet. `versionParDefaut` est le meme billet dans la
 * langue par defaut, quand il existe : ses etiquettes donnent les adresses.
 * Une etiquette sans adresse (vide) est ecartee.
 */
export function etiquettesDuBillet(post: CollectionEntry<"posts">, versionParDefaut?: CollectionEntry<"posts">): Etiquette[] {
  const deja = resolues(post);
  if (deja) return deja;
  const ref = versionParDefaut?.data.tags ?? [];
  const vues = new Set<string>();
  const sortie: Etiquette[] = [];
  post.data.tags.forEach((label, rang) => {
    const adresse = slugDEtiquette(ref[rang] ?? label);
    if (!adresse || vues.has(adresse)) return;
    vues.add(adresse);
    sortie.push({ slug: adresse, label: label.trim() });
  });
  return sortie;
}

/** Les versions par defaut des billets, par slug : de quoi appeler etiquettesDuBillet pour une autre langue. */
export function versionsParDefaut(locale: Locale, parDefaut: readonly CollectionEntry<"posts">[]): Map<string, CollectionEntry<"posts">> {
  if (locale === defaultLocale) return new Map();
  return new Map(parDefaut.map((p) => [entrySlug(p.id), p]));
}
