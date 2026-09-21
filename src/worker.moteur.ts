// src/worker.moteur.ts - point d'entree du Worker quand le moteur est allume : langue du visiteur, Astro a la demande, et le cron des publications programmees.
//
// Pas de `satisfies ExportedHandler` ici : ce type vient de
// worker-configuration.d.ts, que `wrangler types` genere sur la machine de qui
// deploie. Le theme ne l'embarque pas, et `pnpm check` doit rester a zero
// moteur eteint. Wrangler verifie la forme de l'export au deploiement.
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";
import { redirectionDeLangue } from "./worker-langue.ts";

export { PluginBridge };

type Fetch = (request: Request, env: unknown, ctx: unknown) => Response | Promise<Response>;

export default {
  ...handler,
  // La meme redirection de langue que le Worker du site fige, sauf sur les
  // adresses internes (/_emdash, /_image, /_astro) : envoyer le back office
  // sous /fr/ le rendrait introuvable.
  fetch(request: Request, env: unknown, ctx: unknown) {
    const interne = new URL(request.url).pathname.startsWith("/_");
    const langue = interne ? null : redirectionDeLangue(request);
    return langue ?? (handler.fetch as Fetch)(request, env, ctx);
  },
  scheduled: createScheduledHandler(),
};
