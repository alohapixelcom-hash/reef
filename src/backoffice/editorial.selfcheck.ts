// editorial.selfcheck.ts - controles HTTP de droits, conflits et sauvegarde Unicode.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { creerEditeur } from "./editorial.ts";
import { parseFrontmatter, stringifyPost } from "./frontmatter.ts";
import type { SiteEditorial, ServicesEditoriaux } from "./contrat.ts";

const site: SiteEditorial = { id: "reef", depot: "owner/reef", branche: "main", dossierArticles: "src/data/posts", dossierAuteurs: "src/data/authors", dossierSujets: "src/data/topics", dossierImages: "src/assets/covers", format: "reef", langues: ["fr", "en"] };
const fm = { title: "Été à Pau", description: "Description", pubDate: "2026-09-15", author: "fr/lea", topic: "fr/design", draft: true, custom: "conserver" };
let calls = 0;
let writes: Record<string, unknown>[] = [];
let role = "admin";
let concurrent = false;
const head = "a".repeat(40);
const services: ServicesEditoriaux = {
  autoriser: async () => role === "anonymous" ? new Response(null, { status: 401 }) : { email: "admin@example.test", role: role as "admin" | "customer" },
  github: async (path, init) => {
    calls++;
    const input = init?.body ? JSON.parse(String(init.body)) : {};
    if (path.endsWith("/git/ref/heads/main")) return Response.json({ object: { sha: head } });
    if (path.endsWith(`/git/commits/${head}`)) return Response.json({ tree: { sha: "old-tree" } });
    if (path.endsWith("/git/trees")) {
      assert.equal(input.tree[0].path, "src/data/posts/fr/article.md"); writes.push(input.tree[0]);
      return Response.json({ sha: "new-tree" });
    }
    if (path.endsWith("/git/commits")) { assert.deepEqual(input.parents, [head]); return Response.json({ sha: "new-commit" }); }
    if (path.endsWith("/git/refs/heads/main")) { assert.equal(input.force, false); return Response.json({}, { status: concurrent ? 422 : 200 }); }
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
const savedResult = await saved.json();
assert.equal(savedResult.publication, "building");
assert.equal(writes.length, 1);
assert.equal(writes[0].type, "blob");
const content = String(writes[0].content);
assert.equal(savedResult.sha, createHash("sha1").update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest("hex"));
const parsed = parseFrontmatter(content);
assert.equal(parsed.frontmatter.custom, "conserver");
assert.equal(parsed.frontmatter.title, "Été modifié 🌊");
assert.equal(parsed.frontmatter.draft, true);
assert.equal(parsed.body.trim(), valid.body);
console.log("Controles HTTP passes : droits, origine, chemins, conflits, references, Unicode et champs conserves.");

const deletion = { action: "delete", sha: "old-blob" };
role = "anonymous";
assert.equal((await editor(request(deletion), "fr", "article")).status, 401);
role = "customer";
assert.equal((await editor(request(deletion), "fr", "article")).status, 403);
role = "admin";
assert.equal((await editor(request(deletion, "https://evil.test"), "fr", "article")).status, 403);
assert.equal((await editor(request({ action: "delete" }), "fr", "article")).status, 409);
assert.equal((await editor(request({ ...deletion, sha: "stale" }), "fr", "article")).status, 409);
assert.equal(writes.length, 1);
const removed = await editor(request(deletion), "fr", "article");
assert.equal(removed.status, 200); assert.equal((await removed.json()).deleted, true);
assert.equal(writes.length, 2);
console.log("Suppression : droits, origine et revision controles avant ecriture.");

concurrent = true;
assert.equal((await editor(request(valid), "fr", "article")).status, 409);
console.log("Article : commit concurrent sur un autre fichier refuse sans push force.");
