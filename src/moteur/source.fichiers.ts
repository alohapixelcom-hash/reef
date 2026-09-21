// src/moteur/source.fichiers.ts - la source des billets quand le moteur est eteint : les fichiers Markdown de src/data/posts.
//
// Deux sources, une seule forme. Ce module et source.emdash.ts exportent
// exactement les memes fonctions ; l'alias "@moteur/source" (astro.config.mjs)
// choisit l'un ou l'autre, et aucune page ne sait d'ou vient un billet.
import type { Locale } from "@i18n";
import { entryIdIn, getLocalizedCollection } from "@i18n/content";
import { getEntry, render, type CollectionEntry } from "astro:content";
import type { CorpsDeBillet } from "./types";

/** Vrai quand les billets viennent de la base : les pages gerees se rendent alors a la demande. */
export const MOTEUR = false;

/** Les billets PUBLIES d'une langue, sans ordre garanti. */
export async function billetsPublies(locale: Locale): Promise<CollectionEntry<"posts">[]> {
  return getLocalizedCollection("posts", locale, ({ data }) => data.draft !== true);
}

/** Un billet publie, par son slug. */
export async function billetParSlug(locale: Locale, slug: string): Promise<CollectionEntry<"posts"> | undefined> {
  const billet = await getEntry("posts", entryIdIn(slug, locale));
  return billet && billet.data.draft !== true ? billet : undefined;
}

/** Le corps rendu d'un billet et ses titres, pour le sommaire. */
export async function corpsDuBillet(billet: CollectionEntry<"posts">): Promise<CorpsDeBillet> {
  const { Content, headings } = await render(billet);
  return { Content, headings };
}
