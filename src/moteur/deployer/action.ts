// src/moteur/deployer/action.ts - ce que fait un clic sur "Tout deployer", dans l'ordre : la garde, les caches, le hook de build, le journal.
//
// LE SECRET : ALOHA_DEPLOY_HOOK est l'adresse d'un Deploy Hook de Cloudflare
// Workers Builds. Qui la connait peut lancer un build : elle se pose par
// `wrangler secret put` (ou dans .dev.vars en local), jamais dans le depot, et
// ce fichier ne l'ecrit ni dans le journal, ni dans un message, ni dans une
// erreur.
//
// POURQUOI `fetch` ET NON `ctx.http` : le client HTTP des extensions refuse la
// machine locale (garde anti-SSRF), ce qui interdit de prouver le bouton contre
// un faux hook. L'adresse ne vient pas d'un visiteur mais d'un secret pose par
// le proprietaire, et lireLeHook (regles.ts) n'accepte que https hors
// developpement : la garde qui compte est la.
import { getSecret } from "astro:env/server";
import type { RouteContext } from "emdash";
import { versionServie } from "../version";
import { type BilanCaches, viderLesCaches } from "./caches";
import { inscrire, type Passage, prendreLaGarde, rendreLaGarde } from "./journal";
import { type Hook, lireLeHook, secondes } from "./regles";
import { langueDe, type Textes, textesPour } from "./textes";

/** Un build ne demarre pas plus vite parce qu'on attend : dix secondes suffisent a savoir si le hook repond. */
const DELAI_DU_HOOK_MS = 10_000;

export function hookConfigure(): Hook {
  return lireLeHook(getSecret("ALOHA_DEPLOY_HOOK"), import.meta.env.DEV);
}

function resumer(TEXTES: Textes, bilan: BilanCaches): string {
  const { objets, routes } = bilan;
  if (objets.etat === "aucun" && routes.etat === "aucun") return TEXTES.caches.aucun;
  const morceaux = [
    objets.etat === "vide" ? TEXTES.caches.objetsVides(objets.espaces) : TEXTES.caches.objetsAucun,
    routes.etat === "vide"
      ? TEXTES.caches.routesVides
      : routes.etat === "aucun"
        ? TEXTES.caches.routesAucun
        : routes.etat === "inconnu"
          ? TEXTES.caches.routesInconnu(routes.fournisseur)
          : TEXTES.caches.routesEchec(routes.detail),
  ];
  return morceaux.join(" ");
}

/** Envoie le POST. Rend le code HTTP, ou null si aucune reponse n'est arrivee. */
async function appelerLeHook(url: string): Promise<number | null> {
  try {
    const reponse = await fetch(url, { method: "POST", signal: AbortSignal.timeout(DELAI_DU_HOOK_MS) });
    // Le corps ne sert a rien ici, mais un corps non lu retient la connexion.
    await reponse.body?.cancel();
    return reponse.status;
  } catch {
    // L'erreur d'origine peut citer l'adresse, donc le secret : elle n'est ni journalisee ni affichee.
    return null;
  }
}

export interface Resultat {
  passage: Passage;
  /** Millisecondes a attendre, quand le clic a ete refuse par la garde. */
  attente: number;
}

export async function toutDeployer(ctx: RouteContext): Promise<Resultat> {
  // Le journal garde la phrase telle qu'elle a ete dite a qui a clique, dans sa langue.
  const TEXTES = textesPour(langueDe(ctx.request));
  const maintenant = Date.now();
  const base = {
    quand: new Date(maintenant).toISOString(),
    qui: ctx.user?.name || ctx.user?.email || TEXTES.inconnu,
    construit: versionServie.construit,
  };
  const hook = hookConfigure();

  // 1. La garde. Un clic refuse ne fait RIEN, caches compris, et le dit.
  if (hook.etat === "pret") {
    const attente = await prendreLaGarde(ctx, maintenant);
    if (attente > 0) {
      const passage: Passage = { ...base, caches: TEXTES.caches.nonTouches, build: "refuse", code: null };
      await inscrire(ctx, passage);
      ctx.log.info(`Tout deployer : refuse, ${secondes(attente)} a attendre`, { qui: base.qui });
      return { passage, attente };
    }
  }

  // 2. Les caches du contenu, que le hook existe ou non.
  const caches = resumer(TEXTES, await viderLesCaches());

  // 3. Le build des pages figees.
  let passage: Passage;
  if (hook.etat === "pret") {
    const code = await appelerLeHook(hook.url);
    if (code === null) await rendreLaGarde(ctx);
    passage = { ...base, caches, build: code === null ? "injoignable" : "declenche", code };
  } else {
    passage = { ...base, caches, build: hook.etat === "absent" ? "sans-hook" : "hook-invalide", code: null };
  }

  // 4. Le journal.
  await inscrire(ctx, passage);
  ctx.log.info(`Tout deployer : ${passage.build}`, { qui: base.qui, code: passage.code });
  return { passage, attente: 0 };
}
