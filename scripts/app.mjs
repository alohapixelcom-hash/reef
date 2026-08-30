#!/usr/bin/env node
/**
 * scripts/app.mjs - prepare le build pour une coquille native Capacitor.
 *
 * Une application n'est pas un site : deux choses qui sont correctes sur le web
 * deviennent des defauts dans une coquille native, et Apple les remarque.
 *
 *   1. Les balises canonical et sitemap designent un site public sur lequel
 *      l'utilisateur n'est pas. Elles font partie des indices qui font recaler
 *      une application au motif qu'elle "n'est qu'un site web emballe".
 *   2. Le manifeste demarre sur une URL absolue : au demarrage a froid, la
 *      coquille ouvrirait le site en ligne au lieu du bundle embarque.
 *
 * Rien d'autre n'est touche. Le HTML et le CSS sont identiques entre le build
 * web et le build application : un seul code, un seul rendu. Ce theme n'a
 * aucun ilot.
 *
 * Idempotent : relancer le script sur un dossier deja traite ne change rien.
 */

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

if (!existsSync(DIST)) {
  console.error("app: aucun dossier dist. Lancez d'abord `pnpm build`.");
  process.exit(1);
}

/** Tous les .html du build, en profondeur. */
function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = htmlFiles(DIST);
let touched = 0;
let removed = 0;

for (const file of files) {
  const before = readFileSync(file, "utf8");

  const after = before
    // Le canonical designe le site public : hors sujet dans une application.
    .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, () => {
      removed++;
      return "";
    })
    // Le sitemap ne sert qu'aux moteurs de recherche.
    .replace(/[ \t]*<link rel="sitemap"[^>]*>\n?/g, () => {
      removed++;
      return "";
    })
    // Idem pour le flux : il pointe vers une URL en ligne.
    .replace(/[ \t]*<link rel="alternate" type="application\/rss\+xml"[^>]*>\n?/g, () => {
      removed++;
      return "";
    });

  if (after !== before) {
    writeFileSync(file, after);
    touched++;
  }
}

// Le manifeste, s'il existe, doit demarrer sur le bundle local.
const manifest = join(DIST, "manifest.webmanifest");
if (existsSync(manifest)) {
  const data = JSON.parse(readFileSync(manifest, "utf8"));
  if (data.start_url !== "./") {
    data.start_url = "./";
    data.scope = "./";
    writeFileSync(manifest, JSON.stringify(data, null, 2));
    console.log("app: manifeste ramene sur un demarrage local.");
  }
}

console.log(
  `app: ${files.length} page(s) inspectee(s), ${touched} modifiee(s), ${removed} balise(s) web retiree(s).`,
);
console.log("app: dist/ est pret pour `npx cap sync`.");
