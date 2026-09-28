// src/moteur/extensions/courriels/identite.mjs - l'identite de l'extension "Courriels", ses pages et sa carte, ecrites une fois.
//
// EmDash lit ces valeurs a deux endroits qui doivent dire la meme chose : le
// descripteur que la configuration lui tend au demarrage (Node, donc un fichier
// .mjs), et la definition que extension.ts rend dans le Worker. Les libelles du
// rail sont en francais, comme ceux de "Tout deployer" : EmDash 0.38 n'a pas
// de catalogue pour les pages d'extension.
export const IDENTITE = { id: "aloha-courriels", version: "1.0.0" };

/**
 * Les capacites demandees a EmDash : envoyer par le canal (ctx.email), lire
 * les evenements du canal (email:afterSend, le journal) et, quand le Worker a
 * sa liaison, livrer (email:deliver).
 * @param {boolean} livrer
 * @returns {string[]}
 */
export function capacites(livrer) {
  return ["email:send", "hooks.email-events:register", ...(livrer ? ["hooks.email-transport:register"] : [])];
}

/** Les pages du rail, dans l'ordre. Les icones sont des noms Phosphor. */
export const PAGES = [
  { path: "/", label: "Courriels", icon: "envelope-simple" },
  { path: "/journal", label: "Journal des courriels", icon: "list" },
  { path: "/brancher", label: "Brancher les courriels", icon: "plug" },
  { path: "/reglages", label: "Réglages des courriels", icon: "gear" },
];

/**
 * La carte de l'accueil du back office.
 * @type {{ id: string; size: "full" | "half" | "third"; title: string }[]}
 */
export const CARTES = [{ id: "courriels", size: "half", title: "Courriels" }];
