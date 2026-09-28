// src/moteur/source.fichiers.ts - la source des billets quand le moteur est eteint : les fichiers Markdown de src/data/posts.
//
// Deux sources, une seule forme. Ce module et source.emdash.ts exportent
// exactement les memes fonctions ; l'alias "@moteur/source" (astro.config.mjs)
// choisit l'un ou l'autre, et aucune page ne sait d'ou vient un billet.
import { getLegalData } from "@config/legalData.json.ts";
import { type Locale, useTranslations } from "@i18n";
import { entryIdIn, getLocalizedCollection } from "@i18n/content";
import { getImage } from "astro:assets";
import { getEntry, render, type CollectionEntry } from "astro:content";
import type { Annotation, Editions } from "./annotations";
import type { Cadre, DonneesDesSections } from "./cadre";
import { CARTE } from "./carte-du-billet.regles";
import type { Textes } from "./contenu";
import type { CorpsDeBillet } from "./types";

/** Vrai quand les billets viennent de la base : les pages gerees se rendent alors a la demande. */
export const MOTEUR = false;

/** Les billets PUBLIES d'une langue, sans ordre garanti. */
export async function billetsPublies(locale: Locale): Promise<CollectionEntry<"posts">[]> {
  return getLocalizedCollection("posts", locale, ({ data }) => data.draft !== true);
}

/** Les sujets d'une langue : les fichiers de src/data/topics. */
export async function sujetsPublies(locale: Locale): Promise<CollectionEntry<"topics">[]> {
  return getLocalizedCollection("topics", locale);
}

/** Les auteurs d'une langue : les fichiers de src/data/authors. */
export async function auteursPublies(locale: Locale): Promise<CollectionEntry<"authors">[]> {
  return getLocalizedCollection("authors", locale);
}

/** Le nombre de billets par page des listes : celui du theme. */
export async function billetsParPage(): Promise<number> {
  return 9;
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

/**
 * L'adresse de la carte de partage d'un billet : sa couverture recadree par
 * sharp au build en JPEG 1200x630, position "attention" comme les cartes de
 * scripts/og.mjs. Sans couverture, undefined : la page prend la carte par
 * defaut du site.
 */
export async function carteDuBillet(billet: CollectionEntry<"posts">): Promise<string | undefined> {
  const couverture = billet.data.cover;
  if (!couverture) return undefined;
  const carte = await getImage({
    src: couverture,
    width: CARTE.largeur,
    height: CARTE.hauteur,
    fit: "cover",
    position: "attention",
    format: "jpeg",
    quality: CARTE.qualite,
  });
  return carte.src;
}

/**
 * Moteur eteint, un billet est un fichier : il ne s'edite pas depuis la page,
 * et aucune balise ne recoit d'attribut. L'objet vide etale n'ecrit rien, le
 * build statique reste identique au fichier pres.
 */
export const annotation = (_billet: CollectionEntry<"posts">, _champ?: string): Annotation => ({});

/** Les textes des fichiers d'une langue : le dictionnaire complet et les deux documents legaux. */
export function textesDesFichiers(locale: Locale): Textes {
  return { ...useTranslations(locale), legalData: getLegalData(locale) };
}

/**
 * Les textes rediges de la page, et aucun proxy d'edition, aucun cadre, aucune
 * donnee de section : moteur eteint, ce sont ceux des fichiers, rien ne
 * s'edite depuis la page, aucune balise ne recoit d'attribut, le cadre vient
 * de siteData et navData, et le build statique reste identique au fichier pres.
 */
export async function lireLaPage(locale: Locale): Promise<{ textes: Textes; editions: Editions; cadre: Cadre; sections: DonneesDesSections }> {
  return { textes: textesDesFichiers(locale), editions: new Map(), cadre: { menus: new Map() }, sections: new Map() };
}
