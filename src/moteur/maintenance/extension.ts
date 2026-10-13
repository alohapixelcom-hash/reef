// src/moteur/maintenance/extension.ts - l'extension EmDash "Maintenance" : une page du back office, l'interrupteur et les reglages de la page d'attente que sert le Worker frontal.
//
// EXTENSION NATIVE, comme "Mettre le site a jour" : moteur.config.mjs
// l'enregistre, moteur allume seulement. Elle n'ecrit que deux valeurs, par
// ctx.kv (regles.ts) : l'interrupteur et les reglages de la page d'attente
// (titre, sous-titre, photo ou video de la mediatheque, date de retour). C'est
// le Worker frontal du socle qui ferme le site et compose la page en les
// lisant (frontal/src/frontal/maintenance.ts, attente.ts).
//
// Reservee a qui regle le site (settings:manage) : fermer une boutique n'est
// pas un geste de redaction. "media:read" : lister les photos et les videos
// de la mediatheque pour les proposer comme fond.
import { definePlugin, type ResolvedPlugin, type RouteContext } from "emdash";
import { IDENTITE } from "./identite.mjs";
import { ACTION_ENREGISTRER, composer, type Geste, type MediaPropose, type Reponse } from "./page";
import { CLE, CLE_REGLAGES, estFerme, reglagesLus, SaisieRefusee, validerLesReglages } from "./regles";
import { textesDe, TEXTES_DU_SITE } from "./textes";

/** Combien de medias chaque liste propose au plus (les plus recents d'abord, ordre de la mediatheque). */
const MEDIAS_PROPOSES = 100;

interface Interaction {
  type: string;
  action_id?: string;
  values?: Record<string, unknown>;
}

/** Lit une interaction Block Kit sans lui faire confiance. */
function interaction(entree: unknown): Interaction | null {
  if (typeof entree !== "object" || entree === null) return null;
  const { type, action_id, values } = entree as Record<string, unknown>;
  if (typeof type !== "string") return null;
  return {
    type,
    ...(typeof action_id === "string" ? { action_id } : {}),
    ...(typeof values === "object" && values !== null && !Array.isArray(values) ? { values: values as Record<string, unknown> } : {}),
  };
}

/** Les medias d'une sorte ("image/", "video/"), ou une liste vide si la mediatheque n'est pas lisible. */
async function medias(ctx: RouteContext, prefixe: string): Promise<MediaPropose[]> {
  try {
    const lu = await ctx.media?.list({ mimeType: prefixe, limit: MEDIAS_PROPOSES });
    return (lu?.items ?? []).filter((m) => m.mimeType.startsWith(prefixe)).map((m) => ({ id: m.id, nom: m.filename }));
  } catch {
    return [];
  }
}

async function page(ctx: RouteContext): Promise<Reponse> {
  const T = textesDe(ctx.request);
  const [images, videos] = await Promise.all([medias(ctx, "image/"), medias(ctx, "video/")]);
  const avant = estFerme(await ctx.kv.get(CLE));
  let geste: Geste | undefined;
  const i = interaction(ctx.input);
  if (i?.type === "form_submit" && i.action_id === ACTION_ENREGISTRER && i.values) {
    try {
      const reglages = validerLesReglages(i.values, { images: images.map((m) => m.id), videos: videos.map((m) => m.id) }, T.erreurs);
      await ctx.kv.set(CLE_REGLAGES, reglages);
      const ferme = i.values.actif === true;
      await ctx.kv.set(CLE, ferme);
      geste = ferme === avant ? "enregistre" : ferme ? "ferme" : "rouvert";
      ctx.log.info("Maintenance : reglages enregistres", { qui: ctx.user?.email ?? null, ferme });
    } catch (e) {
      if (!(e instanceof SaisieRefusee)) throw e;
      geste = { erreur: e.message };
    }
  }
  // Tout autre evenement (ouverture, "Verifier") relit l'etat.
  const ferme = estFerme(await ctx.kv.get(CLE));
  return composer(T, { ferme, reglages: reglagesLus(await ctx.kv.get(CLE_REGLAGES)), images, videos }, geste);
}

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    ...IDENTITE,
    capabilities: ["media:read"],
    routes: { admin: { permission: "settings:manage", handler: page } },
    // Le libelle du menu est fige au demarrage : il suit la langue par defaut du site.
    admin: { pages: [{ path: "/", label: TEXTES_DU_SITE.titre, icon: "traffic-cone" }] },
  });
}

export default createPlugin;
