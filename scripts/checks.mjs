#!/usr/bin/env node
// scripts/checks.mjs - lance les verifications de logique du depot, decouvertes par leur nom.
//
// POURQUOI LA DECOUVERTE PLUTOT QU'UNE LISTE
//
// AGENTS.md listait ses verifications a la main. Le jour ou une quatrieme est
// ecrite, il faut penser a modifier le document ; le jour ou on oublie, la
// definition de "fini" devient fausse et rien ne le signale. C'est le genre de
// derive qu'on ne voit jamais parce qu'elle ne casse rien. Ici, nommer le
// fichier suffit : `<quelque-chose>.selfcheck.ts` ou `<quelque-chose>.test.ts`
// sous src/, et il est pris.
//
// `astro check` type ces fichiers sans les executer, `astro build` ne les
// regarde pas : cette commande est la seule qui les fait tourner.
//
// Elles partent EN PARALLELE. Ce sont des verifications pures, sans etat
// partage, sans fichier ecrit, sans port ouvert : les serialiser ne protege de
// rien et fait payer le demarrage de Node une fois par fichier. La sortie,
// elle, reste rangee dans l'ordre alphabetique, parce qu'un rapport dont
// l'ordre change d'une execution a l'autre est illisible en comparaison.
//
// Par defaut on ne montre QUE ce qui a echoue. Une verification qui passe n'a
// rien a dire, et vingt-neuf lignes de "ok" cachent la seule qui compte.
// `pnpm test --tout` montre tout. Un argument libre filtre par nom de fichier.
import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SRC = new URL("../src/", import.meta.url);
const argv = process.argv.slice(2);
const verbose = argv.includes("--tout") || argv.includes("--all");
const filter = argv.find((a) => !a.startsWith("-"));

const entries = await readdir(SRC, { recursive: true });
const found = entries
  // readdir rend des chemins a antislash sous Windows ; le reste du fichier
  // raisonne en slash, donc on normalise une fois, ici.
  .map((entry) => entry.split("\\").join("/"))
  .filter((entry) => /\.(selfcheck|test)\.ts$/.test(entry))
  .filter((entry) => (filter ? entry.includes(filter) : true))
  .sort();

if (found.length === 0) {
  const raison = filter ? `aucune verification ne contient "${filter}"` : "aucune verification sous src/";
  console.error(`${raison}. Convention : <nom>.selfcheck.ts ou <nom>.test.ts.`);
  process.exit(1);
}

const run = (relative) =>
  new Promise((resolve) => {
    const started = Date.now();
    execFile(
      process.execPath,
      ["--experimental-strip-types", fileURLToPath(new URL(relative, SRC))],
      { maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) =>
        resolve({
          file: relative,
          ok: !error,
          ms: Date.now() - started,
          output: [stdout, stderr].filter(Boolean).join("").trimEnd(),
        }),
    );
  });

const results = await Promise.all(found.map(run));
const failed = results.filter((r) => !r.ok);

for (const r of results) {
  const mark = r.ok ? "ok  " : "ECHEC";
  console.log(`${mark} src/${r.file}  ${r.ms}ms`);
  if (r.output && (verbose || !r.ok)) {
    console.log(r.output.split("\n").map((line) => `       ${line}`).join("\n"));
  }
}

console.log(`\n${results.length - failed.length}/${results.length} verification(s) passee(s).`);
if (failed.length > 0) process.exit(1);
