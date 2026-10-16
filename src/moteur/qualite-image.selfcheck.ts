// src/moteur/qualite-image.selfcheck.ts - self-check de la qualite des images rendues a la demande : les defauts de sharp installe, et rien d'ecrase.
// Lancer : node --experimental-strip-types src/moteur/qualite-image.selfcheck.ts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { PLANCHER_HD, QUALITE_DU_BUILD, avecQualiteDuBuild, avecQualiteHD } from "./qualite-image.ts";

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

// Le plancher HD des images rendues a la demande.
const hd = (options: { format?: string; quality?: unknown }): unknown => avecQualiteHD(options).quality;
is(hd({ format: "webp" }), 85, "webp sans qualite : le plancher");
is(hd({ format: "avif" }), 80, "avif sans qualite : le plancher");
is(hd({ format: "webp", quality: 75 }), 85, "une qualite basse remonte au plancher");
is(hd({ format: "avif", quality: 50 }), 80, "avif 50 remonte a 80");
is(hd({ format: "webp", quality: "60" }), 85, "une qualite chiffree en texte remonte aussi");
is(hd({ format: "webp", quality: 92 }), 92, "une qualite plus haute reste la sienne");
is(hd({ format: "avif", quality: "high" }), "high", "une qualite nommee reste la sienne");
is("quality" in avecQualiteHD({ format: "png" }), false, "png : pas de qualite inventee");
is(Object.values(PLANCHER_HD).every((v) => v >= 80), true, "aucun plancher sous 80");
for (const f of ["webp", "jpeg", "jpg", "avif"]) is(PLANCHER_HD[f] >= QUALITE_DU_BUILD[f], true, `${f} : le plancher n'est jamais sous le build`);
const e2 = { format: "webp", quality: 60 };
avecQualiteHD(e2);
is(e2.quality, 60, "l'objet recu reste intact (plancher)");

console.log(`qualite-image.selfcheck : ${checks} verifications passees.`);
