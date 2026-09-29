// src/moteur/references.selfcheck.ts - verifie qu'une reference d'EmDash retrouve l'adresse de l'entree dans chaque langue, et qu'une valeur ancienne passe telle quelle.
import assert from "node:assert/strict";
import { adresseDeLaReference, ficheDe, indexer } from "./references.ts";

const index = indexer([
  { id: "G1", groupe: "G1", langue: "en", slug: "mara-lindqvist" },
  { id: "F1", groupe: "G1", langue: "fr", slug: "mara-lindqvist-fr" },
  { id: "G2", groupe: "G2", langue: "en", slug: "craft" },
  { id: "F3", groupe: "F3", langue: "fr", slug: "seulement-fr" },
  { id: "X", groupe: "X", langue: "en", slug: "" },
]);

let n = 0;
const egal = (a: unknown, b: unknown) => {
  assert.equal(a, b);
  n++;
};

// Le groupe, dans chaque langue.
egal(adresseDeLaReference("G1", "en", index), "mara-lindqvist");
egal(adresseDeLaReference("G1", "fr", index), "mara-lindqvist-fr");
// L'identifiant d'une version vaut son groupe.
egal(adresseDeLaReference("F1", "en", index), "mara-lindqvist");
// Une langue sans version : l'adresse anglaise, sinon une autre.
egal(adresseDeLaReference("G2", "fr", index), "craft");
egal(adresseDeLaReference("F3", "en", index), "seulement-fr");
// Une ancienne base range l'adresse : elle passe telle quelle.
egal(adresseDeLaReference("craft", "fr", index), "craft");
egal(adresseDeLaReference(" noor-benali ", "en", index), "noor-benali");
// Rien, ou une fiche sans adresse : rien a relier.
egal(adresseDeLaReference(undefined, "en", index), "");
egal(adresseDeLaReference("X", "en", index), "X");
// Les donnees d'une entree d'EmDash.
assert.deepEqual(ficheDe({ id: "A", translationGroup: "B", locale: "fr", slug: "s" }, "en"), { id: "A", groupe: "B", langue: "fr", slug: "s" });
n++;
assert.deepEqual(ficheDe(null, "en"), { id: "", groupe: "", langue: "en", slug: "" });
n++;

console.log(`references.selfcheck : ${n} verifications passees.`);
