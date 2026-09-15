// scripts/backoffice-manifest.mjs - preuve des sources reellement presentes dans cette construction.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
if (process.env.ALOHA_BACKOFFICE === "1") {
  const articles = {};
  for (const locale of ["fr", "en"]) {
    const directory = new URL(`../src/data/posts/${locale}/`, import.meta.url);
    for (const file of readdirSync(directory).filter(file => /\.mdx?$/.test(file))) {
      const bytes = readFileSync(new URL(file, directory));
      // Le SHA GitHub est celui d'un blob Git : l'en-tete fait partie du hash.
      articles[`${locale}/${file.replace(/\.mdx?$/, "")}`] = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    }
  }
  const target = new URL("../dist/secret-spot/", import.meta.url);
  mkdirSync(target, { recursive: true });
  writeFileSync(new URL("build.json", target), JSON.stringify({ builtAt: new Date().toISOString(), articles }));
  console.log(`Back office : ${Object.keys(articles).length} empreintes de publication.`);
}
