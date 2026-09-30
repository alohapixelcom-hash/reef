// src/moteur/essai.ts - la forme des parametres du guide rejoue (generique) : ce que le theme declare dans son adaptateur (ESSAI_DE_L_ADMINISTRATION de theme.ts) pour que scripts/essai-administrer.mjs fasse ses gestes.
//
// Types seulement : rien n'entre dans le Worker ni dans le build statique.
// Chaque geste commun n'est rejoue que si son parametre est donne ; les
// gestes propres au theme vivent dans scripts/essai-administrer.site.mjs.

/** Une page du site ("/", "/about/"). */
type Adresse = string;

export interface ParametresDeLEssai {
  /** Une image livree avec le theme, pour les gestes de photo et de logo (chemin depuis la racine du depot). */
  image: string;
  /** La langue servie a la racine du site ("en" si absent ; "fr" pour un site francais a la racine) : les gestes ouvrent les entrees dans cette langue. */
  langue?: string;
  /** Un titre edite dans la page par la barre : l'entree de `sections`, le selecteur du titre, son champ. */
  titre?: { entree: string; selecteur: string; champ?: string; page?: Adresse };
  /** Le bloc de tete de l'accueil, ou vivent les pastilles de la photo et du bouton ("section[aria-labelledby=\"hero-title\"]"). */
  bandeau?: { selecteur: string; photo?: boolean; bouton?: boolean; page?: Adresse };
  /** Un bloc masque puis reaffiche : l'entree, et un morceau du HTML qui n'est la que quand le bloc s'affiche. */
  masquer?: { entree: string; marqueur: string; page?: Adresse };
  /** Un lien d'un menu renomme puis rendu : le menu, son rang, et son libelle d'origine. */
  menu?: { nom: string; rang: number; libelle: string; page?: Adresse };
  /** Un lien ajoute puis retire a une colonne du pied. */
  pied?: { menu: string; page?: Adresse };
  /** Le nom du site change puis rendu dans les reglages ; la page ou le lire dans le titre. */
  nomDuSite?: { valeur: string; page?: Adresse };
  /** Le logo pose puis retire dans les reglages : un motif (expression reguliere) du HTML qui n'est la qu'avec un logo. */
  logo?: { motif: string; page?: Adresse };
  /** Une page libre ajoutee, mise au menu, puis retiree. */
  pageLibre?: { menu: string };
  /** Une redirection creee puis supprimee, vers cette page. */
  redirection?: { vers: Adresse };
  /** Le titre SEO d'une entree de `sections`, et la page qui le porte. */
  seo?: { entree: string; page: Adresse; champ?: string };
  /** La police du site choisie ("Classique, à empattements") puis rendue a l'origine : les pages ou lire la feuille posee. */
  police?: { pages?: Adresse[] };
  /** Un bloc de l'accueil mis a la place 1 puis rendu a sa place : son entree, un morceau du HTML qui n'est que dans ce bloc, un morceau du HTML qui n'est que dans le bloc de tete. */
  ordre?: { entree: string; marqueBloc: string; marqueTete: string; pages?: Adresse[] };
}
