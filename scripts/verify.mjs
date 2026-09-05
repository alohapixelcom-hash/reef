#!/usr/bin/env node
// scripts/verify.mjs - la verification du RENDU : ce qu'aucune verification de types ne voit.
//
// POURQUOI CE FICHIER EXISTE
//
// `astro check` lit des types. `pnpm test` execute de la logique. `pnpm
// lint:house` compte des lignes et des caracteres. Aucun des trois ne mesure
// un pixel. La liste de revue a la fin de docs/design.md, elle, s'adresse a un
// oeil : c'est exactement ce qu'un agent n'a pas.
//
// Le trou s'est vu le 31 aout 2026. Sur la boutique, a 390 px, le prix se
// posait SUR le nom du theme. Une premiere sonde comparait des
// getBoundingClientRect(), annoncait dix-sept pixels d'ecart, et declarait la
// ligne saine : les boites ne se chevauchaient pas, l'encre si. Une colonne
// flex comprimee sous la largeur de son propre mot laisse le mot deborder de
// sa boite. D'ou la regle de ce fichier : on mesure ce qui est PEINT, jamais
// ce qui est reserve.
//
// CE QUE CHAQUE CONTROLE NE VOIT PAS
//
// Dit ici parce que c'est plus utile qu'une liste de commandes, et parce que
// c'est ce qui empeche de conclure "le banc est vert donc c'est bon" :
//   - le contraste n'est pas mesurable sous une image de fond ni sous un
//     panneau translucide : le controle le DECLARE non mesurable au lieu de
//     l'inventer ;
//   - les cibles tactiles sont mesurees sur la boite, seul endroit ou la
//     boite est la verite : c'est le doigt qui vise, pas l'oeil ;
//   - rien ici ne juge le gout. La hierarchie, l'equilibre et le rythme
//     restent la liste de revue de docs/design.md, faite par un humain.
import { createServer } from "node:http";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { LISIBILITE } from "./verify.lisibilite.mjs";
import { PROBE } from "./verify.probe.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DIST = join(ROOT, "dist");
const WIDTHS = [390, 768, 1440];
// LES DEUX MODES, ET POURQUOI LE SOMBRE MANQUAIT. Le 5 septembre 2026 l'editeur
// a vu, sur l'accueil de alohapixel.com en mode sombre, trois cartes blanches
// au texte clair : illisibles. Le banc les avait declarees saines parce qu'il
// ne mesurait que le mode clair. Un jeton qui suit le theme (bg-card) se
// retourne avec lui ; un blanc ecrit en dur (bg-white) reste blanc sous un
// texte devenu clair. Le banc mesure donc chaque page dans les deux modes : le
// sombre est pose par la meme cle de stockage que lit ThemeInit, avant tout
// script de la page.
const MODES = ["clair", "sombre"];
const THEME_KEY = "reef-theme";
const TARGET_MIN = 44;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    [
      "Playwright n'est pas installe. Le banc de rendu est le seul outil de ce",
      "depot qui a besoin d'un navigateur, et il reste hors des dependances pour",
      "que `pnpm install` n'en telecharge pas un a l'acheteur qui ne s'en sert pas.",
      "",
      "  pnpm add -D playwright && pnpm exec playwright install chromium",
      "",
      "Puis : pnpm build && pnpm verify",
    ].join("\n"),
  );
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* Le serveur statique                                                 */
/* ------------------------------------------------------------------ */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".xml": "application/xml",
};

function serve(dir) {
  const server = createServer((req, res) => {
    let path = decodeURIComponent(req.url.split("?")[0]);
    if (path.endsWith("/")) path += "index.html";
    const full = join(dir, path);
    try {
      const body = readFileSync(full);
      res.writeHead(200, { "Content-Type": MIME[extname(full)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("404");
    }
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

function pages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (name === "index.html") out.push("/" + relative(DIST, full).replace(/index\.html$/, ""));
  }
  return out.sort();
}

/* ------------------------------------------------------------------ */
/* Le banc                                                             */
/* ------------------------------------------------------------------ */

let list;
try {
  list = pages(DIST);
} catch {
  console.error("Pas de dist/. Lance `pnpm build` d'abord.");
  process.exit(2);
}
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const routes = only.length ? list.filter((p) => only.some((o) => p.includes(o))) : list;

const server = await serve(DIST);
const origin = `http://127.0.0.1:${server.address().port}`;

// Le banc ne doit RIEN attendre du reseau. Chromium ouvre au demarrage une
// dizaine de connexions a des services tiers (mise a jour de composants,
// synchronisation, listes de securite) : sur une machine sans sortie, chacune
// attend son delai d'expiration et le banc parait plante alors qu'il ne mesure
// rien. Ces drapeaux les coupent. Un banc qui depend d'une connexion ne dit
// pas la meme chose deux fois de suite.
//
// CHROMIUM_PATH permet par ailleurs de designer un binaire deja present : une
// machine d'integration, une image docker, un poste ou `playwright install`
// n'a pas le droit d'ecrire. Sans la variable, Playwright resout seul.
const browser = await chromium.launch({
  args: [
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--disable-default-apps",
    "--no-first-run",
    "--disable-features=Translate,OptimizationHints,MediaRouter,AutofillServerCommunication",
  ],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const findings = [];

for (const mode of MODES) for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: mode === "sombre" ? "dark" : "light",
  });
  if (mode === "sombre") {
    await context.addInitScript(([k]) => localStorage.setItem(k, "dark"), [THEME_KEY]);
  }
  for (const route of routes) {
    const page = await context.newPage();
    // Tout ce qui n'est pas servi par le dossier dist/ est refuse. Ce n'est pas
    // une optimisation : c'est la definition de ce qu'on mesure. Une police
    // distante qui met deux secondes a arriver changerait la largeur des
    // textes d'un passage a l'autre, et le banc rendrait un verdict different
    // selon la qualite de la connexion.
    await page.route("**/*", (route) =>
      route.request().url().startsWith(origin) ? route.continue() : route.abort(),
    );
    await page.goto(origin + route, { waitUntil: "load" });
    // Les reveals de la maison s'ouvrent a l'entree dans le viewport : sans
    // ce parcours, la moitie de la page est mesuree a l'opacite zero et le
    // banc annonce vert sur du contenu qu'il n'a jamais regarde.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    // Deux sondes, executees l'une apres l'autre dans la meme page. Elles ne
    // partagent rien : Playwright serialise chaque fonction et l'evalue dans
    // l'onglet, ou aucun import n'existe. Le prix est une poignee de lignes en
    // double ; le gain est que chacune tient sous le plafond de la maison et
    // se lit d'une traite.
    const arg = { TARGET_MIN, asked: width };
    for (const f of await page.evaluate(PROBE, arg)) findings.push({ ...f, width, route, mode });
    for (const f of await page.evaluate(LISIBILITE, arg)) findings.push({ ...f, width, route, mode });
    await page.close();
  }
  await context.close();
}

await browser.close();
server.close();

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

console.log(`Banc de rendu : ${routes.length} page(s) x ${WIDTHS.length} largeurs (${WIDTHS.join(", ")}px) x ${MODES.length} modes (${MODES.join(", ")}).`);

if (findings.length === 0) {
  console.log("Aucun defaut de rendu.");
  process.exit(0);
}

const byRule = new Map();
for (const f of findings) {
  const key = `${f.rule}|${f.mode}|${f.route}|${f.detail}|${f.node}`;
  const seen = byRule.get(key);
  if (seen) seen.widths.push(f.width);
  else byRule.set(key, { ...f, widths: [f.width] });
}

const order = ["coupe", "affichage", "debordement", "encre", "contraste", "cible", "titre", "alt"];
const rows = [...byRule.values()].sort((a, b) => order.indexOf(a.rule) - order.indexOf(b.rule));
console.error(`\n${rows.length} defaut(s) :\n`);
for (const r of rows) {
  console.error(`  [${r.rule}] ${r.route} @ ${r.widths.join("/")}px${r.mode === "sombre" ? " (sombre)" : ""}`);
  console.error(`      ${r.detail}${r.node ? `  (${r.node})` : ""}`);
}
process.exit(1);
