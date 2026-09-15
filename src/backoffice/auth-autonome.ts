// auth-autonome.ts - connexion Aloha reutilisee dans l'installation propre de l'acheteur.
import { issueCode, verifyCode, signSession, readSession, readCookie, newSession, sessionCookie, SESSION_COOKIE, SESSION_MAX_AGE, normalizeEmail, isValidEmail, isAdmin } from "./auth-primitives.ts";
import type { Service } from "./connexion-service.ts";
type Statement = { bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; run(): Promise<unknown> };
export type AuthAutonomeEnv = {
  ALOHA_AUTH_DB?: { prepare(sql: string): Statement };
  ALOHA_AUTH_SECRET?: string;
  ALOHA_ADMIN_EMAILS?: string;
  ALOHA_TURNSTILE_SITE_KEY?: string;
  ALOHA_TURNSTILE_SECRET_KEY?: string;
  ALOHA_MAIL_KEY?: string;
  ALOHA_MAIL_FROM?: string;
};
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", ...headers } });

/** L'acheteur utilise ses propres services, sans dependance au compte prive Aloha Pixel. */
export function authAutonome(env: AuthAutonomeEnv, origin: string, transport: typeof fetch = fetch): Service | null {
  if (!env.ALOHA_AUTH_DB || !env.ALOHA_AUTH_SECRET || env.ALOHA_AUTH_SECRET.length < 32 || !env.ALOHA_ADMIN_EMAILS || !env.ALOHA_TURNSTILE_SITE_KEY || !env.ALOHA_TURNSTILE_SECRET_KEY || !env.ALOHA_MAIL_KEY || !env.ALOHA_MAIL_FROM) return null;
  const db = env.ALOHA_AUTH_DB, secret = env.ALOHA_AUTH_SECRET;
  const limit = async (key: string, maximum: number) => {
    const window = Math.floor(Date.now() / 900_000);
    const row = await db.prepare("INSERT INTO aloha_auth_limits (key, window, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN window = excluded.window THEN attempts + 1 ELSE 1 END, window = excluded.window RETURNING attempts").bind(key, window).first<{ attempts: number }>();
    return !!row && row.attempts <= maximum;
  };
  return { async fetch(req) {
    const path = new URL(req.url).pathname;
    if (req.method === "POST" && req.headers.get("Origin") !== origin) return json({ error: "invalid_origin" }, 403);
    if (path === "/api/config" && req.method === "GET") return json({ turnstileSiteKey: env.ALOHA_TURNSTILE_SITE_KEY });
    if (path === "/api/auth/me" && req.method === "GET") {
      const session = await readSession(secret, readCookie(req, SESSION_COOKIE));
      return json(session?.role === "admin" && isAdmin(env.ALOHA_ADMIN_EMAILS, session.email) ? { authenticated: true, ...session } : { authenticated: false });
    }
    if (path === "/api/auth/logout" && req.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
    if (req.method !== "POST" || !["/api/auth/request", "/api/auth/verify"].includes(path)) return json({ error: "not_found" }, 404);
    try {
      // Le relais de connexion limite deja ce corps a 16 ko.
      const body = await req.json() as Record<string, unknown>;
      if (!body || typeof body.email !== "string" || !isValidEmail(body.email)) return json({ error: "invalid_email" }, 400);
      const email = normalizeEmail(body.email);
      if (!isAdmin(env.ALOHA_ADMIN_EMAILS, email)) return path.endsWith("request") ? json({ ok: true }) : json({ error: "invalid_code" }, 401);
      if (path.endsWith("request")) {
        if (!await limit(`request:${email}`, 5)) return json({ error: "rate_limit" }, 429);
        if (typeof body.turnstile !== "string") return json({ error: "challenge_required" }, 400);
        const result = await transport("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: env.ALOHA_TURNSTILE_SECRET_KEY, response: body.turnstile, remoteip: req.headers.get("CF-Connecting-IP") ?? undefined }) });
        const challenge = await result.json() as { success?: boolean; hostname?: string };
        if (!result.ok || !challenge.success || challenge.hostname !== new URL(origin).hostname) return json({ error: "challenge_failed" }, 400);
        const code = await issueCode(secret, email, Date.now());
        const fr = body.locale === "fr";
        const sent = await transport("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.ALOHA_MAIL_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.ALOHA_MAIL_FROM, to: [email], subject: fr ? "Votre code de connexion" : "Your sign-in code", text: fr ? `Votre code : ${code}` : `Your code: ${code}` }) });
        return sent.ok ? json({ ok: true }) : json({ error: "mail_unavailable" }, 503);
      }
      if (!await limit(`verify:${email}`, 8)) return json({ error: "rate_limit" }, 429);
      if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code) || !await verifyCode(secret, email, body.code, Date.now())) return json({ error: "invalid_code" }, 401);
      // Une empreinte consommee ne peut pas servir a ouvrir une seconde session.
      const bytes = new TextEncoder().encode(`${email}:${body.code}`);
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
      const used = await db.prepare("INSERT INTO aloha_auth_used (fingerprint, expires) VALUES (?, ?) ON CONFLICT(fingerprint) DO UPDATE SET expires = excluded.expires WHERE expires < ? RETURNING fingerprint").bind(fingerprint, Date.now() + 1_200_000, Date.now()).first<{ fingerprint: string }>();
      if (!used) return json({ error: "invalid_code" }, 401);
      await db.prepare("DELETE FROM aloha_auth_used WHERE expires < ?").bind(Date.now()).run();
      const token = await signSession(secret, newSession(email, "admin"));
      return json({ ok: true, role: "admin" }, 200, { "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE) });
    } catch { return json({ error: "auth_unavailable" }, 503); }
  } };
}
