// src/moteur/ordre-des-blocs.selfcheck.ts - self-check de l'ordre des blocs (generique) : sans place l'ordre du theme, une place deplace un bloc, egalites et valeurs illisibles.
import assert from "node:assert/strict";
import { ordreDesBlocs, placeLue } from "./ordre-des-blocs.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

const theme = ["tete", "une", "notes", "sujets", "lettre"] as const;
const avec = (places: Record<string, unknown>) => (bloc: string) => (bloc in places ? { order: places[bloc] } : {});

is(ordreDesBlocs(theme, () => ({})), [...theme], "aucune place : l'ordre du theme");
is(ordreDesBlocs(theme, avec({ lettre: 1 })), ["lettre", "tete", "une", "notes", "sujets"], "1 met le bloc tout en haut");
is(ordreDesBlocs(theme, avec({ tete: 5 })), ["une", "notes", "sujets", "tete", "lettre"], "5 : le bloc place passe devant le cinquieme du theme");
is(ordreDesBlocs(theme, avec({ tete: 99 })), ["une", "notes", "sujets", "lettre", "tete"], "99 : tout en bas");
is(ordreDesBlocs(theme, avec({ sujets: 2, notes: 2 })), ["tete", "notes", "sujets", "une", "lettre"], "deux places egales : l'ordre du theme departage, devant le bloc sans place");
is(ordreDesBlocs(theme, avec({ tete: 5, une: 4, notes: 3, sujets: 2, lettre: 1 })), ["lettre", "sujets", "notes", "une", "tete"], "l'ordre renverse");
is(ordreDesBlocs(theme, avec({ lettre: "1" })), ["lettre", "tete", "une", "notes", "sujets"], "une place ecrite en texte");
for (const illisible of [0, -1, 1.5, "deux", "", null, true, 100]) {
  is(ordreDesBlocs(theme, avec({ lettre: illisible })), [...theme], `place illisible (${String(illisible)}) : le bloc reste a sa place`);
}
is(placeLue(" 3 "), 3, "espaces autour");
is(new Set(ordreDesBlocs(theme, avec({ une: 1, tete: 1, lettre: 1 }))).size, theme.length, "chaque bloc une fois");

console.log(`ordre-des-blocs.selfcheck : ${checks} verifications`);
