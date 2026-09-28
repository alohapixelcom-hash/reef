// src/moteur/annotations.ts - l'attribut data-emdash-ref qu'une entree de la base porte en mode edition, lu sur le proxy `edit` d'EmDash (generique).
//
// CE QUE LA BARRE D'EMDASH ATTEND. Pour un editeur connecte, EmDash ajoute a
// chaque page rendue a la demande sa barre "EmDash | Edit"
// (emdash/dist/astro/middleware/request-context.mjs). Basculer "Edit" pose le
// cookie emdash-edit-mode=true et recharge la page ; avec une session de role
// editeur (30) ou plus, le rendu passe en mode edition, et chaque entree lue
// par getEmDashCollection porte un proxy `edit` (createEditable,
// emdash/dist/query-*.mjs). Le script de la barre ne connait que le HTML : il
// cherche les elements marques data-emdash-ref, lit le statut de l'entree sur
// le PREMIER de la page (badge, bouton Publish, lien vers le back office) et,
// au clic sur un champ, agit selon la sorte du champ dans le manifeste
// (/_emdash/api/manifest) : texte simple (string) modifie dans la page, image
// dans une fenetre de choix, texte long, nombre, liste ou date dans le back
// office, a ce champ ; un champ repete (arguments, chiffres, fonctions d'une
// offre) s'ouvre dans le back office, lui aussi. Un texte riche (Portable
// Text) non vide s'edite seul, par l'editeur integre d'EmDash : il n'est
// jamais annote ici (docs/moteur.md, "The edit bar").
//
// POURQUOI CE FICHIER. Le theme pose chaque entree sur le dictionnaire des
// fichiers (source.emdash.ts, contenu.ts) : un composant lit une phrase, pas
// une entree, et le proxy se perdait en route. Aucune balise ne portait
// l'attribut, et "Edit" ne faisait rien. Le proxy voyage donc a cote des
// textes, sur la requete (Astro.locals.editions, pose par textes.ts), range
// par cle : le slug d'une section ("hero", "tarifs"), ou le chemin d'une
// entree de liste dans les textes ("pricing.plans.0", "faq.items.2"). Un
// composant demande ici les attributs d'une entree et de ses champs.
//
// HORS EDITION, RIEN. Pour un visiteur anonyme, EmDash donne un proxy muet
// (createNoop) : aucune cle, aucune valeur. Cette fonction rend alors un objet
// vide, et un objet vide etale sur une balise n'y ecrit rien. Hors edition,
// et moteur eteint ou les textes viennent des fichiers, aucune cle n'est
// rangee sur la requete : meme resultat, le build statique ne change pas d'un
// octet.
//
// Pur, sans aucune importation : annotations.selfcheck.ts le verifie contre
// les vrais proxys du paquet installe.

/** L'attribut que la barre d'EmDash lit. */
export const REF = "data-emdash-ref";

/** Ce qu'une balise recoit : l'attribut en mode edition, rien sinon. */
export type Annotation = { [REF]?: string };

const lire = (cible: unknown, cle: string): unknown =>
  cible !== null && (typeof cible === "object" || typeof cible === "function") ? Reflect.get(cible, cle) : undefined;

/**
 * L'annotation d'une entree (champ absent) ou d'un de ses champs, lue sur le
 * proxy `edit` d'EmDash. Un proxy muet, une valeur absente ou d'une autre
 * forme rendent un objet vide : jamais d'exception dans un gabarit.
 */
export function annotationDe(edition: unknown, champ?: string): Annotation {
  const ref = champ === undefined ? lire(edition, REF) : lire(lire(edition, champ), REF);
  return typeof ref === "string" && ref.length > 0 ? { [REF]: ref } : {};
}

/** Vrai quand le proxy est celui du mode edition : l'entree annotee a au moins sa propre marque. */
export const estEditable = (edition: unknown): boolean => REF in annotationDe(edition);

/**
 * Les proxys d'edition d'une page, par cle : le slug d'une section, ou le
 * chemin d'une entree de liste dans les textes ("testimonials.quotes.0"). Une
 * carte vide hors edition.
 */
export type Editions = ReadonlyMap<string, unknown>;

/** Vrai en mode edition : la page porte au moins un proxy d'edition reel. Hors edition et moteur eteint, faux. */
export const enEdition = (page: { locals?: { editions?: Editions } }): boolean => (page.locals?.editions?.size ?? 0) > 0;

/**
 * Le style de la racine d'un bloc qui porte des pastilles, en mode edition
 * seulement : positionne, pour que ses pastilles se posent dans son coin ;
 * estompe et cerne quand l'editeur l'a masque (le visiteur ne le voit pas,
 * l'editeur le voit, avec sa pastille "Bloc masque"). Hors edition, undefined :
 * aucun attribut, le HTML anonyme ne change pas.
 */
export function styleDuBloc(
  page: { locals?: { editions?: Editions; sections?: ReadonlyMap<string, Record<string, unknown>> } },
  cle: string,
): string | undefined {
  if (!estEditable(page.locals?.editions?.get(cle))) return undefined;
  const masque = page.locals?.sections?.get(cle)?.hidden === true;
  return masque ? "position:relative;opacity:.5;outline:3px dashed var(--edition-accent);outline-offset:-3px" : "position:relative";
}

/** Ce qu'un gabarit recoit pour une entree : l'attribut de l'entree, et celui de chacun de ses champs, par son nom dans seed/seed.json. */
export interface AnnotationsDeLEntree {
  entree: Annotation;
  champ(nom: string): Annotation;
}

/** Une entree sans proxy : rien pour elle, rien pour ses champs. */
export const SANS_ANNOTATION: AnnotationsDeLEntree = { entree: {}, champ: () => ({}) };

/**
 * Les annotations d'une entree de la page en cours, lues sur la requete. Une
 * cle inconnue, une section non publiee (ses textes viennent des fichiers) ou
 * une requete hors edition rendent SANS_ANNOTATION.
 */
export function annotationsDe(page: { locals?: { editions?: Editions } }, cle: string): AnnotationsDeLEntree {
  const edition = page.locals?.editions?.get(cle);
  if (!estEditable(edition)) return SANS_ANNOTATION;
  return { entree: annotationDe(edition), champ: (nom) => annotationDe(edition, nom) };
}
