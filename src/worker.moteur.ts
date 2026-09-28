// src/worker.moteur.ts - point d'entree du Worker quand le moteur est allume : adresses reglees d'avance, langue du visiteur, langue du back office, Astro a la demande (page introuvable comprise), et le cron des publications programmees.
//
// Pas de `satisfies ExportedHandler` ici : ce type vient de
// worker-configuration.d.ts, que `wrangler types` genere sur la machine de qui
// deploie. Le theme ne l'embarque pas, et `pnpm check` doit rester a zero
// moteur eteint. Wrangler verifie la forme de l'export au deploiement.
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";
import { langueDuBackOffice } from "./moteur/langue-bo.regles.ts";
import { barreFinale, estLaPageIntrouvable, planDuSite, reponseAuVisiteur } from "./worker-adresses.ts";
import { redirectionDeLangue } from "./worker-langue.ts";

export { PluginBridge };

type Fetch = (request: Request, env: unknown, ctx: unknown) => Response | Promise<Response>;

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

// L'entree du back office, la meme adresse que sur tous les sites de la
// maison : /secret-spot/ (et /fr/secret-spot/) ouvre l'administration
// d'EmDash, le seul back office du site. /_emdash/secret-spot/ est l'alias
// demande par l'editeur pour l'adresse native d'EmDash, /_emdash/admin, que le
// paquet ne permet pas de renommer.
const ENTREE_DU_BACK_OFFICE = /^\/(?:(?:fr\/)?secret-spot|_emdash\/secret-spot)(?:\/.*)?$/;

// Les plans que le moteur sert lui-meme (src/moteur/plan-du-site*.ts) ; ceux
// d'EmDash, en doublon, ne sont jamais atteints (voir worker-adresses.ts).
const PLANS = ["/sitemap-index.xml", "/sitemap-contenu.xml"];

// LA LANGUE DU BACK OFFICE. EmDash 0.38 choisit la langue de son
// administration a chaque requete : le cookie emdash-locale, puis
// Accept-Language, puis l'anglais. On remplace le dernier recours par la
// langue par defaut du site (__ALOHA_BO_LANGUE__, voir moteur.config.mjs),
// seulement quand la personne n'a rien choisi. La regle vit dans le socle
// (langueDuBackOffice, src/moteur/langue-bo.regles.ts), la meme pour tous les
// sites : elle est posee ici, dans le Worker, avant Astro. Elle remplace le
// middleware de transition langue-bo.ts, qui reecrivait la requete dans Astro.

/** Une requete de page (GET ou HEAD) dont la reponse est du HTML. */
const estUnePage = (request: Request, reponse: Response): boolean =>
  (request.method === "GET" || request.method === "HEAD") && (reponse.headers.get("Content-Type") ?? "text/html").startsWith("text/html");

/** La page introuvable de la langue de l'adresse, rendue a la demande avec les cookies du visiteur, toujours en 404. */
async function pageIntrouvableRendue(request: Request, env: Env, ctx: unknown): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = `${/^\/fr\//.test(`${url.pathname}/`) ? "/fr" : ""}/404-introuvable/`;
  url.search = "";
  const demande = new Request(url, { method: request.method, headers: request.headers });
  const rendue = await (handler.fetch as Fetch)(demande, env, ctx);
  return reponseAuVisiteur(demande, rendue, null);
}

export default {
  ...handler,
  // Dans l'ordre : le back office, les plans du site, la page introuvable
  // demandee par son adresse, la barre finale, puis la meme redirection de
  // langue que le Worker du site fige, sauf sur les adresses internes (/_emdash,
  // /_image, /_astro) : envoyer le back office sous /fr/ le rendrait
  // introuvable. La reponse passe enfin par reponseAuVisiteur : page
  // introuvable dans la langue de l'adresse, sans Server-Timing.
  async fetch(request: Request, env: Env, ctx: unknown) {
    const chemin = new URL(request.url).pathname;
    if (ENTREE_DU_BACK_OFFICE.test(chemin)) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/_emdash/admin", "Cache-Control": "no-store" },
      });
    }
    const plan = planDuSite(request, PLANS);
    if (plan) return plan;
    // /404, /fr/404/ : la page introuvable de la langue, rendue a la demande
    // (moteur allume, elle porte ses textes de la base), toujours en 404.
    if (estLaPageIntrouvable(request)) return pageIntrouvableRendue(request, env, ctx);
    const interne = chemin.startsWith("/_");
    const reglee = barreFinale(request) ?? (interne ? null : redirectionDeLangue(request));
    if (reglee) return reglee;
    const reponse = await (handler.fetch as Fetch)(langueDuBackOffice(request, __ALOHA_BO_LANGUE__), env, ctx);
    // Toute page qui repond 404 est remplacee par la page introuvable rendue
    // comme une page ordinaire (src/pages/[...locale]/404-introuvable.astro) :
    // la barre d'edition et les annotations de l'entree "introuvable" y sont.
    if (reponse.status === 404 && !interne && estUnePage(request, reponse)) return pageIntrouvableRendue(request, env, ctx);
    return reponseAuVisiteur(request, reponse, null);
  },
  scheduled: createScheduledHandler(),
};
