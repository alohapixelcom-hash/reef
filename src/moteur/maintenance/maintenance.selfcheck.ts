// src/moteur/maintenance/maintenance.selfcheck.ts - self-check de l'extension "Maintenance" : les noms d'options que relit le frontal, la validation des reglages, la page composee dans les deux langues, sans mot technique ni tiret interdit.
// Lancer : node --experimental-strip-types src/moteur/maintenance/maintenance.selfcheck.ts
import assert from "node:assert/strict";
import { ACTION_ENREGISTRER, composer } from "./page.ts";
import { CHEMIN_DE_LA_PAGE, estFerme, OPTION, OPTION_DES_REGLAGES, REGLAGES_VIDES, reglagesLus, SaisieRefusee, validerLesReglages } from "./regles.ts";
import { EN } from "./textes.en.ts";
import { FR } from "./textes.fr.ts";

// Les noms que frontal/src/frontal/maintenance.ts relit (OPTION_DE_MAINTENANCE, OPTION_DES_REGLAGES).
assert.equal(OPTION, "plugin:aloha-maintenance:actif");
assert.equal(OPTION_DES_REGLAGES, "plugin:aloha-maintenance:reglages");
assert.equal(CHEMIN_DE_LA_PAGE, "/maintenance-du-site/");
assert.equal(estFerme(true), true);
for (const autre of [false, null, undefined, "true", 1]) assert.equal(estFerme(autre), false);

// La validation : bornes, date, media de la mediatheque seulement.
const permis = { images: ["IMG1"], videos: ["VID1"] };
const ok = validerLesReglages({ titre: "  Pause  ", sousTitre: "Bientôt", fond: "video", video: "VID1", retour: "2026-10-20T00:00:00.000Z" }, permis, FR.erreurs);
assert.deepEqual(ok, { titre: "Pause", sousTitre: "Bientôt", fond: "video", image: null, video: "VID1", retour: "2026-10-20" });
assert.equal(validerLesReglages({ fond: "gif" }, permis, FR.erreurs).fond, "aucun");
for (const [valeurs, message] of [
  [{ titre: "x".repeat(121) }, FR.erreurs.titreLong],
  [{ sousTitre: "x".repeat(401) }, FR.erreurs.sousTitreLong],
  [{ retour: "demain" }, FR.erreurs.dateIllisible],
  [{ image: "AUTRE" }, FR.erreurs.mediaInconnu],
] as const) {
  assert.throws(() => validerLesReglages(valeurs, permis, FR.erreurs), (e: unknown) => e instanceof SaisieRefusee && e.message === message);
}
assert.deepEqual(reglagesLus("nimporte"), REGLAGES_VIDES);

const TECHNIQUES = /\b(cache|caches|Worker|Workers|Cloudflare|503|kv|option|serveur|server|HTTP|frontal|EmDash)\b/i;
const TIRETS = [0x2014, 0x2013].map((c) => String.fromCharCode(c));
const textes = (valeur: unknown): string[] =>
  typeof valeur === "string" ? [valeur] : valeur && typeof valeur === "object" ? Object.values(valeur).flatMap(textes) : [];
const forme = (v: unknown): unknown => (v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forme(x)])) : typeof v);

for (const [nom, T] of [["fr", FR], ["en", EN]] as const) {
  assert.deepEqual(forme(T), forme(FR), `${nom} a la forme du francais`);
  for (const texte of textes(T)) {
    assert.ok(!TECHNIQUES.test(texte), `${nom} parle technique au client : « ${texte} »`);
    assert.ok(!TIRETS.some((t) => texte.includes(t)), `${nom} porte un tiret interdit : « ${texte} »`);
  }
  const vide = composer(T, { ferme: false, reglages: REGLAGES_VIDES, images: [], videos: [] });
  const formulaire = vide.blocks.find((b) => b.type === "form");
  assert.ok(formulaire && formulaire.type === "form" && formulaire.submit.action_id === ACTION_ENREGISTRER);
  assert.ok(formulaire.fields[0]?.type === "toggle" && formulaire.fields[0].initial_value === false, "l'interrupteur en tete");
  assert.ok(!formulaire.fields.some((f) => f.type === "select"), "aucune liste vide");
  assert.ok(vide.blocks.some((b) => b.type === "context" && b.text === T.sansImage) && vide.blocks.some((b) => b.type === "context" && b.text === T.sansTitre));
  assert.equal(vide.toast, undefined);
  const plein = composer(T, { ferme: true, reglages: ok, images: [{ id: "IMG1", nom: "plage.webp" }], videos: [{ id: "VID1", nom: "vagues.mp4" }] }, "ferme");
  const f2 = plein.blocks.find((b) => b.type === "form");
  assert.ok(f2 && f2.type === "form");
  const video = f2.fields.find((f) => f.action_id === "video");
  assert.ok(video && video.type === "select" && video.initial_value === "VID1" && video.condition?.eq === "video", "la liste des videos, conditionnee au choix du fond");
  assert.ok(plein.blocks.some((b) => b.type === "banner" && b.variant === "alert"));
  assert.ok(plein.blocks.some((b) => b.type === "fields" && b.fields.some((x) => x.value === "vagues.mp4")), "le recapitulatif nomme le media");
  assert.equal(plein.toast?.message, T.toastFerme);
  assert.equal(composer(T, { ferme: false, reglages: ok, images: [], videos: [] }, "rouvert").toast?.message, T.toastOuvert);
  const refus = composer(T, { ferme: false, reglages: ok, images: [], videos: [] }, { erreur: T.erreurs.titreLong });
  assert.equal(refus.toast?.type, "error");
}

console.log("maintenance.selfcheck : options, validation, interrupteur, formulaire en francais et en anglais : tout passe.");
