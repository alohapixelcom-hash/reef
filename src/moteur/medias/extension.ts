// src/moteur/medias/extension.ts - l'extension EmDash "Medias" : la carte "Photos" du tableau de bord et son geste "Optimiser les photos existantes".
//
// EXTENSION NATIVE : elle lit la base (D1), le seau des medias (R2, ou KV
// sur un compte sans R2 : seauDe de lot.ts) et le
// liant Images du Worker, ce qu'une extension "sandbox" ne peut pas. Pas
// d'entree au rail : la seule chose visible est la carte (voir carte.ts).
// La conversion des photos neuves, elle, ne passe pas par ici : elle vit en
// tete du Worker (aiguillage.ts), parce qu'aucun crochet d'EmDash 0.38 ne
// voit les octets d'un envoi.
//
// QUI A LE DROIT : la carte se lit avec "media:upload" (qui peut envoyer une
// photo voit ce qu'elle est devenue) ; le lot reecrit des photos d'autres
// auteurs, il demande donc le role de "media:edit_any", Editeur (40) et plus.
import { definePlugin, type ResolvedPlugin, type RouteContext } from "emdash";
import { bilan, d1De, derniers, restantes } from "./base.ts";
import { ACTION_OPTIMISER, composer, type Reponse } from "./carte.ts";
import type { Images } from "./conversion.ts";
import { CARTE_PHOTOS, IDENTITE } from "./identite.mjs";
import { LOT, optimiserUnLot, seauDe } from "./lot.ts";
import { textesDe, TITRE_DE_LA_CARTE } from "./textes";

/** Le role minimal de "media:edit_any" dans EmDash 0.38 (@emdash-cms/auth, Permissions). */
const ROLE_QUI_OPTIMISE = 40;
const LIGNES_DU_JOURNAL = 5;

export interface OptionsDesMedias {
  /** Les noms des liaisons du Worker ; ceux de la maison par defaut. `seau` : un seau R2 ou un espace KV (reconnu seul). */
  base?: string;
  seau?: string;
  images?: string;
  /** false : jamais d'AVIF. A garder identique a l'option passee a l'aiguillage du Worker. */
  avif?: boolean;
}

interface Hote {
  env: Record<string, unknown>;
}

async function hote(): Promise<Hote> {
  try {
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: { env?: Record<string, unknown> } = await import("cloudflare:workers");
    return { env: plateforme.env ?? {} };
  } catch {
    return { env: {} };
  }
}

function actionDemandee(entree: unknown): string | null {
  if (typeof entree !== "object" || entree === null) return null;
  const { type, action_id } = entree as { type?: unknown; action_id?: unknown };
  return type === "block_action" && typeof action_id === "string" ? action_id : null;
}

export function createPlugin(options: OptionsDesMedias = {}): ResolvedPlugin {
  async function carte(ctx: RouteContext): Promise<Reponse> {
    const { env } = await hote();
    const base = d1De(env, options.base ?? "DB");
    const images = (env[options.images ?? "IMAGES"] as Images | undefined) ?? null;
    const seau = seauDe(env[options.seau ?? "MEDIA"]);
    const { langue, textes } = textesDe(ctx.request);
    const peutOptimiser = (ctx.user?.role ?? 0) >= ROLE_QUI_OPTIMISE;
    const maintenant = Date.now;

    let lot: Awaited<ReturnType<typeof optimiserUnLot>> | "refuse" | undefined;
    if (actionDemandee(ctx.input) === ACTION_OPTIMISER) {
      if (!peutOptimiser) lot = "refuse";
      else if (base && seau && images) {
        lot = await optimiserUnLot({ base, seau, images, maintenant, avif: options.avif });
        ctx.log.info("Medias : lot traite", { qui: ctx.user?.email ?? null, ...lot });
      }
    }
    if (!base) {
      return composer({ langue, textes, relie: false, lotPossible: false, peutOptimiser, faites: 0, gagnes: 0, restantes: 0, lot: LOT, journal: [] }, lot);
    }
    const fait = await bilan(base);
    return composer(
      {
        langue,
        textes,
        relie: Boolean(images),
        lotPossible: Boolean(images && seau),
        peutOptimiser,
        faites: fait.faites,
        gagnes: fait.gagnes,
        restantes: await restantes(base, maintenant()),
        lot: LOT,
        journal: await derniers(base, LIGNES_DU_JOURNAL),
      },
      lot,
    );
  }

  return definePlugin({
    ...IDENTITE,
    routes: {
      admin: { permission: "media:upload", handler: carte },
    },
    admin: { widgets: [{ id: CARTE_PHOTOS, title: TITRE_DE_LA_CARTE, size: "half" }] },
  });
}

export default createPlugin;
