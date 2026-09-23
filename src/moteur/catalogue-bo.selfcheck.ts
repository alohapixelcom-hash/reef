// src/moteur/catalogue-bo.selfcheck.ts - la preuve que le back office ne parle plus anglais, et que le dictionnaire ne traine rien d'inutile.
//
// PIECE DU SOCLE (voir en tete de catalogue-bo.ts).
// Lancer : node --experimental-strip-types src/moteur/catalogue-bo.selfcheck.ts
//
// Il lit les VRAIS catalogues du moteur (ceux du paquet installe), pas une
// copie. Trois exigences, dans cet ordre :
//   1. couverture : aucun message laisse en anglais par EmDash n'echappe au
//      dictionnaire, ni par une traduction, ni par la liste des identiques ;
//   2. proprete : aucune entree morte, c'est-a-dire aucune cle qui ne
//      corresponde plus a un message du catalogue anglais ;
//   3. effet : le catalogue complete rend bien du francais sur les libelles
//      que la maison surveille.
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { cheminDuCatalogueDuMoteur } from "./catalogue-bo.config.mjs";
import { catalogueComplete, entreesMortes, messagesEnAnglais, texteSimple, type Catalogue } from "./catalogue-bo.regles.ts";
import { DICTIONNAIRE } from "./catalogue-bo.fr.ts";

// Le dossier des catalogues du paquet d'administration, trouve exactement
// comme la configuration du site le trouve : depuis emdash.
const dossier = `${pathToFileURL(dirname(cheminDuCatalogueDuMoteur(import.meta.url))).href}/`;
const anglais = ((await import(`${dossier}en/messages.mjs`)) as { messages: Catalogue }).messages;
const francais = ((await import(`${dossier}fr/messages.mjs`)) as { messages: Catalogue }).messages;

const total = Object.keys(anglais).length;
const restesDuMoteur = Object.keys(anglais).filter(
  (identifiant) => JSON.stringify(francais[identifiant]) === JSON.stringify(anglais[identifiant]),
).length;

// 1. Couverture.
const manquants = messagesEnAnglais(francais, anglais, DICTIONNAIRE);
assert.deepEqual(
  manquants,
  [],
  `${manquants.length} messages restent en anglais et ne sont dans aucune liste :\n  ${manquants.slice(0, 20).join("\n  ")}`,
);

// 2. Proprete.
const mortes = entreesMortes(francais, anglais, DICTIONNAIRE);
assert.deepEqual(
  mortes,
  [],
  `${mortes.length} entrees du dictionnaire ne correspondent plus a rien (EmDash a reformule ou traduit) :\n  ${mortes.slice(0, 20).join("\n  ")}`,
);

// 3. Effet : les libelles que la maison ne veut pas voir en anglais.
const complete = catalogueComplete(francais, anglais, DICTIONNAIRE);
const surveilles = ["Categories", "Tags", "Widgets", "Publish now", "Publish changes", "Used in", "Folders", "Byline"];
for (const anglaisSurveille of surveilles) {
  const identifiants = Object.keys(anglais).filter((cle) => texteSimple(anglais[cle]) === anglaisSurveille);
  assert.ok(identifiants.length > 0, `le message "${anglaisSurveille}" n'existe plus dans le catalogue du moteur`);
  for (const identifiant of identifiants) {
    const rendu = texteSimple(complete[identifiant]);
    assert.notEqual(rendu, anglaisSurveille, `"${anglaisSurveille}" sort encore en anglais (${identifiant})`);
    assert.ok(rendu !== null && rendu.length > 0, `"${anglaisSurveille}" ne rend rien (${identifiant})`);
  }
}

// Aucun message du catalogue complete ne doit avoir disparu ni changer de forme.
assert.equal(Object.keys(complete).length, total, "le catalogue complete a perdu ou gagne des messages");

console.log(
  `catalogue-bo.selfcheck: ${total} messages, ${restesDuMoteur} laisses en anglais par EmDash 0.38, ` +
    `${Object.keys(DICTIONNAIRE.simples).length + Object.keys(DICTIONNAIRE.composes).length} traduits par la maison, ` +
    `${DICTIONNAIRE.identiques.length} identiques en francais, ` +
    `${Object.keys(DICTIONNAIRE.maison.simples).length + Object.keys(DICTIONNAIRE.maison.composes).length} mots de la maison. Aucun reste anglais.`,
);
