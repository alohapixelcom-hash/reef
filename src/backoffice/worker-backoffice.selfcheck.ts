// worker-backoffice.selfcheck.ts - parcours du vrai raccord Worker avec services simules.
import assert from "node:assert/strict";
import { backoffice, type BackofficeEnv } from "./worker-backoffice.ts";
let assets = 0;
let github = 0;
let authenticated = false;
const env: BackofficeEnv = { ASSETS: { fetch: async () => { assets++; return new Response("ADMIN"); } } };
const req = (path: string) => new Request(`https://reef.example.test${path}`, { headers: { Cookie: "session=private" } });
assert.equal(await backoffice(req("/blog/"), env), null);
assert.equal((await backoffice(req("/secret-spot/"), env))?.status, 503);
assert.equal(assets, 0);
Object.assign(env, {
  ALOHA_AUTH_ORIGIN: "https://auth.example.test", ALOHA_ADMIN_EMAILS: "admin@example.test",
  GITHUB_CONTENT_TOKEN: "test-token-only",
  ALOHA_EDITORIAL_CONFIG: JSON.stringify({ id: "reef", depot: "owner/reef", branche: "main", dossierArticles: "src/data/posts", dossierAuteurs: "src/data/authors", dossierSujets: "src/data/topics", dossierImages: "src/assets/covers", format: "reef", langues: ["fr", "en"] }),
  ALOHA_AUTH: { fetch: async () => Response.json({ authenticated, role: "admin", email: "admin@example.test" }) },
});
const transport: typeof fetch = async (input, init) => {
  github++;
  assert.equal(init?.redirect, "manual", "Cloudflare refuse redirect:error ; aucune redirection ne doit etre suivie");
  assert.equal(String(input), "https://api.github.com/graphql");
  const headers = new Headers(init?.headers);
  assert.equal(headers.get("Cookie"), null);
  assert.equal(headers.get("Authorization"), "Bearer test-token-only");
  return Response.json({ data: { repository: { object: { entries: [] } } } });
};
assert.equal((await backoffice(req("/secret-spot/"), env, transport))?.status, 302);
assert.equal((await backoffice(req("/api/editorial/fr"), env, transport))?.status, 401);
assert.equal(github, 0);
authenticated = true;
assert.equal((await backoffice(req("/secret-spot/"), env, transport))?.status, 200);
assert.equal((await backoffice(req("/api/admin/orders"), env, transport))?.status, 404);
assert.equal((await backoffice(req("/api/compte"), env, transport))?.status, 404);
const articles = await backoffice(req("/api/editorial/fr"), env, transport);
assert.equal(articles?.status, 200);
assert.equal((await articles?.json()).site, "reef");
assert.equal(github, 4);
let relays = 0;
delete env.GITHUB_CONTENT_TOKEN;
env.ALOHA_CONTENT = { fetch: async request => {
  relays++;
  assert.equal(new URL(request.url).pathname, "/api/admin/theme-editorial/reef/fr");
  assert.equal(request.headers.get("Origin"), "https://reef.example.test");
  return Response.json({ site: "reef" });
} };
assert.equal((await backoffice(req("/api/editorial/fr"), env, transport))?.status, 200);
assert.equal(relays, 1);
const crossSite = new Request("https://reef.example.test/api/editorial/fr", { method: "POST", headers: { Origin: "https://other.example.test" }, body: "{}" });
assert.equal((await backoffice(crossSite, env, transport))?.status, 403);
assert.equal(relays, 1, "Le relais ne blanchit pas l'origine d'une requete externe");
assert.equal(github, 4, "Le jeton central n'est jamais copie dans Reef");
console.log("Raccord Worker verifie : fermeture par defaut, session, HTML prive et API editoriale isolee.");
