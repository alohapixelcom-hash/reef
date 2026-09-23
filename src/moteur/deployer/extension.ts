// src/moteur/deployer/extension.ts - l'extension EmDash "Tout deployer" : une page du back office, un bouton, une preuve.
//
// EXTENSION NATIVE, RANGEE DANS LE DEPOT. Une extension "sandbox" tourne dans
// un isolat sans acces a l'hote : elle ne peut ni appeler les fonctions
// d'invalidation d'EmDash, ni `cache.purge` de la plateforme, ni lire un secret
// du Worker. Vider des caches et lancer un build, c'est agir avec l'autorite du
// site : c'est la definition d'une extension native. moteur.config.mjs
// l'enregistre, moteur allume seulement.
//
// La page, elle, reste en Block Kit (voir page.ts) : la route `admin` recoit
// chaque interaction et rend des blocs.
import { definePlugin, type ResolvedPlugin, type RouteContext } from "emdash";
import { hookConfigure, toutDeployer } from "./action";
import { IDENTITE } from "./identite.mjs";
import { dernierDeclenchement, derniers } from "./journal";
import { ACTION_DEPLOYER, composer, type Reponse } from "./page";
import { langueDe, TEXTES_DU_SITE } from "./textes";

const LIGNES_DU_JOURNAL = 5;

/** Lit une interaction Block Kit sans lui faire confiance : seul l'identifiant de l'action compte ici. */
function actionDemandee(entree: unknown): string | null {
  if (typeof entree !== "object" || entree === null) return null;
  const { type, action_id } = entree as { type?: unknown; action_id?: unknown };
  return type === "block_action" && typeof action_id === "string" ? action_id : null;
}

async function page(ctx: RouteContext): Promise<Reponse> {
  // Tout autre evenement (ouverture, "Actualiser", tri du tableau) relit l'etat.
  const clic = actionDemandee(ctx.input) === ACTION_DEPLOYER ? await toutDeployer(ctx) : undefined;
  return composer(
    {
      langue: langueDe(ctx.request),
      hook: hookConfigure(),
      dernier: await dernierDeclenchement(ctx),
      passages: await derniers(ctx, LIGNES_DU_JOURNAL),
      adresseVersion: ctx.url("/version.json"),
    },
    clic,
  );
}

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    ...IDENTITE,
    storage: { journal: { indexes: ["quand"] } },
    routes: {
      admin: {
        // Qui a le droit de tout publier a le droit de tout deployer : le
        // bouton clot une seance de redaction, ce n'est pas un reglage
        // d'administrateur.
        permission: "content:publish_any",
        handler: page,
      },
    },
    // Le libelle du menu est fige au demarrage : il suit la langue par defaut du site.
    admin: { pages: [{ path: "/", label: TEXTES_DU_SITE.titre, icon: "upload" }] },
  });
}

export default createPlugin;
