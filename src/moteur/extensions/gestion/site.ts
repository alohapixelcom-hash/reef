// src/moteur/extensions/gestion/site.ts - ce que l'extension Gestion demande au site : d'ou viennent les messages de son formulaire de contact.
//
// Fichier du site : pose une fois par le socle, jamais reecrit ensuite.

export interface SiteDeLaGestion {
  /**
   * "local" : le formulaire de contact du site est branche sur l'extension
   * Courriels, qui garde chaque message dans la base du site.
   * "aucun" : le site n'a pas de formulaire de contact (pas d'ecran Messages).
   * { liaison } : les messages sont ranges par un autre Worker, joint par une
   * liaison de service declaree dans le fichier du Worker (son nom ici).
   */
  messages: "local" | "aucun" | { liaison: string };
}

export const SITE: SiteDeLaGestion = { messages: "local" };
