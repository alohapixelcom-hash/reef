// src/worker.selfcheck.ts - erreurs de cookies, langues et routage, sans reseau.
import assert from "node:assert/strict";
import worker from "./worker.ts";

const env = { ASSETS: { fetch: async () => new Response("asset", { status: 200 }) } };
const cases: [string, Record<string, string>, number, string | null][] = [
  ["/", {}, 200, null],
  ["/", { "Accept-Language": "fr" }, 302, "/fr/"],
  ["/about/?ref=test", { "Accept-Language": "fr" }, 302, "/fr/about/?ref=test"],
  ["/", { "Accept-Language": "fr;q=0" }, 200, null],
  ["/", { "Accept-Language": "fr;q=-1,en;q=0.5" }, 200, null],
  ["/", { "Accept-Language": "fr;q=2,en;q=0.5" }, 200, null],
  ["/", { "Accept-Language": "fr;q=no,en;q=0.5" }, 200, null],
  ["/", { "Accept-Language": "en;q=0.5,fr;q=0.9" }, 302, "/fr/"],
  ["/", { Cookie: "aloha_locale=en", "Accept-Language": "fr" }, 200, null],
  ["/", { Cookie: "aloha_locale=fr", "Accept-Language": "en" }, 302, "/fr/"],
  ["/", { Cookie: "aloha_locale=%66%72" }, 302, "/fr/"],
  ["/", { Cookie: "aloha_locale=%E0%A4%A", "Accept-Language": "en" }, 200, null],
  ["/", { Cookie: "aloha_locale=%", "Accept-Language": "fr" }, 302, "/fr/"],
  ["/", { Cookie: "unrelated=%; aloha_locale=en" }, 200, null],
  ["/fr/about/", { "Accept-Language": "fr" }, 200, null],
  ["/favicon.ico", { "Accept-Language": "fr" }, 200, null],
];
for (const [path, headers, status, location] of cases) {
  const response = await worker.fetch(new Request("https://example.com" + path, { headers }), env);
  assert.equal(response.status, status, JSON.stringify({ path, headers }));
  assert.equal(response.headers.get("Location"), location);
  if (status === 302) {
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Vary"), "Accept-Language, Cookie");
  }
}
const post = await worker.fetch(new Request("https://example.com/", {
  method: "POST", headers: { "Accept-Language": "fr" },
}), env);
assert.equal(post.status, 200);
console.log("17 cas de routage passes.");
