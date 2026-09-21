// src/worker.moteur.ts - point d'entree du Worker quand le moteur est allume : Astro a la demande, plus le cron des publications programmees.
//
// Pas de `satisfies ExportedHandler` ici : ce type vient de
// worker-configuration.d.ts, que `wrangler types` genere sur la machine de qui
// deploie. Le theme ne l'embarque pas, et `pnpm check` doit rester a zero
// moteur eteint. Wrangler verifie la forme de l'export au deploiement.
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

export default {
  ...handler,
  scheduled: createScheduledHandler(),
};
