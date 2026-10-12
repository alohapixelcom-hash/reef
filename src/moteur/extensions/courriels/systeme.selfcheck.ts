// src/moteur/extensions/courriels/systeme.selfcheck.ts - self-check des courriels du back office reecrits en francais.
// Lancer : node --experimental-strip-types src/moteur/extensions/courriels/systeme.selfcheck.ts
import assert from "node:assert/strict";
import { courrielDuBackOffice } from "./noyau/systeme.ts";

let checks = 0;
const lien = "https://exemple.fr/_emdash/api/auth/magic-link/verify?token=abc123";

const connexion = courrielDuBackOffice(
  "Sign in to maison exemple",
  `Click this link to sign in to maison exemple:\n\n${lien}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
);
assert.ok(connexion);
assert.equal(connexion.sujet, "Votre lien de connexion à maison exemple");
assert.ok(connexion.texte.includes(lien) && connexion.html.includes(lien.replace(/&/g, "&amp;")), "le lien est garde, tel quel");
assert.ok(!/sign in|click/i.test(connexion.texte), "plus un mot d'anglais");
checks += 4;

const invitation = courrielDuBackOffice("You've been invited to maison exemple", `You've been invited to join maison exemple.\n\nClick this link to create your account:\n${lien}\n\nThis link expires in 7 days.`);
assert.equal(invitation?.sujet, "Votre accès au back office de maison exemple");
assert.ok(invitation?.texte.includes("7 jours"));
checks += 2;

const verification = courrielDuBackOffice("Verify your email for maison exemple", `Click this link to verify your email and create your account:\n\n${lien}\n\nThis link expires in 15 minutes.`);
assert.equal(verification?.sujet, "Confirmez votre adresse pour maison exemple");
checks++;

assert.equal(courrielDuBackOffice("Nouveau message du site", `Bonjour ${lien}`), null, "un autre courriel passe tel quel");
assert.equal(courrielDuBackOffice("Sign in to maison exemple", "sans lien"), null, "sans lien, rien n'est reecrit");
assert.ok(!courrielDuBackOffice("Sign in to <b>x</b>", lien)!.html.includes("<b>"), "le nom du site est echappe dans le HTML");
checks += 3;

console.log(`${checks} verifications des courriels du back office : ok`);
