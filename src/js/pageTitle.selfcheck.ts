// src/js/pageTitle.selfcheck.ts - un titre court prend une signature de la marque sans depasser 60 caracteres, un titre trop long perd la marque, une signature sans la marque ne sert jamais. Lancer : node src/js/pageTitle.selfcheck.ts
import assert from "node:assert/strict";
import { pageTitle } from "./pageTitle.ts";

let n = 0;
const is = (vu: string, attendu: string): void => {
  assert.equal(vu, attendu);
  n += 1;
};
const sigs = ["Onda: invoicing that chases until it gets paid", "Onda, invoicing that gets paid"];
is(pageTitle("Legal", "Onda", " | ", sigs), "Legal | Onda: invoicing that chases until it gets paid");
is(pageTitle("Legal notice", "Onda", " | ", sigs), "Legal notice | Onda, invoicing that gets paid");
is(pageTitle("About Onda", "Onda", " | ", sigs), "About Onda | Invoicing that chases until it gets paid");
is(pageTitle("A title long enough to stay as it is", "Onda", " | ", sigs), "A title long enough to stay as it is | Onda");
is(pageTitle(sigs[0], "Onda", " | ", sigs), sigs[0]);
is(pageTitle("Legal notice", "Marea", " | ", sigs), "Legal notice | Marea");
is(pageTitle("Des boucles de retour sur le prix qui se referment vraiment", "Lagoon", " | ", []), "Des boucles de retour sur le prix qui se referment vraiment");
is(pageTitle("A title of sixty-one characters that cannot stand alone here!!", "Onda", " | ", sigs), "A title of sixty-one characters that cannot stand alone here!! | Onda");
is(pageTitle("A very very long product name that fills the line", "Onda", " | ", sigs), "A very very long product name that fills the line | Onda");
is(pageTitle("Legal", "", " | ", sigs), "Legal | ");
console.log(`pageTitle.selfcheck : ${n} titres comme attendu`);
