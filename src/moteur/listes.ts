// src/moteur/listes.ts - les listes de Reef dans le back office : les sujets et les auteurs (collections "sujets" et "auteurs"), leur forme en base et leur forme dans le theme.
//
// POURQUOI DEUX COLLECTIONS. Les sujets et les auteurs vivaient dans
// src/data/topics et src/data/authors : un editeur ne pouvait ni en ajouter un,
// ni corriger une biographie, ni changer la couleur d'un sujet sans ouvrir un
// fichier. Moteur allume, chacun est une entree du back office, traduite, avec
// son SEO, et le theme la recoit sous la forme exacte d'une entree de contenu
// d'Astro (celle que les cartes, les pages et le flux connaissent deja). Un
// billet garde son sujet et son auteur dans deux listes de choix (champs
// "topic" et "author" des billets) dont les valeurs sont les identifiants de
// ces entrees.
//
// UNE BASE SANS CES COLLECTIONS (pas encore migree), ou qui n'en publie
// aucune entree dans la langue, rend les fichiers : c'est ce qui rend l'ordre
// SQL puis deploiement, ou l'inverse, sans risque.
//
// Pur, sans import de valeur : l'import des fichiers (scripts/graine-listes.mjs)
// et le self-check le chargent dans Node.
import { annotationDe, type AnnotationsDeLEntree, estEditable, SANS_ANNOTATION } from "./annotations.ts";

/** Les couleurs qu'un editeur choisit pour un sujet, et l'accent du theme que chacune peint (voir topicTone.ts). */
export const TEINTES_DES_SUJETS = { Corail: "coral", "Aigue-marine": "reef", Encre: "ink" } as const;

export type Teinte = (typeof TEINTES_DES_SUJETS)[keyof typeof TEINTES_DES_SUJETS];

/** Un sujet sans couleur choisie (une entree ajoutee sans la remplir) prend l'accent principal du theme. */
export const TEINTE_PAR_DEFAUT: Teinte = "coral";

/** L'accent du theme pour une couleur du back office ; une valeur vide ou inconnue donne l'accent par defaut. */
export function teinteDuSujet(valeur: unknown): Teinte {
  return typeof valeur === "string" && valeur in TEINTES_DES_SUJETS ? TEINTES_DES_SUJETS[valeur as keyof typeof TEINTES_DES_SUJETS] : TEINTE_PAR_DEFAUT;
}

/** La couleur du back office qui peint un accent du theme (l'import des fichiers l'ecrit ainsi). */
export function couleurDeLaTeinte(accent: string): string {
  return Object.entries(TEINTES_DES_SUJETS).find(([, a]) => a === accent)?.[0] ?? "";
}

/** Un sujet tel que la base le rend (collection "sujets"). */
export interface DonneesSujet {
  slug?: string;
  name?: string;
  description?: string;
  color?: string;
  order?: number | null;
  image?: unknown;
  seo?: PanneauSeo;
}

/** Un auteur tel que la base le rend (collection "auteurs"). */
export interface DonneesAuteur {
  slug?: string;
  name?: string;
  role?: string;
  bio?: string;
  avatar?: unknown;
  links?: { label?: string; href?: string }[] | null;
  seo?: PanneauSeo;
}

/** Le panneau SEO d'une entree, tel qu'EmDash le rend dans `data.seo`. */
export interface PanneauSeo {
  title?: string | null;
  description?: string | null;
  image?: unknown;
  canonical?: string | null;
  noIndex?: boolean;
}

const texte = (valeur: unknown): string | undefined => (typeof valeur === "string" && valeur.trim() !== "" ? valeur.trim() : undefined);

/** Les liens d'un auteur qui ont un libelle et une adresse ; les lignes a moitie remplies ne s'affichent pas. */
export function liensDeLAuteur(liens: DonneesAuteur["links"]): { label: string; href: string }[] {
  return (Array.isArray(liens) ? liens : [])
    .map((l) => ({ label: texte(l?.label), href: texte(l?.href) }))
    .filter((l): l is { label: string; href: string } => Boolean(l.label && l.href));
}

/**
 * Le SEO d'une page, dans l'ordre de la regle de la maison : le panneau SEO de
 * l'entree, puis ses propres champs, puis les valeurs par defaut. L'image du
 * panneau est une cle de la mediatheque (ou une adresse) ; vide, undefined.
 */
export function seoDe(panneau: PanneauSeo | undefined, repli: { title: string; description: string }) {
  const image = texte(panneau?.image);
  return {
    title: texte(panneau?.title) ?? repli.title,
    description: texte(panneau?.description) ?? repli.description,
    image: image ? (image.startsWith("/") || /^https?:/.test(image) ? image : `/_emdash/api/media/file/${image}`) : undefined,
    canonical: texte(panneau?.canonical),
    noindex: panneau?.noIndex === true,
  };
}

/**
 * Les annotations d'une fiche de liste (un sujet, un auteur, un billet) pour la
 * barre d'edition : l'entree sur la carte, chaque champ sur le texte qui
 * l'affiche. Hors edition, et pour une fiche venue d'un fichier, rien.
 */
export function annotationsDeLaFiche(fiche: unknown): AnnotationsDeLEntree {
  const edition = (fiche as { edition?: unknown } | null | undefined)?.edition;
  return estEditable(edition) ? { entree: annotationDe(edition), champ: (nom: string) => annotationDe(edition, nom) } : SANS_ANNOTATION;
}
