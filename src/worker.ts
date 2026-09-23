// src/worker.ts - langue du visiteur, fichiers statiques et garde du back office optionnel.
// Le back office exige cette garde serveur avant tout service des fichiers HTML.
import { backoffice, type BackofficeEnv } from "./backoffice/worker-backoffice.ts";
import { redirectionDeLangue } from "./worker-langue.ts";

interface Env extends BackofficeEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ALOHA_DEMO_BACKOFFICE?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    let decodedPath: string;
    try { decodedPath = decodeURIComponent(path); } catch { return new Response(null, { status: 400 }); }
    if (env.ALOHA_DEMO_BACKOFFICE === "1" && decodedPath.startsWith("/api/")) return Response.json({ error: "demo_read_only" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (env.ALOHA_DEMO_BACKOFFICE === "1" && /^\/(?:fr\/)?secret-spot(?:\/|$)/.test(decodedPath)) {
      if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405 });
      if (!/^\/(?:fr\/)?secret-spot\/(?:rubriques\/)?$/.test(decodedPath) && decodedPath !== "/secret-spot/demo.json") return new Response(null, { status: 404 });
      const result = await env.ASSETS.fetch(request);
      const headers = new Headers(result.headers); headers.set("X-Robots-Tag", "noindex, nofollow");
      return new Response(result.body, { status: result.status, headers });
    }
    const admin = await backoffice(request, env);
    if (admin) return admin;

    const langue = redirectionDeLangue(request);
    if (langue) return langue;

    return env.ASSETS.fetch(request);
  },
};
