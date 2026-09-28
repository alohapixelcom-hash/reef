// scripts/navigateur.mjs - ouvre Chromium par Playwright avec une session d'editeur du moteur (generique) : la piece commune de couverture-edition.mjs et essai-administrer.mjs.
//
// PLAYWRIGHT N'EST PAS UNE DEPENDANCE DU THEME (voir verify.mjs) : il se
// charge s'il est la, et ALOHA_PLAYWRIGHT peut nommer une autre installation
// (le chemin de son index.mjs). Le navigateur est celui que Playwright trouve
// (PLAYWRIGHT_BROWSERS_PATH), ou celui que PLAYWRIGHT_CHROMIUM designe.
//
// LA SESSION. Sous `astro dev`, la porte de developpement
// /_emdash/api/auth/dev-bypass ouvre une session d'administrateur sans cle, et
// ne touche a rien d'autre. (Sa voisine /_emdash/api/setup/dev-bypass
// reapplique la graine en plus : jamais ici, elle recreerait les liens des
// menus et reecrirait les reglages.) Une session deja ouverte se passe par
// --session <valeur du cookie astro-session>, et vaut aussi pour un build de
// production servi par workerd sur la meme base locale.
import { existsSync } from "node:fs";

/** Les arguments nommes de la ligne de commande : --url X --session Y, et les drapeaux nus. */
export function arguments_(argv = process.argv.slice(2)) {
  const nommes = {};
  const drapeaux = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const suivant = argv[i + 1];
    if (suivant !== undefined && !suivant.startsWith("--")) {
      nommes[a.slice(2)] = suivant;
      i++;
    } else drapeaux.add(a.slice(2));
  }
  return { nommes, drapeaux };
}

/** Charge Playwright, ou explique comment l'avoir. */
export async function chargerPlaywright() {
  try {
    return await import(process.env.ALOHA_PLAYWRIGHT ?? "playwright");
  } catch {
    console.error(
      [
        "Playwright n'est pas installe. Il reste hors des dependances du theme.",
        "  pnpm add -D playwright && pnpm exec playwright install chromium",
        "ou ALOHA_PLAYWRIGHT=<chemin>/playwright/index.mjs et PLAYWRIGHT_BROWSERS_PATH=<dossier>.",
      ].join("\n"),
    );
    process.exit(2);
  }
}

/** Le Chromium de Playwright, ou celui que PLAYWRIGHT_CHROMIUM designe. */
export async function ouvrirChromium() {
  const { chromium } = await chargerPlaywright();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM;
  if (executablePath && !existsSync(executablePath)) throw new Error(`PLAYWRIGHT_CHROMIUM : ${executablePath} n'existe pas`);
  return chromium.launch(executablePath ? { executablePath } : {});
}

/**
 * Un contexte avec la session d'editeur et, si demande, le mode edition
 * (cookie emdash-edit-mode=true, celui que pose le bouton "Edit" de la barre).
 */
export async function contexteEditeur(navigateur, { url, session, edition = true, largeur = 1280 }) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, locale: "en-US" });
  const origine = new URL(url);
  const cookies = [];
  if (session) cookies.push({ name: "astro-session", value: session, domain: origine.hostname, path: "/", httpOnly: true });
  if (edition) cookies.push({ name: "emdash-edit-mode", value: "true", domain: origine.hostname, path: "/" });
  if (cookies.length > 0) await contexte.addCookies(cookies);
  if (!session) {
    const page = await contexte.newPage();
    const reponse = await page.goto(`${url}/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin`);
    if (!reponse || !reponse.ok()) throw new Error(`La porte de developpement a repondu ${reponse?.status()} : lancez astro dev, ou passez --session`);
    await page.close();
  }
  return contexte;
}

/** La valeur du cookie de session du contexte, pour la rejouer plus tard. */
export async function sessionDe(contexte) {
  return (await contexte.cookies()).find((c) => c.name === "astro-session")?.value ?? null;
}
