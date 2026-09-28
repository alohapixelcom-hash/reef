// src/moteur/annotations.ts - l'attribut data-emdash-ref qu'une entree de la base (billet ou section) porte en mode edition, lu sur le proxy `edit` d'EmDash.
//
// CE QUE LA BARRE D'EMDASH ATTEND. Pour un editeur connecte, EmDash ajoute a
// chaque page rendue a la demande sa barre "EmDash | Edit"
// (emdash/dist/astro/middleware/request-context.mjs). Basculer "Edit" pose le
// cookie emdash-edit-mode=true et recharge la page ; avec ce cookie ET une
// session de role 30 (editeur) ou plus, le rendu passe en mode edition, et
// chaque entree lue par getEmDashCollection ou getEmDashEntry porte un proxy
// `edit` (createEditable, emdash/dist/query-*.mjs). Le script de la barre ne
// connait que le HTML : il cherche les balises marquees data-emdash-ref, lit
// le statut de l'entree sur la PREMIERE de la page (badge, bouton Publish,
// lien vers le back office) et, au clic sur un champ, agit selon la sorte du
// champ dans le manifeste (/_emdash/api/manifest) : texte simple edite dans
// la page, image dans une fenetre de choix, texte long ouvert dans le back
// office, a ce champ. Le Portable Text, elle le laisse a l'editeur React
// d'EmDash, que <PortableText> monte lui-meme dans le corps d'un billet : le
// corps n'est donc pas annote (docs/moteur.md, "The edit bar, on the site").
//
// POURQUOI CE FICHIER. Le theme convertit chaque entree en entree de la
// collection posts (source.emdash.ts), et la conversion perdait le proxy :
// aucune balise ne portait l'attribut, la barre n'avait rien a editer. Le
// proxy voyage donc avec le billet, et les gabarits demandent ici l'attribut
// d'une entree ou d'un de ses champs.
//
// HORS EDITION, RIEN. Pour un visiteur anonyme, EmDash donne un proxy muet
// (createNoop) : aucune cle, aucune valeur. Cette fonction rend alors un objet
// vide, et un objet vide etale sur une balise n'y ecrit rien. Moteur eteint,
// le billet vient d'un fichier et n'a pas de proxy du tout : meme resultat, le
// build statique ne change pas d'un octet.
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

// --- Les sections des pages (voir contenu.ts) --------------------------------
//
// Un composant lit une phrase du dictionnaire, pas une entree : le proxy d'une
// section voyage donc a cote des textes, sur la requete
// (Astro.locals.editions, pose par textes.ts), range sous le slug de la
// section ("hero", "a-propos-regles"). Hors edition, moteur eteint ou section
// non publiee, la carte n'a pas la cle : rien n'est ecrit.

/** Les proxys d'edition des sections de la page, par slug. Une carte vide hors edition. */
export type Editions = ReadonlyMap<string, unknown>;

/** Ce qu'un gabarit recoit pour une section : l'attribut de l'entree, et celui de chacun de ses champs, par son nom dans seed/seed.json. */
export interface AnnotationsDeLEntree {
  entree: Annotation;
  champ(nom: string): Annotation;
}

/** Une section sans proxy : rien pour elle, rien pour ses champs. */
export const SANS_ANNOTATION: AnnotationsDeLEntree = { entree: {}, champ: () => ({}) };

/** Les annotations d'une section de la page en cours, lues sur la requete. Une cle inconnue ou une requete hors edition rendent SANS_ANNOTATION. */
export function annotationsDe(page: { locals?: { editions?: Editions } }, cle: string): AnnotationsDeLEntree {
  const edition = page.locals?.editions?.get(cle);
  if (!estEditable(edition)) return SANS_ANNOTATION;
  return { entree: annotationDe(edition), champ: (nom) => annotationDe(edition, nom) };
}
