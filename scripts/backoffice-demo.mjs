// scripts/backoffice-demo.mjs - donnees publiques de demonstration, uniquement les articles publies.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseFrontmatter } from "../src/backoffice/frontmatter.ts";
if (process.env.ALOHA_BACKOFFICE !== "1") {
  const result = {};
  for (const lang of ["fr", "en"]) {
    const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
    const directory = name => new URL(`../src/data/${name}/${lang}/`, import.meta.url);
    const categories = readdirSync(directory("topics")).filter(f => f.endsWith(".json")).map(f => ({ slug: f.slice(0, -5), sha: "demo", frontmatter: read(`src/data/topics/${lang}/${f}`) }));
    const authors = readdirSync(directory("authors")).filter(f => f.endsWith(".json")).map(f => ({ id: `${lang}/${f.slice(0, -5)}`, data: read(`src/data/authors/${lang}/${f}`) }));
    const items = readdirSync(directory("posts")).filter(f => /\.mdx?$/.test(f)).map(f => ({ slug: f.replace(/\.mdx?$/, ""), sha: "demo", ...parseFrontmatter(readFileSync(new URL(f, directory("posts")), "utf8")) })).filter(item => item.frontmatter.draft !== true);
    result[lang] = { items, categories, references: { auteurs: authors.map(a => a.id), sujets: categories.map(c => `${lang}/${c.slug}`), images: [...new Set(items.map(item => item.frontmatter.cover).filter(Boolean))], libelles: Object.fromEntries([...authors.map(a => [a.id, a.data.name]), ...categories.map(c => [`${lang}/${c.slug}`, c.frontmatter.name])]) } };
  }
  const target = new URL("../dist/secret-spot/", import.meta.url); mkdirSync(target, { recursive: true });
  writeFileSync(new URL("demo.json", target), JSON.stringify(result));
}
