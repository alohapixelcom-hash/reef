// src/moteur/qualite-image.selfcheck.ts - self-check de la qualite des images rendues a la demande : les defauts de sharp installe, et rien d'ecrase.
// Lancer : node --experimental-strip-types src/moteur/qualite-image.selfcheck.ts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { QUALITE_DU_BUILD, avecQualiteDuBuild } from "./qualite-image.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// LA TABLE SUIT SHARP, ET NON L'INVERSE. Le build statique encode par sharp
// sans qualite declaree : ce sont ses defauts, lus sur la version installee,
// qui font foi. Une montee de version qui les change fait echouer ce test.
const sharp = createRequire(import.meta.url)("sharp") as () => { options: Record<string, unknown> };
const defauts = sharp().options;
is(QUALITE_DU_BUILD.webp, defauts.webpQuality, "webp : le defaut de sharp");
is(QUALITE_DU_BUILD.jpeg, defauts.jpegQuality, "jpeg : le defaut de sharp");
is(QUALITE_DU_BUILD.jpg, defauts.jpegQuality, "jpg : le defaut de sharp");
is(QUALITE_DU_BUILD.avif, defauts.heifQuality, "avif : le defaut de sharp (heif)");

/** La qualite retenue pour des options donnees. */
const qualite = (options: { format?: string; quality?: unknown }): unknown => avecQualiteDuBuild(options).quality;

// Une image sans qualite recoit celle du build, format par format.
is(avecQualiteDuBuild({ format: "webp", width: 1440 }), { format: "webp", width: 1440, quality: 80 }, "webp sans qualite");
is(qualite({ format: "avif" }), 50, "avif sans qualite");
is(qualite({ format: "jpeg" }), 80, "jpeg sans qualite");
is(qualite({ format: "webp", quality: "" }), 80, "une qualite vide vaut une absence");

// Ce qui est declare reste declare.
is(qualite({ format: "webp", quality: 60 }), 60, "une qualite chiffree n'est pas ecrasee");
is(qualite({ format: "avif", quality: "high" }), "high", "une qualite nommee n'est pas ecrasee");

// Un format sans defaut connu, ou pas de format : rien n'est ajoute.
is("quality" in avecQualiteDuBuild({ format: "png" }), false, "png : pas de qualite inventee");
is("quality" in avecQualiteDuBuild({ format: "svg" }), false, "svg : pas de qualite inventee");
is("quality" in avecQualiteDuBuild({}), false, "sans format : rien");

// L'objet recu n'est pas modifie.
const entree = { format: "webp" };
avecQualiteDuBuild(entree);
is("quality" in entree, false, "l'objet recu reste intact");

console.log(`qualite-image.selfcheck : ${checks} verifications passees.`);
