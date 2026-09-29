// src/moteur/champs/extension.ts - l'extension EmDash "champs" (generique) : des champs de saisie que le back office d'EmDash 0.38 n'a pas, poses par leur `widget`.
//
// LE MANQUE. Un champ "reference" d'EmDash 0.38 (une entree d'une autre
// collection : l'auteur d'un article, son sujet) est range et verifie par le
// moteur, mais son ecran l'affiche comme une case de texte ou il faudrait
// taper l'identifiant de l'entree (01M3MSG1RN...). Aucun client ne le fera.
//
// LE BRANCHEMENT NATIF. Un champ de la graine qui porte un `widget` de la forme
// "<extension>:<champ>" est rendu par le composant que l'extension exporte
// sous `fields` dans son module d'administration (FieldRenderer d'EmDash).
// Rien d'autre ne change : le moteur range toujours l'identifiant, le verifie
// a l'enregistrement (validation des references), et l'API le rend tel quel.
// Cette extension n'a donc ni route ni base : seulement son composant, declare
// par la configuration du moteur (adminEntry, voir admin.ts).
import { definePlugin, type ResolvedPlugin } from "emdash";
import { IDENTITE } from "./identite.mjs";

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    ...IDENTITE,
    capabilities: [],
    admin: { entry: `${IDENTITE.id}/admin` },
  });
}

export default createPlugin;
