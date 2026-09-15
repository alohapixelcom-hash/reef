// categories.selfcheck.ts - rubriques : droits, validation, references et conflit de branche atomique.
import assert from "node:assert/strict";
import { creerEditeur } from "./editorial.ts";
import type { ServicesEditoriaux, SiteEditorial } from "./contrat.ts";
const head = "a".repeat(40);
const site: SiteEditorial = { id: "reef", depot: "owner/reef", branche: "test/branch", dossierArticles: "src/data/posts", dossierAuteurs: "src/data/authors", dossierSujets: "src/data/topics", dossierImages: "src/assets/covers", format: "reef", langues: ["fr", "en"] };
let role: "admin" | "customer" | "anonymous" = "admin", used = false, concurrent = false;
const calls: { path: string; method?: string; body?: unknown }[] = [];
const services: ServicesEditoriaux = {
  autoriser: async () => role === "anonymous" ? new Response(null, { status: 401 }) : { role, email: "admin@example.test" },
  github: async (path, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method: init?.method, body });
    if (path === "/graphql") {
      const expr = String(body.variables.expr);
      assert.ok(expr.startsWith(`${head}:`) || expr.startsWith("test/branch:"));
      const entries = expr.includes("/topics/") ? [{ name: "design.json", type: "blob", oid: "original", object: { text: JSON.stringify({ name: "Design", description: "Texte", accent: "reef", order: 0, custom: "keep" }) } }]
        : used ? [{ name: "article.md", type: "blob", oid: "article", object: { text: "---\ntopic: fr/design\n---\nTexte" } }] : [];
      return Response.json({ data: { repository: { object: { entries } } } });
    }
    if (path.endsWith("/git/ref/heads/test/branch")) return Response.json({ object: { sha: head } });
    if (path.endsWith(`/git/commits/${head}`)) return Response.json({ tree: { sha: "base-tree" } });
    if (path.endsWith("/git/trees")) return Response.json({ sha: "new-tree" });
    if (path.endsWith("/git/commits")) { assert.deepEqual(body.parents, [head]); return Response.json({ sha: "new-commit" }); }
    if (path.endsWith("/git/refs/heads/test/branch")) { assert.equal(body.force, false); return Response.json({}, { status: concurrent ? 422 : 200 }); }
    throw new Error(`Route inattendue ${path}`);
  },
};
const editor = creerEditeur(site, services, "categories");
const request = (body: unknown, origin = "https://reef.test") => new Request("https://reef.test/api/editorial-categories/fr/design", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const valid = { sha: "original", frontmatter: { name: "Création", description: "Rubrique française", accent: "coral", order: 2 } };
role = "anonymous"; assert.equal((await editor(request(valid), "fr", "design")).status, 401);
role = "customer"; assert.equal((await editor(request(valid), "fr", "design")).status, 403);
role = "admin"; assert.equal((await editor(request(valid, "https://other.test"), "fr", "design")).status, 403);
assert.equal(calls.length, 0);
assert.equal((await editor(request(valid), "fr", "../design")).status, 400);
assert.equal((await editor(request({ ...valid, sha: "stale" }), "fr", "design")).status, 409);
assert.equal((await editor(request({ ...valid, frontmatter: { ...valid.frontmatter, order: 2.4 } }), "fr", "design")).status, 422);
assert.equal(calls.filter(call => call.path.endsWith("/git/trees")).length, 0);
assert.equal((await editor(request(valid), "fr", "design")).status, 200);
const tree = calls.find(call => call.path.endsWith("/git/trees"))?.body as { tree: { content: string }[] };
assert.equal(JSON.parse(tree.tree[0].content).custom, "keep");
used = true;
const count = calls.filter(call => call.path.endsWith("/git/trees")).length;
assert.equal((await editor(request({ action: "delete", sha: "original" }), "fr", "design")).status, 422);
assert.equal(calls.filter(call => call.path.endsWith("/git/trees")).length, count);
used = false; concurrent = true;
assert.equal((await editor(request({ action: "delete", sha: "original" }), "fr", "design")).status, 409);
concurrent = false;
assert.equal((await editor(request({ action: "delete", sha: "original" }), "fr", "design")).status, 200);
const deleted = calls.filter(call => call.path.endsWith("/git/trees")).at(-1)?.body as { tree: { sha: null }[] };
assert.equal(deleted.tree[0].sha, null);
console.log("Rubriques : droits, validation, champs conserves, rubrique utilisee et conflit de branche verifies.");
