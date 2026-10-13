// src/moteur/maintenance/identite.mjs - l'identite de l'extension "Maintenance", ecrite une fois.
//
// EmDash la lit a deux endroits qui doivent dire la meme chose : le
// descripteur que moteur.config.mjs lui tend au demarrage (Node, donc un
// fichier .mjs), et la definition que extension.ts rend dans le Worker.
// L'identifiant entre dans le nom de l'option que le Worker frontal relit
// (regles.ts) : il ne change jamais.
export const IDENTITE = { id: "aloha-maintenance", version: "1.0.0" };
