// garde-pages.selfcheck.ts - aucune page privee ne sort avant verification serveur.
import assert from "node:assert/strict";
import { creerGardePages } from "./garde-pages.ts";
import type { Identite } from "./contrat.ts";
let identity: Identite | null = null;
let served = 0;
let failed = false;
const guard = creerGardePages({ bases: ["/secret-spot", "/fr/secret-spot"],
  autoriser: async () => { if (failed) throw new Error("offline"); return identity; },
  servir: async () => { served++; return new Response("private HTML", { headers: { "Cache-Control": "public, max-age=3600" } }); },
});
const request = (path: string, method = "GET") => new Request(`https://reef.example.test${path}`, { method });
assert.equal(await guard(request("/blog/")), null);
for (const path of ["/secret-spot", "/secret-spot/", "/secret-spot.html", "/secret-spot/index.html", "/%73ecret-spot/articles/", "/fr/secret-spot/articles/"]) {
  assert.equal((await guard(request(path)))?.status, 302, path);
}
identity = { email: "client@example.test", role: "customer" };
assert.equal((await guard(request("/secret-spot/articles/")))?.status, 302);
assert.equal(served, 0);
assert.equal((await guard(request("/secret-spot/connexion/")))?.status, 200);
identity = { email: "admin@example.test", role: "admin" };
const page = await guard(request("/secret-spot/articles/"));
assert.equal(page?.status, 200);
assert.equal(page?.headers.get("Cache-Control"), "private, no-store");
assert.equal(page?.headers.get("X-Robots-Tag"), "noindex, nofollow");
assert.equal(await (await guard(request("/secret-spot/articles/", "HEAD")))?.text(), "");
failed = true;
const before = served;
assert.equal((await guard(request("/secret-spot/articles/")))?.status, 503);
assert.equal(served, before, "Une panne de session ne sert aucun HTML prive");
console.log("Garde serveur verifiee : anonyme, client, admin, panne, chemins directs et cache.");
