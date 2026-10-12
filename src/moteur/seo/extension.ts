// src/moteur/seo/extension.ts - l'extension EmDash "SEO" cote serveur : lire, enregistrer et remettre par defaut robots.txt et llms.txt, et l'etat du plan du site, pour l'ecran SEO du rail.
//
// EXTENSION NATIVE, ecran en React (admin.tsx) : un textarea par fichier, un
// compteur, des boutons qui s'activent selon l'etat, ce que Block Kit ne
// sait pas faire proprement.
//
// QUI A LE DROIT : "settings:manage", le role administrateur. Ce sont des
// reglages du site entier : un robots.txt faux peut sortir tout le site de
// Google. EmDash verifie la session, la permission et l'en-tete anti-CSRF
// avant chaque gestionnaire ; ctx.user est l'administrateur authentifie.
//
// Une route rend un objet, jamais une Response ; une erreur part en
// PluginRouteError avec un statut lisible (422 pour un texte refuse, 409
// pour un conflit, 503 sans base), jamais 502 que Cloudflare remplace.
import { definePlugin, PluginRouteError, type ResolvedPlugin, type RouteContext } from "emdash";
import { auditer, ecrireLeMotCle, inventaire, lireLes404, lireLesMotsCles, lireToutesLesRedirections, PAGES_PAR_APPEL, type PageInventoriee } from "./audit.serveur.ts";
import { type Base, d1De, lireLigne } from "./base.ts";
import { enregistrer, type EtatDuFichier, FICHIERS, type Fichiers, lireLeFichier, type NomDeFichier, revenirAuDefaut, TexteRefuse, texteParDefaut, valider } from "./fichiers.ts";
import { IDENTITE, PAGE_SEO } from "./identite.mjs";
import type { Resume } from "./route.ts";
import { PLAN, SEO } from "./site.ts";

interface Hote {
  base: Base | null;
  fichiers: Fichiers | null;
}

async function hote(): Promise<Hote> {
  try {
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: { env?: Record<string, unknown> } = await import("cloudflare:workers");
    const env = plateforme.env ?? {};
    const assets = env.ASSETS as Fichiers | undefined;
    return { base: d1De(env, SEO.liaison ?? "DB"), fichiers: assets && typeof assets.fetch === "function" ? assets : null };
  } catch {
    return { base: null, fichiers: null };
  }
}

const qui = (ctx: RouteContext): string => ctx.user?.email ?? ctx.user?.name ?? "inconnu";

function corps(ctx: RouteContext): Record<string, unknown> {
  const e = ctx.input;
  return typeof e === "object" && e !== null && !Array.isArray(e) ? (e as Record<string, unknown>) : {};
}

function nomDemande(v: unknown): NomDeFichier {
  if (!(FICHIERS as readonly unknown[]).includes(v)) throw new PluginRouteError("FICHIER", "Fichier inconnu : robots.txt ou llms.txt.", 400);
  return v as NomDeFichier;
}

interface EtatDeLEcran {
  origine: string;
  fichiers: Record<NomDeFichier, EtatDuFichier & { parDefaut: string | null }>;
  plan: (Resume & { changeLe: number }) | null;
}

async function etat(h: Hote & { base: Base }, origine: string): Promise<EtatDeLEcran> {
  const fichiers = {} as EtatDeLEcran["fichiers"];
  for (const nom of FICHIERS) {
    const lu = await lireLeFichier(h.base, nom);
    // Le site d'abord (un fichier rendu a la demande), puis le fichier fige par le build.
    const parDefaut = (SEO.texteParDefaut ? await SEO.texteParDefaut(nom).catch(() => null) : null) ?? (await texteParDefaut(h.fichiers, nom, origine));
    fichiers[nom] = { ...lu, parDefaut };
  }
  const ligne = await lireLigne(h.base, "plan");
  let plan: EtatDeLEcran["plan"] = null;
  if (ligne?.contenu) {
    try {
      plan = { ...(JSON.parse(ligne.contenu) as Resume), changeLe: ligne.maj };
    } catch {
      plan = null;
    }
  }
  return { origine, fichiers, plan };
}

function route(appel: (ctx: RouteContext, h: Hote & { base: Base }, origine: string) => Promise<unknown>) {
  return {
    permission: "settings:manage" as const,
    handler: async (ctx: RouteContext) => {
      const h = await hote();
      if (!h.base) throw new PluginRouteError("SANS_BASE", "La base du site est introuvable : cet écran ne marche que sur le site en ligne ou sous « pnpm dev:moteur ».", 503);
      const origine = SEO.origine ?? new URL(ctx.request.url).origin;
      try {
        return await appel(ctx, { ...h, base: h.base }, origine);
      } catch (erreur) {
        if (erreur instanceof PluginRouteError) throw erreur;
        if (erreur instanceof TexteRefuse) throw new PluginRouteError("TEXTE_REFUSE", erreur.message, 422);
        ctx.log.error("SEO : une route a echoue", { detail: (erreur instanceof Error ? erreur.message : String(erreur)).slice(0, 300) });
        throw new PluginRouteError("SEO_ERREUR", "Le site n'a pas pu lire ou écrire sa base. Réessayez dans un instant ; si cela recommence, rechargez la page.", 500);
      }
    },
  };
}

const SORTES = ["accueil", "produit", "article", "rayon", "page"] as const;

/** Les pages a auditer envoyees par l'ecran, relues sans confiance : un chemin du site, jamais une autre origine. */
function pagesDemandees(v: unknown, origine: string): PageInventoriee[] {
  if (!Array.isArray(v)) throw new PluginRouteError("PAGES", "Liste de pages illisible.", 400);
  return v.slice(0, PAGES_PAR_APPEL).map((x) => {
    const o = (typeof x === "object" && x !== null ? x : {}) as Record<string, unknown>;
    const chemin = typeof o.chemin === "string" ? o.chemin : "";
    if (!chemin.startsWith("/") || chemin.startsWith("//") || new URL(chemin, origine).origin !== new URL(origine).origin) throw new PluginRouteError("PAGES", "Adresse de page refusée.", 400);
    return {
      chemin,
      collection: typeof o.collection === "string" ? o.collection : null,
      sorte: (SORTES as readonly unknown[]).includes(o.sorte) ? (o.sorte as PageInventoriee["sorte"]) : "page",
      dansLePlan: o.dansLePlan === true,
      noindexEnBase: o.noindexEnBase === true,
    };
  });
}

function issue(resultat: "ecrit" | "conflit" | "illisible"): void {
  if (resultat === "conflit") throw new PluginRouteError("CONFLIT", "robots.txt vient d'être modifié ailleurs (Paramètres > SEO) : rechargez la page pour voir le texte actuel, puis recommencez.", 409);
  if (resultat === "illisible") throw new PluginRouteError("ILLISIBLE", "Les réglages SEO du site sont illisibles dans la base : rien n'a été écrit. Ouvrez Paramètres > SEO et enregistrez-les une fois.", 409);
}

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    ...IDENTITE,
    admin: { entry: "aloha-seo/admin", pages: [PAGE_SEO] },
    routes: {
      etat: route(async (_ctx, h, origine) => etat(h, origine)),
      enregistrer: route(async (ctx, h, origine) => {
        const e = corps(ctx);
        const nom = nomDemande(e.nom);
        issue(await enregistrer(h.base, nom, valider(nom, e.texte, origine), qui(ctx)));
        return etat(h, origine);
      }),
      "audit-inventaire": route(async (_ctx, h, origine) => {
        const { pages, planLisible } = await inventaire(h.base, origine, PLAN);
        return {
          origine,
          pages,
          planLisible,
          parAppel: PAGES_PAR_APPEL,
          motsCles: await lireLesMotsCles(h.base),
          redirections: await lireToutesLesRedirections(h.base),
          introuvables: await lireLes404(h.base),
        };
      }),
      "audit-pages": route(async (ctx, h, origine) => ({ pages: await auditer(origine, pagesDemandees(corps(ctx).pages, origine), await lireLesMotsCles(h.base)) })),
      "audit-mot-cle": route(async (ctx, h) => {
        const e = corps(ctx);
        if (typeof e.chemin !== "string" || typeof e.motCle !== "string") throw new PluginRouteError("MOT_CLE", "Mot clé illisible.", 400);
        try {
          return { motsCles: await ecrireLeMotCle(h.base, e.chemin, e.motCle, qui(ctx)) };
        } catch (erreur) {
          if (erreur instanceof RangeError) throw new PluginRouteError("MOT_CLE", erreur.message, 422);
          throw erreur;
        }
      }),
      defaut: route(async (ctx, h, origine) => {
        const nom = nomDemande(corps(ctx).nom);
        issue(await revenirAuDefaut(h.base, nom, qui(ctx)));
        return etat(h, origine);
      }),
    },
  });
}

export default createPlugin;
