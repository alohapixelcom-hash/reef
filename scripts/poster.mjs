// scripts/poster.mjs - refabrique la capture posee dans le telephone dessine de la page d'accueil.
//
// Le telephone de PhoneShot.astro montre une IMAGE, pas un iframe : un cadre
// qui charge le site dans le site double le poids de la page, rejoue ses
// animations et double ses requetes. Une capture pese 40 ko et ne bouge pas.
//
// La contrepartie est qu'une capture vieillit. Des que la marque change
// (`pnpm rebrand`), que le texte d'accueil change ou que le premier ecran est
// redessine, le telephone montre l'ancien site. C'est exactement ce que ce
// script repare, et c'est pourquoi il existe plutot qu'un fichier fige :
//
//   pnpm build && pnpm poster
//
// Playwright reste hors des dependances, comme pour `pnpm verify` : un
// acheteur qui ne regenere jamais la capture n'a pas a telecharger un
// navigateur a l'installation.
import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

// Le viewport d'un iPhone recent, au rapport exact du cadre dessine (9 / 19,5).
// Le facteur 2 double la definition : sur un ecran retina le telephone reste
// net sans qu'on stocke une image de 4 Mo.
const VIEWPORT = { width: 390, height: 845 };
const SCALE = 2;
const OUT_WIDTH = 560;

const { name: THEME } = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const OUT = join(ROOT, "public", `${THEME}-iphone-poster.webp`);
const route = process.argv[2] ?? "/";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    [
      "Playwright n'est pas installe. La capture du telephone et le banc de rendu",
      "sont les deux seuls outils de ce depot qui ont besoin d'un navigateur, et",
      "il reste hors des dependances pour que `pnpm install` n'en telecharge pas",
      "un a l'acheteur qui ne s'en sert pas.",
      "",
      "  pnpm add -D playwright && pnpm exec playwright install chromium",
      "",
      "Puis : pnpm build && pnpm poster",
    ].join("\n"),
  );
  process.exit(2);
}

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error("sharp est absent. Lance `pnpm install` avant `pnpm poster`.");
  process.exit(2);
}

if (!(await stat(DIST).catch(() => null))) {
  console.error("dist/ est absent. Lance `pnpm build` avant `pnpm poster`.");
  process.exit(2);
}

const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".mp4": "video/mp4",
};

/** Sert dist/ sur un port libre. Aucun octet ne sort de la machine. */
function serveDist() {
  return new Promise((ready) => {
    const server = createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url, "http://local").pathname);
        let file = normalize(join(DIST, path));
        if (!file.startsWith(DIST)) {
          res.writeHead(403).end();
          return;
        }
        let found = await stat(file).catch(() => null);
        if (found?.isDirectory()) {
          file = join(file, "index.html");
          found = await stat(file).catch(() => null);
        }
        if (!found) {
          res.writeHead(404).end("404");
          return;
        }
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(await readFile(file));
      } catch {
        res.writeHead(500).end();
      }
    });
    server.listen(0, "127.0.0.1", () => ready(server));
  });
}

const server = await serveDist();
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  args: [
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--disable-default-apps",
    "--no-first-run",
  ],
});

// `reducedMotion` n'est pas un detail de confort ici : Reveal et StaggerReveal
// masquent leur contenu depuis leur script, et ne le masquent PAS quand le
// visiteur a demande du calme. Sans ce reglage la capture peut sortir vide.
const page = await browser.newPage({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});

// Rien ne part vers un tiers pendant la capture : ce qui n'est pas servi par
// dist/ est refuse, donc la capture ne peut pas dependre d'un CDN.
await page.route("**/*", (route_) =>
  route_.request().url().startsWith(origin) ? route_.continue() : route_.abort(),
);

await page.goto(origin + route, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(1200);
const shot = await page.screenshot({
  clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
});

const height = Math.round((OUT_WIDTH * VIEWPORT.height) / VIEWPORT.width);
const webp = await sharp(shot)
  .resize(OUT_WIDTH, height, { fit: "cover", position: "top" })
  .webp({ quality: 82 })
  .toBuffer();
await writeFile(OUT, webp);

await browser.close();
server.close();

const kb = (webp.length / 1024).toFixed(0);
console.log(`public/${THEME}-iphone-poster.webp  ${OUT_WIDTH}x${height}  ${kb} ko  (${route})`);
