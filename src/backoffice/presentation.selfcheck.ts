// presentation.selfcheck.ts - les liens de l'apercu ne deviennent pas des scripts.
import assert from "node:assert/strict";
import { apercu } from "./presentation.ts";
for (const href of ["javascript:alert", "JaVaScRiPt:alert", "data:text/html,test", "vbscript:msgbox", "//elsewhere.test", "&#106;avascript:alert", "https://safe.test/\\evil"]) {
  assert.equal(apercu(`[Lien](${href})`).includes("href="), false, href);
}
for (const href of ["https://example.test/", "http://example.test/", "/article/", "../article/", "./article/", "#titre"]) {
  assert.ok(apercu(`[Lien](${href})`).includes(`href="${href}"`), href);
}
assert.equal(apercu('<img src=x onerror="alert(1)">').includes("<img"), false);
assert.equal(apercu('[Lien](https://example.test/"onclick="x)').includes('"onclick="'), false);
console.log("15 controles d'apercu passent : protocoles, HTML et attributs.");
