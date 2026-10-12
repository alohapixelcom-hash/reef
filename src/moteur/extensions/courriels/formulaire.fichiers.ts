// src/moteur/extensions/courriels/formulaire.fichiers.ts - moteur eteint : aucun envoi, les formulaires de contact et de la lettre restent tels qu'ils sont livres.
//
// L'alias @moteur/courriels pointe ici tant qu'ALOHA_MOTEUR n'est pas pose
// (moteur.config.mjs) : le composant du formulaire recoit null, n'ajoute rien,
// ne charge aucun script Turnstile, et le build statique ne change pas d'un octet.

/** Ce que le composant du formulaire ajoute quand l'envoi est branche. */
export interface Envoi {
  /** A etaler sur <form> : action et method. */
  attributs: { action: string; method: "post" };
  /**
   * Les champs caches : la page de retour, la langue du visiteur, le champ
   * piege a robots, et le nom du formulaire du site quand il en a donne un
   * (il choisit les champs en plus declares dans configuration.ts).
   */
  caches: { retour: string; langue: "fr" | "en"; piege: string; formulaire?: string };
  /** La phrase a afficher au retour d'un envoi, ou null. */
  avis: { ton: "succes" | "attention"; texte: string } | null;
  /**
   * Le widget Turnstile visible a rendre dans le formulaire, avant le bouton
   * (./Turnstile.astro ou ./Verification.astro) : la cle publique, la langue,
   * l'action que le widget signe ("contact" ou "lettre"), l'adresse du script
   * (a charger sur cette page seulement) et la phrase a montrer sans
   * JavaScript. Null quand la protection n'est pas active. Ecrit dans une
   * chaine (`data-sitekey={envoi.turnstile}`), il rend la cle publique : un
   * composant de site qui le lisait comme une chaine marche tel quel.
   */
  turnstile: WidgetTurnstile | null;
  /** Le meme widget, sous le nom que lit ./Verification.astro. */
  verification: WidgetTurnstile | null;
  /** La cle publique seule, ou null. */
  cleTurnstile: string | null;
}

export interface WidgetTurnstile {
  cle: string;
  langue: "fr" | "en";
  action: "contact" | "lettre";
  script: string;
  sansScript: string;
  toString(): string;
}

export async function envoiDuFormulaire(_page: { url: URL; currentLocale?: string | undefined }, _formulaire?: string): Promise<Envoi | null> {
  return null;
}

export async function envoiDeLaLettre(_page: { url: URL; currentLocale?: string | undefined }): Promise<Envoi | null> {
  return null;
}
