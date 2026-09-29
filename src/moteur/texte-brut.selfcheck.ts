// src/moteur/texte-brut.selfcheck.ts - self-check du texte brut (generique) : un champ vide, nul ou mal forme ne fait jamais tomber une page.
import assert from "node:assert/strict";
import { texteBrut, texteDuBlocBrut } from "./texte-brut.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

is(texteBrut(null), "", "null (billet publie sans texte) : rien, pas d'exception");
is(texteBrut(undefined), "", "undefined : rien");
is(texteBrut([]), "", "liste vide : rien");
is(texteBrut("texte"), "", "une chaine n'est pas un texte riche");
is(texteBrut([null, { children: null }, { children: [{ text: null }] }]), "\n\n", "blocs nuls sautes, morceaux manquants vides");
is(texteBrut([{ children: [{ text: "Bonjour" }, { text: " le monde" }] }, { children: [{ text: "Suite" }] }]), "Bonjour le monde\n\nSuite", "deux blocs");
is(
  texteBrut([{ _type: "code", code: "x = 1" }], (b: { _type?: string; code?: unknown; children?: { text?: unknown }[] }) => (b._type === "code" ? String(b.code ?? "") : texteDuBlocBrut(b))),
  "x = 1",
  "le theme passe sa lecture d'un bloc (le code de Reef)",
);

console.log(`texte-brut.selfcheck : ${checks} verifications passees.`);
