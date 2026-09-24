// src/worker.ts - Worker de la demo figee (wrangler.toml) : adresses reglees d'avance, langue du visiteur, puis les fichiers statiques.
import { estLaPageIntrouvable, pageIntrouvable, planDuSite } from "./worker-adresses.ts";
import { redirectionDeLangue } from "./worker-langue.ts";

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

// Les plans du site que le build statique ecrit (@astrojs/sitemap).
const PLANS = ["/sitemap-index.xml", "/sitemap-0.xml"];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const plan = planDuSite(request, PLANS);
    if (plan) return plan;
    if (estLaPageIntrouvable(request)) return pageIntrouvable(request, env.ASSETS);

    const langue = redirectionDeLangue(request);
    if (langue) return langue;

    return env.ASSETS.fetch(request);
  },
};
