// preview-worker.ts - apercu separe de la production, exclu de l'indexation.
import reef from "../src/worker.ts";
import type { BackofficeEnv } from "../src/backoffice/worker-backoffice.ts";
export default {
  async fetch(request: Request, env: BackofficeEnv): Promise<Response> {
    const response = await reef.fetch(request, env);
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  },
};
