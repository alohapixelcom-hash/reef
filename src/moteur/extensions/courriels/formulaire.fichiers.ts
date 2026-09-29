// src/moteur/extensions/courriels/formulaire.fichiers.ts - moteur eteint : aucun envoi, les formulaires de contact et de la lettre restent tels qu'ils sont livres.
//
// L'alias @moteur/courriels pointe ici tant qu'ALOHA_MOTEUR n'est pas pose
// (moteur.config.mjs) : le composant du formulaire recoit null, n'ajoute rien,
// et le build statique ne change pas d'un octet.

/** Ce que le composant du formulaire ajoute quand l'envoi est branche. */
export interface Envoi {
  /** A etaler sur <form> : action et method. */
  attributs: { action: string; method: "post" };
  /** Les champs caches : la page de retour, la langue du visiteur, et le champ piege a robots. */
  caches: { retour: string; langue: "fr" | "en"; piege: string };
  /** La phrase a afficher au retour d'un envoi, ou null. */
  avis: { ton: "succes" | "attention"; texte: string } | null;
}

export async function envoiDuFormulaire(_page: { url: URL; currentLocale?: string | undefined }): Promise<Envoi | null> {
  return null;
}

export async function envoiDeLaLettre(_page: { url: URL; currentLocale?: string | undefined }): Promise<Envoi | null> {
  return null;
}
