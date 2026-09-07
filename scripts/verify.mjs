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
// LES CINQ LARGEURS, ET POURQUOI IL EN MANQUAIT DEUX.
//
// Le banc a longtemps mesure 390, 768 et 1440 : un telephone, une tablette, un
// grand ecran. Il ne regardait donc JAMAIS la bande ou travaille la majorite
// des visiteurs professionnels, entre 1024 et 1366. Le 3 septembre 2026, sur
// deux sites de la maison, le second bouton du premier ecran sortait de sa
// colonne et se faisait couper net par le `overflow-hidden` de la section, de
// 174 px a 1024, de 125 a 1152, de 75 a 1280. A 1440 il tenait, a 768 la
// colonne s'empilait : le banc voyait vert aux trois largeurs qu'il
// connaissait, et le defaut a ete signale par un humain devant son ecran.
//
// 1024 est la bascule `lg` de Tailwind, c'est-a-dire l'endroit precis ou une
// grille passe a deux colonnes avec le moins de place pour le faire. 1280 est
// l'ordinateur portable le plus courant. Ces deux-la ne se retirent plus.
const WIDTHS = [390, 768, 1024, 1280, 1440];
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
/**
 * Attend que la mise en page soit POSEE avant de mesurer.
 *
 * POURQUOI CETTE FONCTION EXISTE. Le banc a longtemps mesure 400 ms apres son
 * parcours de defilement, en esperant que ce delai suffise. Le 7 septembre
 * 2026 il a rendu trois verdicts differents sur le meme dist/ : vert, puis
 * cinq "aucun h1 sur la page", puis six, sur des adresses qui changeaient a
 * chaque passage et arrivaient toujours en RAFALE, par blocs contigus. C'est
 * la signature d'une machine chargee, pas d'un defaut de page : rejouee a la
 * main, chacune rendait son titre a 208 x 54 px, visible et peint.
 *
 * Un banc qui ne dit pas deux fois la meme chose ne sert a rien : on ne peut
 * plus distinguer une regression d'un caprice, et l'habitude de relancer
 * jusqu'au vert finit par masquer un vrai defaut. Le delai fixe est donc
 * remplace par une CONDITION : les polices sont arrivees, la hauteur du
 * document et la boite du premier titre ne bougent plus d'une image a
 * l'autre, et si un h1 existe dans le document, il mesure quelque chose.
 *
 * Cette derniere clause ne masque rien : une page reellement SANS h1 n'en a
 * aucun a attendre, la condition est vraie tout de suite et le defaut est
 * signale comme avant. Seule la page qui EN A un, mais pas encore pose,
 * patiente.
 */
async function reposer(page) {
  try {
    await page.waitForFunction(
      async () => {
        await document.fonts.ready;
        const boite = () => {
          const t = document.querySelector("h1");
          if (!t) return "0";
          const r = t.getBoundingClientRect();
          return `${Math.round(r.width)}x${Math.round(r.height)}`;
        };
        const image = () => new Promise((r) => requestAnimationFrame(() => r()));
        const lire = () => `${document.body.scrollHeight}|${boite()}`;
        const avant = lire();
        await image();
        await image();
        if (lire() !== avant) return false;
        // Un h1 present dans le document doit avoir une boite. Aucun h1 du
        // tout est une reponse valide : c'est au controle de le dire.
        const titres = [...document.querySelectorAll("h1")];
        if (!titres.length) return true;
        return titres.some((t) => {
          const r = t.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      },
      undefined,
      { timeout: 5000, polling: 100 },
    );
  } catch {
    // Le repos n'est pas venu en cinq secondes : on mesure quand meme, et le
    // controle dira ce qu'il voit. Se taire ici serait pire.
  }
  await page.waitForTimeout(200);
}

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
    await reposer(page);
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
