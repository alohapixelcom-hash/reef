// editorial.ts - route editoriale commune, derivee des gardes et conflits du back office interne.
import { categories } from "./categories.ts";
import { identifiantValide, verifierConfiguration, type Langue, type SiteEditorial, type ServicesEditoriaux } from "./contrat.ts";
import { stringifyPost, type Frontmatter } from "./frontmatter.ts";
import { validerReef } from "./validation-reef.ts";
import { ErreurGithub, lireArticles, lireReferences, enregistrerArticle, supprimerArticle, lireRevision } from "./github-editorial.ts";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

/** Une requete sans Content-Length reste bornee avant toute lecture GitHub. */
async function lireCorps(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > 600_000) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

/** Chaque instance recoit une configuration serveur ; aucun parametre navigateur ne remplace le depot. */
export function creerEditeur(site: SiteEditorial, services: ServicesEditoriaux, resource: "articles" | "categories" = "articles") {
  verifierConfiguration(site);
  return async (req: Request, langue: Langue, slug?: string): Promise<Response> => {
    const identity = await services.autoriser(req, site);
    if (identity instanceof Response) return identity;
    if (identity.role !== "admin") return json({ error: "admin_required" }, 403);
    if (!site.langues.includes(langue) || (slug !== undefined && !identifiantValide(slug))) return json({ error: "invalid_path" }, 400);
    if (!["GET", "POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);
    if (req.method === "POST") {
      if (req.headers.get("Origin") !== new URL(req.url).origin) return json({ error: "invalid_origin" }, 403);
      if (!req.headers.get("Content-Type")?.startsWith("application/json")) return json({ error: "json_required" }, 415);
      if (Number(req.headers.get("Content-Length") ?? 0) > 600_000) return json({ error: "too_large" }, 413);
    }
    try {
      let input: { action?: string; frontmatter?: Frontmatter; body?: string; sha?: string; unset?: string[] } = {};
      if (req.method === "POST") {
        if (!slug) return json({ error: "slug_required" }, 400);
        const raw = await lireCorps(req);
        if (raw === null) return json({ error: "too_large" }, 413);
        try { input = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
        if (!input || typeof input !== "object" || Array.isArray(input) || (input.action !== undefined && input.action !== "delete") || (input.action !== "delete" && (!input.frontmatter || Array.isArray(input.frontmatter) || typeof input.frontmatter !== "object"))) {
          return json({ error: "invalid_document" }, 400);
        }
      }
      if (resource === "categories") return await categories(site, services, langue, slug, input, req.method);
      const revision = req.method === "POST" ? await lireRevision(site, services) : undefined;
      const snapshot = revision ? { ...site, branche: revision } : site;
      const articles = await lireArticles(snapshot, services, langue);
      const current = slug ? articles.find((article) => article.slug === slug) : undefined;
      if (req.method === "GET") {
        if (slug) return current ? json(current) : json({ error: "not_found" }, 404);
        const refs = await lireReferences(snapshot, services, langue);
        return json({ site: site.id, langue, references: refs, items: articles.map(({ body: _body, ...article }) => article) });
      }
      if (!slug) return json({ error: "slug_required" }, 400);
      if ((current && input.sha !== current.sha) || (!current && input.sha)) return json({ error: "conflict", currentSha: current?.sha ?? null }, 409);
      if (input.action === "delete") {
        if (!current) return json({ error: "not_found" }, 404);
        const commit = await supprimerArticle(site, services, langue, slug, current.extension, revision!);
        return json({ ok: true, commit, publication: "building", deleted: true });
      }
      const fm = { ...current?.frontmatter, ...input.frontmatter };
      if (input.unset !== undefined) {
        if (!Array.isArray(input.unset) || input.unset.some((key) => !["cover", "coverAlt", "updatedDate"].includes(key))) return json({ error: "invalid_unset" }, 422);
        for (const key of input.unset) delete fm[key];
      }
      const body = input.body;
      if (typeof body !== "string") return json({ error: "invalid_body" }, 422);
      const refs = await lireReferences(snapshot, services, langue);
      const errors = validerReef(fm, body, langue, refs);
      if (fm.featured === true && articles.some((article) => article.slug !== slug && article.frontmatter.featured === true)) errors.push("featured_exists");
      if (errors.length) return json({ error: "validation", fields: errors }, 422);
      const saved = await enregistrerArticle(site, services, langue, slug, current?.extension ?? "md", stringifyPost(fm, body), revision!);
      // GitHub a enregistre ; seule la verification du site construit prouve la publication.
      return json({ ok: true, ...saved, publication: "building", draft: fm.draft === true });
    } catch (error) {
      console.warn("ALOHA_EDITORIAL_FAILURE", error instanceof ErreurGithub ? { status: error.status, code: error.code } : { status: 502, code: "internal" });
      if (error instanceof ErreurGithub) return json({ error: error.status === 409 ? "conflict" : "github_unavailable" }, error.status === 409 ? 409 : 502);
      return json({ error: "editorial_unavailable" }, 502);
    }
  };
}
