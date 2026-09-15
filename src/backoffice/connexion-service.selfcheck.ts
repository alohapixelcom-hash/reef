// connexion-service.selfcheck.ts - la liaison ne donne acces ni aux clients ni aux autres API.
import assert from "node:assert/strict";
import { connexionAloha } from "./connexion-service.ts";
let calls = 0;
let role = "admin";
let email = "admin@example.test";
const auth = connexionAloha({ origine: "https://auth.example.test", administrateurs: [email], service: {
  fetch: async (req) => { calls++; assert.equal(new URL(req.url).origin, "https://auth.example.test");
    assert.equal(req.headers.get("Authorization"), null);
    return Response.json({ authenticated: true, role, email }); },
} });
const req = (path: string, body?: unknown, origin = "https://reef.example.test") => new Request(`https://reef.example.test${path}`, body === undefined ? {} : { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
assert.equal(await auth.route(req("/api/admin/orders")), null);
assert.equal(await auth.route(req("/api/compte")), null);
assert.equal((await auth.route(req("/api/auth/request", { email }, "https://evil.example.test")))?.status, 403);
assert.equal((await auth.route(req("/api/auth/request", { email: "buyer@example.test" })))?.status, 200);
assert.equal(calls, 0);
assert.equal((await auth.identity(req("/")))?.role, "admin");
role = "customer";
assert.equal(await auth.identity(req("/")), null);
role = "admin"; email = "other-admin@example.test";
assert.equal(await auth.identity(req("/")), null);
assert.deepEqual(await (await auth.route(req("/api/auth/me")))?.json(), { authenticated: false });
console.log("Liaison Aloha verifiee : liste propre au site, roles et API limitees.");
