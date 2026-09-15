// garde-pages.ts - garde serveur des pages privees, extraite du relais alohapixel.com.
import type { Identite } from "./contrat.ts";

type Options = {
  bases: readonly string[];
  autoriser: (request: Request) => Promise<Identite | null>;
  servir: (request: Request) => Promise<Response>;
};
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", Vary: "Cookie" };

/** Retourne null pour une page publique. L'appelant doit executer cette garde avant ASSETS. */
export function creerGardePages(options: Options) {
  return async (request: Request): Promise<Response | null> => {
    const url = new URL(request.url);
    let path: string;
    try { path = decodeURIComponent(url.pathname); }
    catch { return new Response("Invalid path", { status: 400, headers }); }
    const base = options.bases.find((value) => path === value || path.startsWith(`${value}/`) || path === `${value}.html`);
    if (!base) return null;
    if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
    const door = `${base}/connexion/`;
    const isDoor = [door, door.slice(0, -1), `${door}index.html`, `${base}/connexion.html`].includes(path);
    let identity: Identite | null;
    try { identity = await options.autoriser(request); }
    catch { return new Response("Service unavailable", { status: 503, headers }); }
    if (!isDoor && identity?.role !== "admin") {
      return new Response(null, { status: 302, headers: { ...headers, Location: `${door}?suite=${encodeURIComponent(url.pathname)}` } });
    }
    if (isDoor && identity?.role === "admin") return new Response(null, { status: 302, headers: { ...headers, Location: `${base}/` } });
    const response = await options.servir(request);
    const result = new Headers(response.headers);
    for (const [key, value] of Object.entries(headers)) result.set(key, value);
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers: result });
  };
}
