// src/worker.ts - langue du visiteur, fichiers statiques et garde du back office optionnel.
// Le back office exige cette garde serveur avant tout service des fichiers HTML.
import { backoffice, type BackofficeEnv } from "./backoffice/worker-backoffice.ts";

const LOCALES = ["en", "fr"];
const ROOT_LOCALE = "en";
// Repli quand ni le cookie ni Accept-Language ne designent une langue servie :
// l'anglais, qui tient la racine et porte le x-default.
//
// Ce repli ne concerne en pratique que les robots : un navigateur envoie
// toujours Accept-Language. Le poser sur le francais revient donc a repondre
// 302 a Googlebot sur chaque adresse racine, et la moitie anglaise du site
// sort de l'index alors que les balises hreflang la declarent canonique.
const FALLBACK_LOCALE = "en";
const LOCALE_COOKIE = "aloha_locale";

// Lit un cookie precis sans parser tout l'entete : on cherche une seule cle.
function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Classe les langues demandees par le navigateur et retient la premiere connue.
function preferredLocale(header: string | null): string | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: (tag ?? "").trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0 && entry.q <= 1)
    .sort((a, b) => b.q - a.q);
  for (const entry of ranked) {
    const base = entry.tag.split("-")[0];
    if (LOCALES.includes(base)) return base;
  }
  return null;
}

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

    const isPage =
      (request.method === "GET" || request.method === "HEAD") &&
      // Un fichier n'est pas une page : le laisser passer evite de rediriger
      // une feuille de style et de casser le rendu.
      !/\.[a-z0-9]+$/i.test(path) &&
      // Deja prefixee : le visiteur est la ou il voulait etre.
      !LOCALES.some((l) => l !== ROOT_LOCALE && (path === `/${l}` || path.startsWith(`/${l}/`)));

    if (isPage) {
      const cookie = readCookie(request.headers.get("Cookie"), LOCALE_COOKIE);
      const chosen = cookie && LOCALES.includes(cookie) ? cookie : null;
      const target = chosen ?? preferredLocale(request.headers.get("Accept-Language")) ?? FALLBACK_LOCALE;
      if (target !== ROOT_LOCALE) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/${target}${path === "/" ? "/" : path}${url.search}`,
            // Sans Vary, le cache servirait a tout le monde la langue du premier
            // arrive. C'est l'erreur qui rend ce type de redirection
            // insupportable sur la moitie des sites qui l'implementent.
            Vary: "Accept-Language, Cookie",
            "Cache-Control": "no-store",
          },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
