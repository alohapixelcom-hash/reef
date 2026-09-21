// src/moteur/deployer/regles.selfcheck.ts - self-check des regles pures du bouton "Tout deployer".
// Lancer : node src/moteur/deployer/regles.selfcheck.ts
import assert from "node:assert/strict";
import { attente, DELAI_MS, heure, lireLeHook, secondes } from "./regles.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// La garde : un declenchement par minute.
const t0 = Date.UTC(2026, 8, 21, 19, 0, 0);
is(attente(null, t0), 0, "sans declenchement anterieur, la voie est libre");
is(attente(t0, t0), DELAI_MS, "au meme instant, il reste la minute entiere");
is(attente(t0, t0 + 17_700), 42_300, "apres 17,7 s, il reste 42,3 s");
is(attente(t0, t0 + DELAI_MS), 0, "a une minute pile, la voie est libre");
is(attente(t0, t0 + 10 * DELAI_MS), 0, "jamais d'attente negative");
is(secondes(42_300), "43 s", "l'attente s'arrondit vers le haut");
is(secondes(1), "1 s", "une milliseconde restante compte pour une seconde");
is(secondes(17_700, "bas"), "17 s", "le temps ecoule s'arrondit vers le bas");
is(
  Number.parseInt(secondes(17_700, "bas")) + Number.parseInt(secondes(DELAI_MS - 17_700)),
  60,
  "ecoule plus restant font une minute",
);

// Le hook : https, ou la machine locale en developpement seulement.
is(lireLeHook(undefined, false), { etat: "absent" }, "variable absente");
is(lireLeHook("   ", false), { etat: "absent" }, "variable vide");
is(lireLeHook("pas une adresse", false), { etat: "invalide" }, "valeur illisible");
is(
  lireLeHook(" https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/abc ", false),
  { etat: "pret", url: "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/abc" },
  "adresse https acceptee, espaces retires",
);
is(lireLeHook("http://api.cloudflare.com/hook", false), { etat: "invalide" }, "http refuse en production");
is(lireLeHook("http://127.0.0.1:4490/hook", false), { etat: "invalide" }, "machine locale refusee en production");
is(
  lireLeHook("http://127.0.0.1:4490/hook", true),
  { etat: "pret", url: "http://127.0.0.1:4490/hook" },
  "machine locale acceptee en developpement",
);
is(lireLeHook("http://exemple.test/hook", true), { etat: "invalide" }, "http distant refuse meme en developpement");
is(lireLeHook("ftp://127.0.0.1/hook", true), { etat: "invalide" }, "autre protocole refuse");

// L'heure : celle de Paris, ete comme hiver.
is(heure("2026-09-21T19:45:12.000Z"), "21 sept. 2026, 21:45:12", "heure d'ete : UTC plus deux");
is(heure("2026-12-01T08:05:00.000Z"), "1 déc. 2026, 09:05:00", "heure d'hiver : UTC plus un");
is(heure("n'importe quoi"), "n'importe quoi", "une date illisible est rendue telle quelle");

console.log(`regles.selfcheck : ${checks} verifications passees`);
