// src/moteur/menus.ts - les menus natifs du moteur (generique) : la forme de la table qu'un theme declare, les noms communs, et la graine calculee depuis cette table.
//
// POURQUOI UNE TABLE. Moteur allume, la navigation et les colonnes du pied
// viennent des menus d'EmDash (ecran Menus du back office, un menu par nom ET
// par langue) ; moteur eteint, ou tant qu'un menu n'existe pas en base, elles
// viennent des fichiers du theme, comme avant. La table des menus du theme
// (MENUS, dans son adaptateur src/moteur/theme.ts) est le pont entre les
// deux : la graine doit porter exactement ces menus avec les libelles des
// dictionnaires et les adresses des fichiers, et le self-check du theme le
// verifie dans chaque langue. Le rendu ne la lit pas : il lit la base, puis
// les fichiers.
//
// GENERIQUE : aucun import, les memes noms dans tous les sites de la maison
// (principal, tiroir, actions, pied-<colonne>, reseaux, abonnement).

/** Un chemin dans le dictionnaire du theme ("nav.features"). */
export type Chemin = string;

/** Un lien d'un menu de la graine : le chemin de son libelle dans le dictionnaire, la route qu'il ouvre, et sa classe (bouton) s'il en a une. */
export interface LienDuMenu {
  libelle: Chemin;
  route: string;
  /** Une ancre ajoutee a la route ("#privacy" sur la page legale). */
  ancre?: string;
  /** La classe posee par la graine (le back office ne la saisit pas) : "bouton" rend le lien en bouton plein. */
  classes?: "bouton";
}

/** Un menu natif : son nom (le meme dans toutes les langues), le chemin de son libelle, ses liens. */
export interface MenuDuSite {
  nom: string;
  /** Le libelle du menu dans le back office ; pour une colonne du pied, c'est aussi le titre affiche de la colonne. */
  libelle: Chemin;
  /**
   * Pour un menu qui ne s'affiche pas sous un titre (libelle vide) : ce que le
   * back office en dit, en francais, quand le nom commun de LIBELLES_DES_MENUS
   * ne decrit pas ce theme ("Bouton en haut de chaque page" plutot que
   * "Boutons en haut à droite de chaque page"). Absent : le nom commun.
   */
  nomDansLeBackOffice?: string;
  liens: readonly LienDuMenu[];
}

/** Le menu principal de la barre. */
export const PRINCIPAL = "principal";
/** Ce que le tiroir mobile ajoute au menu principal. */
export const TIROIR = "tiroir";
/** Les boutons de la barre, repris en bas du tiroir. */
export const ACTIONS = "actions";

/** Les colonnes du pied portent un nom qui commence ainsi : pied-produit, pied-legal... */
export const PREFIXE_DU_PIED = "pied-";

/**
 * Les libelles des menus qui ne s'affichent pas sur le site : des noms de
 * reglage, lus seulement dans le back office, donc ecrits dans sa langue (le
 * francais), les memes pour le menu anglais et le menu francais. Le libelle
 * d'une colonne du pied, lui, s'affiche : il vient du dictionnaire de la langue.
 */
export const LIBELLES_DES_MENUS: Record<string, string> = {
  [PRINCIPAL]: "Menu principal, en haut de chaque page",
  [TIROIR]: "Liens ajoutés au menu sur téléphone",
  [ACTIONS]: "Boutons en haut à droite de chaque page",
  reseaux: "Liens vers les réseaux sociaux",
  abonnement: "Liens de l'abonnement",
};

/** La classe que la graine pose sur un lien rendu en bouton plein. */
export const CLASSE_BOUTON = "bouton";

/** Un menu tel que la graine (seed/seed.json, `menus`) le decrit pour une langue. */
export interface MenuDeLaGraine {
  id: string;
  name: string;
  label: string;
  locale: string;
  translationOf?: string;
  items: { id: string; type: "custom"; label: string; url: string; cssClasses?: string; translationOf?: string }[];
}

/**
 * Les menus de la graine dans une langue, calcules depuis la table du theme :
 * le libelle de chaque lien lu dans le dictionnaire de la langue, son adresse
 * dans les routes du theme, et la langue source (celle a la racine) comme
 * origine de chaque traduction. Le self-check du theme compare ce resultat a
 * la graine, lien par lien, dans chaque langue.
 */
export function menusDeLaGraine(
  menus: readonly MenuDuSite[],
  locale: string,
  source: string,
  lire: (chemin: Chemin) => string,
  routes: Readonly<Record<string, string>>,
): MenuDeLaGraine[] {
  const suffixe = (id: string) => (locale === source ? {} : { translationOf: `${id}:${source}` });
  return menus.map((menu) => ({
    id: `menu:${menu.nom}:${locale}`,
    name: menu.nom,
    label: menu.libelle ? lire(menu.libelle) : (menu.nomDansLeBackOffice ?? LIBELLES_DES_MENUS[menu.nom] ?? menu.nom),
    locale,
    ...suffixe(`menu:${menu.nom}`),
    items: menu.liens.map((lien, rang) => ({
      id: `lien:${menu.nom}:${rang + 1}:${locale}`,
      type: "custom" as const,
      label: lire(lien.libelle),
      url: `${routes[lien.route]}${lien.ancre ?? ""}`,
      ...(lien.classes ? { cssClasses: lien.classes } : {}),
      ...suffixe(`lien:${menu.nom}:${rang + 1}`),
    })),
  }));
}
