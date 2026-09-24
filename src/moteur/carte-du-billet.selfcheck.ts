// src/moteur/carte-du-billet.selfcheck.ts - self-check des regles de la carte de partage d'un billet, moteur allume.
// Lancer : node --experimental-strip-types src/moteur/carte-du-billet.selfcheck.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARTE, adresseDeLaCarte, cleDeLaCouverture, cleSure } from "./carte-du-billet.regles.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// Le format de la maison : celui des cartes de scripts/og.mjs.
is([CARTE.largeur, CARTE.hauteur], [1200, 630], "une carte fait 1200x630");
const og = readFileSync(new URL("../../scripts/og.mjs", import.meta.url), "utf8");
is(/const LARGEUR = 1200;/.test(og) && /const HAUTEUR = 630;/.test(og), true, "le meme format que scripts/og.mjs");

// Une couverture de la mediatheque, relative ou absolue, donne sa cle.
const cle = "01K5ZQ3V7T9M2J8R4X6B0C1D2E.webp";
is(cleDeLaCouverture(`/_emdash/api/media/file/${cle}`), cle, "adresse relative");
is(cleDeLaCouverture(`https://reef.alohapixel.app/_emdash/api/media/file/${cle}`), cle, "adresse absolue");
is(cleDeLaCouverture(`/_emdash/api/media/file/${cle}?v=2`), cle, "la requete ne fait pas partie de la cle");

// Toute autre adresse n'a pas de carte recadree : le billet garde la carte par defaut.
is(cleDeLaCouverture("/_astro/reef-mode-sombre.DydKXJ3j.webp"), undefined, "fichier du depot");
is(cleDeLaCouverture("https://images.example.com/photo.webp"), undefined, "image distante");
is(cleDeLaCouverture("/_emdash/api/media/file/"), undefined, "cle vide");
is(cleDeLaCouverture("/_emdash/api/media/file/dossier/photo.webp"), undefined, "une cle ne porte pas de barre");
is(cleDeLaCouverture("/_emdash/api/media/file/%2e%2e%2fsecret"), undefined, "une cle echappee est refusee");

// La route ne demande au stockage qu'une cle sure.
is(cleSure(cle), true, "cle de la mediatheque");
is(cleSure(undefined), false, "pas de cle");
is(cleSure("a/b"), false, "barre refusee");
is(cleSure(""), false, "vide refusee");

// L'adresse de la carte, et l'aller-retour avec la route injectee par moteur.config.mjs.
is(adresseDeLaCarte(cle), `/og/billet/${cle}.jpg`, "adresse de la carte");
const config = readFileSync(new URL("../../moteur.config.mjs", import.meta.url), "utf8");
is(config.includes('pattern: "/og/billet/[cle].jpg"'), true, "moteur.config.mjs injecte la route a cette adresse");

console.log(`carte-du-billet.selfcheck : ${checks} verifications passees.`);
