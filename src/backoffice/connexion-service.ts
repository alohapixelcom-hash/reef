// connexion-service.ts - raccord limite au service de connexion interne Aloha.
import type { Identite } from "./contrat.ts";

export type Service = { fetch(request: Request): Promise<Response> };
type Options = { service: Service; origine: string; administrateurs: readonly string[] };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

/** Le service valide la session, puis la liste propre au site limite ses administrateurs. */
export function connexionAloha(options: Options) {
  const origin = new URL(options.origine);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/") throw new Error("Origine de connexion invalide");
  const allowed = new Set(options.administrateurs.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const relay = async (req: Request, path: string, body?: string): Promise<Response> => {
    const headers = new Headers();
    for (const name of ["Cookie", "Origin", "CF-Connecting-IP", "CF-IPCountry"]) {
      const value = req.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const response = await options.service.fetch(new Request(new URL(path, origin), { method: req.method, headers, body }));
    const result = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    const cookie = response.headers.get("Set-Cookie");
    if (cookie) result.set("Set-Cookie", cookie);
    return new Response(response.body, { status: response.status, headers: result });
  };
  const identity = async (req: Request): Promise<Identite | null> => {
    const response = await relay(new Request(req.url, { headers: req.headers }), "/api/auth/me");
    if (!response.ok) throw new Error("Connexion indisponible");
    const value = await response.json() as { authenticated?: boolean; role?: string; email?: string };
    if (!value.authenticated || value.role !== "admin" || typeof value.email !== "string" || !allowed.has(value.email.toLowerCase())) return null;
    return { email: value.email, role: "admin" };
  };
  const route = async (req: Request): Promise<Response | null> => {
    const path = new URL(req.url).pathname;
    const method = ({ "/api/auth/me": "GET", "/api/config": "GET", "/api/auth/request": "POST", "/api/auth/verify": "POST", "/api/auth/logout": "POST" } as Record<string, string>)[path];
    if (!method) return null;
    if (req.method !== method) return json({ error: "method_not_allowed" }, 405);
    if (method === "POST" && req.headers.get("Origin") !== new URL(req.url).origin) return json({ error: "invalid_origin" }, 403);
    try {
      if (path === "/api/auth/me") {
        const user = await identity(req);
        return json(user ? { authenticated: true, ...user } : { authenticated: false });
      }
      if (path === "/api/config" || path === "/api/auth/logout") return await relay(req, path);
      if (Number(req.headers.get("Content-Length") ?? 0) > 16_000) return json({ error: "too_large" }, 413);
      const reader = req.body?.getReader();
      const decoder = new TextDecoder();
      let body = "";
      let size = 0;
      if (reader) {
        try {
          while (true) {
            const item = await reader.read();
            if (item.done) { body += decoder.decode(); break; }
            size += item.value.byteLength;
            if (size > 16_000) { await reader.cancel(); return json({ error: "too_large" }, 413); }
            body += decoder.decode(item.value, { stream: true });
          }
        } finally { reader.releaseLock(); }
      }
      let data: Record<string, unknown>;
      try { data = JSON.parse(body); } catch { return json({ error: "invalid_json" }, 400); }
      if (!data || typeof data.email !== "string") return json({ error: "invalid_email" }, 400);
      if (!allowed.has(data.email.trim().toLowerCase())) return path.endsWith("request") ? json({ ok: true }) : json({ error: "invalid_code" }, 401);
      return await relay(req, path, body);
    } catch { return json({ error: "auth_unavailable" }, 503); }
  };
  return { identity, route };
}
