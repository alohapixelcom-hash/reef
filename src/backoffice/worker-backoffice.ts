// worker-backoffice.ts - assemble la connexion Aloha, la garde HTML et les articles du site.
import { connexionAloha, type Service } from "./connexion-service.ts";
import { creerEditeur } from "./editorial.ts";
import { creerGardePages } from "./garde-pages.ts";
import { verifierConfiguration, type Langue, type SiteEditorial } from "./contrat.ts";
import { authAutonome, type AuthAutonomeEnv } from "./auth-autonome.ts";

export type BackofficeEnv = AuthAutonomeEnv & {
  ASSETS: Service;
  ALOHA_AUTH?: Service;
  ALOHA_CONTENT?: Service;
  ALOHA_AUTH_ORIGIN?: string;
  ALOHA_ADMIN_EMAILS?: string;
  ALOHA_EDITORIAL_CONFIG?: string;
  GITHUB_CONTENT_TOKEN?: string;
};
const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });

/** Les valeurs ne viennent que de l'environnement serveur, jamais du formulaire. */
export async function backoffice(request: Request, env: BackofficeEnv, transport: typeof fetch = fetch): Promise<Response | null> {
  const url = new URL(request.url);
  let path: string;
  try { path = decodeURIComponent(url.pathname); } catch { return fail(400, "invalid_path"); }
  const privatePage = /^\/(?:fr\/)?secret-spot(?:\/|\.html$|$)/.test(path);
  const privateApi = path.startsWith("/api/");
  if (!privatePage && !privateApi) return null;
  const authService = env.ALOHA_AUTH ?? authAutonome(env, url.origin, transport);
  const authOrigin = env.ALOHA_AUTH ? env.ALOHA_AUTH_ORIGIN : url.origin;
  if (!authService || !authOrigin || !env.ALOHA_ADMIN_EMAILS || !env.ALOHA_EDITORIAL_CONFIG || (!env.GITHUB_CONTENT_TOKEN && !env.ALOHA_CONTENT)) {
    return fail(503, "backoffice_not_configured");
  }
  try {
    const site = JSON.parse(env.ALOHA_EDITORIAL_CONFIG) as SiteEditorial;
    verifierConfiguration(site);
    const auth = connexionAloha({ service: authService, origine: authOrigin, administrateurs: env.ALOHA_ADMIN_EMAILS.split(",") });
    const guard = creerGardePages({ bases: ["/secret-spot", "/fr/secret-spot"], autoriser: auth.identity, servir: (req) => env.ASSETS.fetch(req) });
    if (privatePage) return await guard(request);
    const login = await auth.route(request);
    if (login) return login;
    const publication = /^\/api\/editorial-status\/(fr|en)\/([a-z0-9-]+)$/.exec(path);
    if (publication) {
      if (request.method !== "GET") return fail(405, "method_not_allowed");
      if (!await auth.identity(request)) return fail(401, "admin_required");
      const manifest = await env.ASSETS.fetch(new Request(new URL("/secret-spot/build.json", request.url)));
      if (!manifest.ok) return fail(503, "build_unknown");
      const data = await manifest.json() as { articles?: Record<string, string>; builtAt?: string };
      const sha = data.articles?.[`${publication[1]}/${publication[2]}`] ?? null;
      return Response.json({ sha, builtAt: data.builtAt ?? null }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const categoryRoute = path.startsWith("/api/editorial-categories/");
    const route = /^\/api\/editorial(?:-categories)?\/(fr|en)(?:\/([a-z0-9-]+))?$/.exec(path);
    if (!route) return fail(404, "not_found");
    if (!["GET", "POST"].includes(request.method)) return fail(405, "method_not_allowed");
    if (request.method === "POST" && request.headers.get("Origin") !== url.origin) return fail(403, "invalid_origin");
    if (env.ALOHA_CONTENT) {
      if (!await auth.identity(request)) return fail(401, "admin_required");
      const target = new URL(`/api/admin/${categoryRoute ? "theme-categories" : "theme-editorial"}/${site.id}/${route[1]}${route[2] ? `/${route[2]}` : ""}`, authOrigin);
      const forwarded = new Request(target, request);
      forwarded.headers.set("Origin", url.origin);
      return await env.ALOHA_CONTENT.fetch(forwarded);
    }
    const editor = creerEditeur(site, {
      autoriser: async (req) => await auth.identity(req) ?? fail(401, "admin_required"),
      github: async (endpoint, init) => {
        // Seul le moteur editorial produit endpoint. Aucun cookie n'est transmis a GitHub.
        if (endpoint !== "/graphql" && !endpoint.startsWith(`/repos/${site.depot}/contents/`) && !endpoint.startsWith(`/repos/${site.depot}/git/`)) throw new Error("Route GitHub invalide");
        return transport(new URL(endpoint, "https://api.github.com"), { ...init, redirect: "manual", headers: {
          Authorization: `Bearer ${env.GITHUB_CONTENT_TOKEN}`, Accept: "application/vnd.github+json",
          "Content-Type": "application/json", "User-Agent": "Aloha-Backoffice",
        } });
      },
    }, categoryRoute ? "categories" : "articles");
    return await editor(request, route[1] as Langue, route[2]);
  } catch { return fail(503, "backoffice_unavailable"); }
}
