// src/moteur/accueil/extension.ts - l'extension EmDash "accueil" (generique) : le tableau de bord en tuiles, pose par le mecanisme natif des cartes de la page d'accueil.
//
// POURQUOI UNE EXTENSION. EmDash 0.38 n'ouvre sa page d'accueil qu'a un seul
// endroit : les cartes (admin.widgets) d'une extension, que Dashboard.tsx
// monte sous ses propres blocs. Une extension native (adminEntry) y rend un
// composant React, celui de admin.tsx. Rien d'autre n'est remplace : les
// compteurs viennent des routes deja ouvertes (manifeste, statistiques de
// l'accueil, non-lus de la gestion, tableau de la boutique), avec les droits
// de la personne connectee. Ni route, ni base, ni capacite ici.
import { definePlugin, type ResolvedPlugin } from "emdash";
import { CARTES, IDENTITE } from "./identite.mjs";

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    ...IDENTITE,
    capabilities: [],
    admin: { entry: `${IDENTITE.id}/admin`, widgets: CARTES },
  });
}

export default createPlugin;
