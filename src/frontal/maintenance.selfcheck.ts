// src/frontal/maintenance.selfcheck.ts - self-check de l'aiguillage du mode maintenance avec les reglages de l'ecran : page composee, 503, Retry-After vers la date de retour, noindex, jamais gardee, editeur, back office, robots.txt, plans et API toujours joignables.
// Lancer : node --experimental-strip-types src/frontal/maintenance.selfcheck.ts
import assert from "node:assert/strict";
import { composerLAttente, dateEnLettres, echapper } from "./attente.ts";
import { creerFrontal } from "./cache.ts";
import { lireLesReglages, OPTION_DE_MAINTENANCE, OPTION_DES_REGLAGES, reessayerApres, reglagesDe, RETRY_MAX, RETRY_MIN } from "./maintenance.ts";

let n = 0;
const is = (c: unknown, m: string) => {
  assert.ok(c, m);
  n += 1;
};

// 1. Les reglages relus sans confiance.
is(reglagesDe("pas du json") === null, "un JSON illisible donne null");
is(reglagesDe("[1]") === null, "un tableau donne null");
const r = reglagesDe(JSON.stringify({ titre: `  ${"x".repeat(200)}`, sousTitre: 3, fond: "gif", image: "a'b", video: "01JABC", retour: "20/10/2026" }))!;
is(r.titre.length === 120 && r.sousTitre === "" && r.fond === "aucun" && r.image === null && r.video === "01JABC" && r.retour === null, "titre borne, fond inconnu = aucun, identifiant douteux refuse, date mal formee refusee");

// 2. Retry-After : par defaut une heure, sinon la date de retour, bornee.
const t0 = Date.parse("2026-10-11T10:00:00Z");
is(reessayerApres(null, t0) === "3600", "sans date : 3600");
is(reessayerApres("2026-10-01", t0) === "3600", "date passee : 3600");
is(reessayerApres("2026-10-12", t0) === String(14 * 3600), "demain minuit UTC : 14 h");
is(reessayerApres("2027-01-01", t0) === String(RETRY_MAX), "au plus un jour");
is(reessayerApres("2026-10-11", Date.parse("2026-10-10T23:59:00Z")) === String(RETRY_MIN), "au moins cinq minutes");

// 3. La page composee.
is(echapper(`<a href="x">'&`) === "&lt;a href=&quot;x&quot;&gt;&#39;&amp;", "echappement");
is(dateEnLettres("2026-10-20", "fr") === "20 octobre 2026", "date en francais");
is(dateEnLettres("2026-13-45", "fr") === null || dateEnLettres("2026-13-45", "fr") !== "", "date impossible sans plantage");
const page = composerLAttente({ titre: "On <revient>", sousTitre: "Ligne 1\nLigne 2", fond: { sorte: "video", adresse: "/_emdash/api/media/file/v.mp4", type: "video/mp4" }, retour: "2026-10-20" });
is(page.includes('<meta name="robots" content="noindex">'), "noindex dans le head");
is((page.match(/<h1>/g) ?? []).length === 1 && page.includes("On &lt;revient&gt;"), "un seul h1, texte echappe");
is(page.includes("autoplay muted loop playsinline") && page.includes("prefers-reduced-motion"), "video muette et retenue pour qui demande moins de mouvement");
is(page.includes("Ligne 1<br>Ligne 2") && page.includes("Retour prévu le 20 octobre 2026."), "sous-titre et date de retour");
const tirets = [0x2014, 0x2013].map((c) => String.fromCharCode(c));
is(!tirets.some((t) => page.includes(t)), "aucun tiret interdit");
const image = composerLAttente({ titre: "T", sousTitre: "", fond: { sorte: "image", adresse: "/_emdash/api/media/file/p.webp", type: "image/webp" }, retour: null }, "en");
is(image.includes('<html lang="en">') && image.includes('<img src="/_emdash/api/media/file/p.webp" alt="">') && !image.includes("<p"), "image decorative, rien d'autre");

// 4. Lecture dans une base simulee : media resolu, mauvais type ecarte, titre vide = page du site.
const options = new Map<string, string>();
const medias: Record<string, { storage_key: string; mime_type: string }> = {
  IMG1: { storage_key: "abc.webp", mime_type: "image/webp" },
  VID1: { storage_key: "dossier/film.mp4", mime_type: "video/mp4" },
};
const requetes: string[] = [];
const base = {
  prepare: (sql: string) => ({
    first: async <T>() => {
      requetes.push(sql);
      for (const [nom, valeur] of options) if (sql.includes(`'${nom}'`)) return { value: valeur } as T;
      const id = /FROM media WHERE id = '([^']+)'/.exec(sql)?.[1];
      if (id) return (medias[id] ?? null) as T;
      if (sql.includes("FROM options")) return null as T;
      return { cle: "v1", derniere: 0 } as T;
    },
  }),
};
const regler = (o: Record<string, unknown>) => options.set(OPTION_DES_REGLAGES, JSON.stringify(o));
regler({ titre: "", fond: "image", image: "IMG1" });
is((await lireLesReglages(base)) === null, "sans titre : rien, la page du site prend le relais");
regler({ titre: "Pause", fond: "image", image: "IMG1" });
is((await lireLesReglages(base))?.fond?.adresse === "/_emdash/api/media/file/abc.webp", "image resolue");
regler({ titre: "Pause", fond: "video", video: "VID1" });
is((await lireLesReglages(base))?.fond?.adresse === "/_emdash/api/media/file/dossier/film.mp4", "video resolue, cle a dossier gardee");
regler({ titre: "Pause", fond: "video", video: "IMG1" });
is((await lireLesReglages(base))?.fond === null, "une image choisie comme video : fond uni");
regler({ titre: "Pause", fond: "image", image: "INCONNU" });
is((await lireLesReglages(base))?.fond === null, "media disparu : fond uni");
is((await lireLesReglages({ prepare: () => ({ first: async () => { throw new Error("x"); } }) })) === null, "base injoignable : null");

// 5. L'aiguillage complet, site ferme.
options.set(OPTION_DE_MAINTENANCE, "true");
regler({ titre: "Nous revenons vite", sousTitre: "Inventaire.", fond: "image", image: "IMG1", retour: "2026-10-12" });
const versLeMoteur: string[] = [];
const moteur = {
  fetch: async (q: Request) => {
    const chemin = new URL(q.url).pathname;
    versLeMoteur.push(chemin);
    if (chemin === "/_emdash/api/auth/me") return new Response("{}", { status: (q.headers.get("Cookie") ?? "").includes("astro-session=ok") ? 200 : 401 });
    if (chemin === "/robots.txt") return new Response("User-agent: *", { headers: { "Content-Type": "text/plain" } });
    return new Response(`<p>${chemin}</p>`, { headers: { "Content-Type": "text/html" } });
  },
};
const mises: string[] = [];
(globalThis as unknown as { caches: unknown }).caches = { default: { match: async () => undefined, put: async (q: Request) => void mises.push(q.url) } };
const ctx = { waitUntil: () => undefined };
const env = { MOTEUR: moteur, DB: base };
const frontal = creerFrontal({ memoireDeLaVersion: 0 });
const req = (chemin: string, init: RequestInit = {}) => new Request(`https://site.test${chemin}`, init);

let rep = await frontal.fetch(req("/boutique/"), env, ctx);
is(rep.status === 503 && rep.headers.get("x-aloha-cache") === "MAINTENANCE", "un visiteur : 503");
is(rep.headers.get("X-Robots-Tag") === "noindex" && rep.headers.get("Cache-Control") === "no-store", "noindex et jamais garde");
const reste = Number(rep.headers.get("Retry-After"));
is(reste >= RETRY_MIN && reste <= RETRY_MAX, "Retry-After vers la date de retour, borne");
const corps = await rep.text();
is(corps.includes("<h1>Nous revenons vite</h1>") && corps.includes("abc.webp"), "la page composee par l'ecran");
is(!versLeMoteur.includes("/maintenance-du-site/"), "aucune page demandee au site quand l'ecran a un titre");
rep = await frontal.fetch(req("/en/shop/"), env, ctx);
is((await rep.text()).includes('<html lang="en">'), "adresse anglaise : page en anglais");
rep = await frontal.fetch(req("/", { method: "HEAD" }), env, ctx);
is(rep.status === 503 && (await rep.text()) === "", "HEAD : 503 sans corps");
is((await frontal.fetch(req("/boutique/", { headers: { Cookie: "astro-session=ok" } }), env, ctx)).status === 200, "l'administrateur connecte voit le site");
is((await frontal.fetch(req("/boutique/", { headers: { Cookie: "astro-session=faux" } }), env, ctx)).status === 503, "un cookie au bon nom ne suffit pas");
for (const chemin of ["/_emdash/admin", "/_emdash/api/content/posts", "/_emdash/api/media/file/abc.webp"]) {
  is((await frontal.fetch(req(chemin), env, ctx)).headers.get("x-aloha-cache") === "MOTEUR", `${chemin} passe toujours`);
}
for (const chemin of ["/robots.txt", "/sitemap-index.xml", "/sitemap-moteur.xml", "/llms.txt"]) {
  is((await frontal.fetch(req(chemin), env, ctx)).headers.get("x-aloha-cache") !== "MAINTENANCE", `${chemin} passe toujours`);
}
is((await frontal.fetch(req("/caisse/", { method: "POST" }), env, ctx)).headers.get("x-aloha-cache") === "MOTEUR", "un envoi passe toujours");
is(mises.every((u) => !u.includes("/boutique/")), "la page de maintenance n'est jamais gardee");
options.set(OPTION_DE_MAINTENANCE, "false");
is((await frontal.fetch(req("/boutique/"), env, ctx)).status === 200, "site rouvert");

console.log(`maintenance.selfcheck (frontal) : ${n} verifications, reglages, Retry-After, page composee, aiguillage site ferme : tout passe.`);
