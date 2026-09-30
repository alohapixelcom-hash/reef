// src/moteur/extensions/gestion/identite.mjs - l'identite de l'extension "Gestion" et ses pages, ecrites une fois.
//
// Lu par la configuration du moteur (Node, d'ou le .mjs) et par extension.ts
// dans le Worker. Les libelles du rail sont en francais, comme ceux des
// autres extensions de la maison.
export const IDENTITE = { id: "aloha-gestion", version: "1.0.0" };

/** Les capacites demandees a EmDash : envoyer par le canal (repondre a un message, renvoyer un courriel). */
export const CAPACITES = ["email:send"];

/** Les pages possibles, dans l'ordre du rail. Les icones sont des noms Phosphor. */
export const PAGE_MESSAGES = { path: "/messages", label: "Messages", icon: "chat-circle-text" };
export const PAGE_ABONNES = { path: "/abonnes", label: "Abonnés de la lettre", icon: "users-three" };
export const PAGE_JOURNAL = { path: "/journal", label: "Journal des courriels", icon: "list" };

/**
 * Les pages d'un site : Messages s'il recoit des messages, Abonnes s'il a une
 * lettre, le journal toujours (tout site de la maison envoie des courriels).
 * @param {{ messages: boolean, lettre: boolean }} site
 */
export function pagesDuSite(site) {
  return [...(site.messages ? [PAGE_MESSAGES] : []), ...(site.lettre ? [PAGE_ABONNES] : []), PAGE_JOURNAL];
}
