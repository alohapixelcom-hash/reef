// src/worker.moteur.ts - point d'entree du Worker quand le moteur est allume : Astro a la demande, plus le cron des publications programmees.
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

export default {
  ...handler,
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
