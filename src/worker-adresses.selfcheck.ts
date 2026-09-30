// src/worker-adresses.selfcheck.ts - self-check des adresses que les Workers reglent eux-memes : plans du site, barre finale, page introuvable, Server-Timing.
// Lancer : node --experimental-strip-types src/worker-adresses.selfcheck.ts
import assert from "node:assert/strict";
import { barreFinale, estLaPageIntrouvable, pageIntrouvable, planDuSite, reponseAuVisiteur } from "./worker-adresses.ts";

let checks = 0;
const demande = (chemin: string, init: RequestInit = {}) => new Request("https://example.com" + chemin, init);

// Les fichiers : une 404 par langue, servies sous /404 et /fr/404 avec un code 200.
const demandes: string[] = [];
const fichiers = {
  fetch: async (request: Request) => {
    const chemin = new URL(request.url).pathname;
    demandes.push(`${request.method} ${chemin}`);
    if (chemin === "/404") return new Response("introuvable en", { headers: { "Content-Type": "text/html" } });
    if (chemin === "/fr/404") return new Response("introuvable fr", { headers: { "Content-Type": "text/html" } });
    return new Response(null, { status: 404 });
  },
};

// 1. Les plans du site.
const plans = ["/sitemap-index.xml", "/sitemap-contenu.xml"];
const redirige = planDuSite(demande("/sitemap.xml"), plans);
assert.equal(redirige?.status, 301);
assert.equal(redirige?.headers.get("Location"), "/sitemap-index.xml");
for (const inconnu of ["/sitemap-0.xml", "/sitemap-1.xml", "/sitemap-contenu-1.xml", "/sitemap-posts.xml"]) {
  assert.equal(planDuSite(demande(inconnu), plans)?.status, 404, inconnu);
}
for (const connu of ["/sitemap-index.xml", "/sitemap-contenu.xml", "/fr/sitemap.xml", "/robots.txt", "/blog/"]) {
  assert.equal(planDuSite(demande(connu), plans), null, connu);
}
checks += 11;

// 2. La barre finale.
const cas: [string, string | null][] = [
  ["/blog/reading-slowly", "/blog/reading-slowly/"],
  ["/about?ref=x", "/about/?ref=x"],
  ["/fr", "/fr/"],
  ["/fr/blog", "/fr/blog/"],
  ["/", null],
  ["/about/", null],
  ["/llms.txt", null],
  ["/version.json", null],
  ["/_emdash/admin", null],
  ["/_image", null],
  ["/@vite/client", null],
  ["/@id/astro:scripts/before-hydration.js", null],
  ["/node_modules/.vite/deps/react.js", null],
  // Jamais vers un autre domaine : "//hote/" serait une adresse sans schema.
  ["//evil", "/evil/"],
  ["/\\evil", "/evil/"],
  ["///evil%2Ecom", "/evil%2Ecom/"],
];
for (const [chemin, attendu] of cas) {
  const reponse = barreFinale(demande(chemin));
  assert.equal(reponse?.headers.get("Location") ?? null, attendu, chemin);
  if (attendu) assert.equal(reponse?.status, 301, chemin);
  checks += 1;
}
assert.equal(barreFinale(demande("/contact", { method: "POST" })), null, "une ecriture ne se redirige pas");
checks += 1;

// 3. L'adresse de la page introuvable.
for (const chemin of ["/404", "/404/", "/404.html", "/fr/404", "/fr/404/", "/fr/404.html"]) {
  assert.equal(estLaPageIntrouvable(demande(chemin)), true, chemin);
  checks += 1;
}
for (const chemin of ["/de/404/", "/en/404/", "/blog/404/", "/4040/", "/fr/"]) {
  assert.equal(estLaPageIntrouvable(demande(chemin)), false, chemin);
  checks += 1;
}

// 4. La page introuvable, dans la langue de l'adresse, toujours en 404.
const francaise = await pageIntrouvable(demande("/fr/nulle-part/"), fichiers);
assert.equal(francaise.status, 404);
assert.equal(await francaise.text(), "introuvable fr");
const anglaise = await pageIntrouvable(demande("/nowhere/"), fichiers);
assert.equal(anglaise.status, 404);
assert.equal(await anglaise.text(), "introuvable en");
await pageIntrouvable(demande("/fr/404/", { method: "HEAD" }), fichiers);
assert.equal(demandes.at(-1), "HEAD /fr/404");
checks += 5;

// 5. La reponse au visiteur : la 404 d'Astro devient celle de la langue, l'API garde la sienne, Server-Timing ne sort pas.
const astro404 = new Response("<html lang=en>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
const remplacee = await reponseAuVisiteur(demande("/fr/blog/nulle-part/"), astro404, fichiers);
assert.equal(remplacee.status, 404);
assert.equal(await remplacee.text(), "introuvable fr");
const vide = await reponseAuVisiteur(demande("/fr/x/"), new Response(null, { status: 404 }), fichiers);
assert.equal(await vide.text(), "introuvable fr", "une 404 sans corps recoit la page de sa langue");
const api = new Response('{"error":"NOT_FOUND"}', { status: 404, headers: { "Content-Type": "application/json" } });
const apiServie = await reponseAuVisiteur(demande("/_emdash/api/content/x"), api, fichiers);
assert.equal(await apiServie.text(), '{"error":"NOT_FOUND"}');
const minutee = new Response("page", {
  status: 200,
  headers: { "Content-Type": "text/html", "Server-Timing": 'db.count;dur=12;desc="Query count"', "X-Content-Type-Options": "nosniff" },
});
const servie = await reponseAuVisiteur(demande("/"), minutee, fichiers);
assert.equal(servie.status, 200);
assert.equal(servie.headers.get("Server-Timing"), null);
assert.equal(servie.headers.get("X-Content-Type-Options"), "nosniff");
assert.equal(await servie.text(), "page");
checks += 8;

console.log(`worker-adresses.selfcheck: ${checks} verifications passees.`);
