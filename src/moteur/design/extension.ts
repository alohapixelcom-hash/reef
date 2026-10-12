// src/moteur/design/extension.ts - l'extension EmDash "Design" cote serveur : les listes de choix du site et la feuille de l'apercu, calculee par les memes fonctions que la page publique.
//
// EXTENSION NATIVE, ecran en React (admin.tsx). L'ecran lit et ecrit lui-meme
// l'entree "site" de chaque langue et le logo des Parametres par l'API
// d'EmDash, avec la session de la personne connectee : enregistrer, c'est
// publier ces entrees, exactement comme depuis "Reglages par langue". Ici, le
// serveur ne fait que ce que le navigateur ne peut pas faire sans le code du
// theme : la feuille de chaque choix (couleur, police, tailles, rayons), pour
// l'apercu en direct.
//
// LE THEME EST LU PAR SON ADAPTATEUR (src/moteur/theme.ts) : variablesDeLaPalette
// et VARIABLES_DE_POLICE, et JETONS_DU_DESIGN s'il s'ecarte des jetons de la
// maison (racine du texte, rayons). Un theme sans palette ou sans police n'en
// propose pas : l'ecran ne montre jamais un choix qui ne changerait rien.
//
// QUI A LE DROIT : "settings:manage", le role administrateur. La couleur, la
// police et les tailles valent pour tout le site.
import { definePlugin, PluginRouteError, type ResolvedPlugin, type RouteContext } from "emdash";
import { CHOIX_DE_COULEUR, feuilleDeLaPalette } from "../palette.ts";
import * as theme from "../theme.ts";
import { CHOIX_DE_POLICE, feuilleDeLaTypographie, type VariablesDePolice } from "../typographie.ts";
import { CHAMPS_DU_DESIGN, CHOIX_DE_RAYON, CHOIX_DE_TAILLE, feuilleDuDesign, JETONS_DE_LA_MAISON, type ChoixDuDesign, type JetonsDuDesign } from "./echelles.ts";
import { IDENTITE, PAGE_DESIGN } from "./identite.mjs";

const lu = theme as unknown as Record<string, unknown>;
const variablesDeLaPalette = typeof lu.variablesDeLaPalette === "function" ? (lu.variablesDeLaPalette as (teinte: number) => Record<string, string>) : null;
const variablesDePolice = (lu.VARIABLES_DE_POLICE ?? null) as VariablesDePolice | null;
const jetons = (lu.JETONS_DU_DESIGN ?? JETONS_DE_LA_MAISON) as JetonsDuDesign;

function corps(ctx: RouteContext): Record<string, unknown> {
  const e = ctx.input;
  return typeof e === "object" && e !== null && !Array.isArray(e) ? (e as Record<string, unknown>) : {};
}

/** Les choix de l'apercu, relus sans confiance : une valeur hors des listes vaut vide (le rendu d'origine). */
function choixLus(e: Record<string, unknown>): { couleur: unknown; police: unknown; design: ChoixDuDesign } {
  const dans = (v: unknown, liste: readonly string[]): string | null => (typeof v === "string" && liste.includes(v) ? v : null);
  const design: ChoixDuDesign = {};
  for (const champ of CHAMPS_DU_DESIGN) design[champ] = dans(e[champ], champ === "radius" ? CHOIX_DE_RAYON : CHOIX_DE_TAILLE);
  return { couleur: dans(e.brand_color, CHOIX_DE_COULEUR), police: dans(e.font, CHOIX_DE_POLICE), design };
}

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    ...IDENTITE,
    admin: { entry: `${IDENTITE.id}/admin`, pages: [PAGE_DESIGN] },
    routes: {
      listes: {
        permission: "settings:manage",
        handler: async () => ({
          couleurs: variablesDeLaPalette ? CHOIX_DE_COULEUR : [],
          polices: variablesDePolice ? CHOIX_DE_POLICE : [],
          tailles: CHOIX_DE_TAILLE,
          rayons: Object.keys(jetons.rayons).length ? CHOIX_DE_RAYON : [],
        }),
      },
      apercu: {
        permission: "settings:manage",
        handler: async (ctx: RouteContext) => {
          try {
            const { couleur, police, design } = choixLus(corps(ctx));
            const feuilles = [
              variablesDeLaPalette ? feuilleDeLaPalette(couleur, variablesDeLaPalette) : null,
              variablesDePolice ? feuilleDeLaTypographie(police, variablesDePolice) : null,
              feuilleDuDesign(design, jetons),
            ];
            return { feuille: feuilles.filter(Boolean).join("\n") };
          } catch (erreur) {
            ctx.log.error("Design : l'apercu a echoue", { detail: (erreur instanceof Error ? erreur.message : String(erreur)).slice(0, 300) });
            throw new PluginRouteError("APERCU", "L'aperçu n'a pas pu se calculer. Rechargez la page.", 500);
          }
        },
      },
    },
  });
}

export default createPlugin;
