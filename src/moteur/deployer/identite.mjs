// src/moteur/deployer/identite.mjs - l'identite de l'extension "Tout deployer", ecrite une fois.
//
// EmDash la lit a deux endroits qui doivent dire la meme chose : le
// descripteur que moteur.config.mjs lui tend au demarrage (Node, donc un
// fichier .mjs), et la definition que extension.ts rend dans le Worker.
export const IDENTITE = { id: "aloha-deployer", version: "1.0.0" };
