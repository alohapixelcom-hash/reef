// scripts/covers.selfcheck.mjs - verifie le cache et la preservation des images sans reseau.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = mkdtempSync(join(tmpdir(), "reef-covers-check-"));
try {
  mkdirSync(join(root, "scripts"));
  copyFileSync(new URL("./covers.mjs", import.meta.url), join(root, "scripts/covers.mjs"));
  const manifest = (url) => writeFileSync(join(root, "scripts/covers.json"), JSON.stringify({
    "cover.webp": { url, minWidth: 1200 },
  }));
  const valid = Buffer.alloc(30);
  valid.write("RIFF", 0); valid.write("WEBP", 8); valid.write("VP8X", 12);
  valid.writeUIntLE(1199, 24, 3);
  writeFileSync(join(root, "fixture.webp"), valid);
  writeFileSync(join(root, "fetch.mjs"), `
    import { readFileSync, appendFileSync } from 'node:fs';
    globalThis.fetch = async (url) => {
      appendFileSync('requests.txt', url + '\\n');
      return new Response(readFileSync('fixture.webp'));
    };
  `);
  const run = (...args) => execFileSync(process.execPath, ["--import", join(root, "fetch.mjs"), join(root, "scripts/covers.mjs"), ...args], { cwd: root, encoding: "utf8", stdio: "pipe" });
  const count = () => readFileSync(join(root, "requests.txt"), "utf8").trim().split("\n").length;
  manifest("https://images.example.test/a.webp");
  run(); assert.equal(count(), 1);
  run(); assert.equal(count(), 1, "article-only rebuild must not fetch images again");
  run("--refresh"); assert.equal(count(), 2);
  manifest("https://images.example.test/b.webp");
  run(); assert.equal(count(), 3, "new URL must invalidate the cache");
  writeFileSync(join(root, "src/assets/cover.webp"), Buffer.from("corrupted"));
  run(); assert.equal(count(), 4, "corrupted local data must be repaired");
  writeFileSync(join(root, "fixture.webp"), "<html>upstream error</html>");
  run("--refresh");
  assert.deepEqual(readFileSync(join(root, "src/assets/cover.webp")), valid, "invalid response must not overwrite a valid image");
  rmSync(join(root, "src/assets/cover.webp"));
  assert.throws(() => run(), "invalid data without a fallback must fail the build");
  console.log("Cache images : reutilisation, rafraichissement, URL, corruption et reponse invalide verifies.");
} finally {
  rmSync(root, { recursive: true, force: true });
}
