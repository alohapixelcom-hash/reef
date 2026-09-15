// editorial.selfcheck.ts - controles HTTP de droits, conflits et sauvegarde Unicode.
import assert from "node:assert/strict";
import { creerEditeur } from "./editorial.ts";
import { parseFrontmatter, stringifyPost } from "./frontmatter.ts";
import type { SiteEditorial, ServicesEditoriaux } from "./contrat.ts";

const site: SiteEditorial = { id: "reef", depot: "owner/reef", branche: "main", dossierArticles: "src/data/posts", dossierAuteurs: "src/data/authors", dossierSujets: "src/data/topics", dossierImages: "src/assets/covers", format: "reef", langues: ["fr", "en"] };
const fm = { title: "Été à Pau", description: "Description", pubDate: "2026-09-15", author: "fr/lea", topic: "fr/design", draft: true, custom: "conserver" };
let calls = 0;
let writes: Record<string, unknown>[] = [];
let role = "admin";
const services: ServicesEditoriaux = {
  autoriser: async () => role === "anonymous" ? new Response(null, { status: 401 }) : { email: "admin@example.test", role: role as "admin" | "customer" },
  github: async (path, init) => {
    calls++;
    const input = JSON.parse(String(init?.body));
    if (init?.method === "PUT") {
      assert.equal(path, "/repos/owner/reef/contents/src/data/posts/fr/article.md");
      writes.push(input);
      return Response.json({ content: { sha: "new-blob" }, commit: { sha: "new-commit" } });
    }
    const expr: string = input.variables.expr;
    const entries = expr.includes("/posts/") ? [{ name: "article.md", type: "blob", oid: "old-blob", object: { text: stringifyPost(fm, "Ancien corps") } }]
      : expr.includes("/authors/") ? [{ name: "lea.json", type: "blob" }]
      : expr.includes("/topics/") ? [{ name: "design.json", type: "blob" }] : [];
    return Response.json({ data: { repository: { object: { entries } } } });
  },
};
const editor = creerEditeur(site, services);
const request = (body: unknown, origin = "https://reef.example.test") => new Request("https://reef.example.test/api/articles/fr/article", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const valid = { sha: "old-blob", frontmatter: { title: "Été modifié 🌊" }, body: "Texte français 🌊" };
role = "anonymous";
assert.equal((await editor(request(valid), "fr", "article")).status, 401);
role = "customer";
assert.equal((await editor(request(valid), "fr", "article")).status, 403);
role = "admin";
assert.equal((await editor(request(valid, "https://other.example.test"), "fr", "article")).status, 403);
assert.equal((await editor(request(valid), "fr", "../secret")).status, 400);
assert.equal(calls, 0, "Les refus ne consultent pas GitHub");
assert.equal((await editor(request(null), "fr", "article")).status, 400);
assert.equal((await editor(request({ ...valid, body: "é".repeat(310_000) }), "fr", "article")).status, 413);
assert.equal(calls, 0, "Le corps invalide ou trop grand ne consulte pas GitHub");
assert.equal((await editor(request({ ...valid, sha: "stale" }), "fr", "article")).status, 409);
assert.equal((await editor(request({ ...valid, frontmatter: { author: "fr/absent" } }), "fr", "article")).status, 422);
assert.equal(writes.length, 0, "Aucune ecriture apres conflit ou document invalide");
assert.equal((await editor(request({ ...valid, unset: ["author"] }), "fr", "article")).status, 422);
assert.equal(writes.length, 0, "Impossible de supprimer un champ obligatoire");
const saved = await editor(request(valid), "fr", "article");
assert.equal(saved.status, 200);
assert.equal((await saved.json()).publication, "building");
assert.equal(writes.length, 1);
assert.equal(writes[0].sha, "old-blob");
const parsed = parseFrontmatter(Buffer.from(String(writes[0].content), "base64").toString("utf8"));
assert.equal(parsed.frontmatter.custom, "conserver");
assert.equal(parsed.frontmatter.title, "Été modifié 🌊");
assert.equal(parsed.frontmatter.draft, true);
assert.equal(parsed.body.trim(), valid.body);
console.log("Controles HTTP passes : droits, origine, chemins, conflits, references, Unicode et champs conserves.");
