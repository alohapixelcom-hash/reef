// validation-reef.selfcheck.ts - verifie les refus editoriaux avant toute ecriture GitHub.
import assert from "node:assert/strict";
import { validerReef } from "./validation-reef.ts";
import { identifiantValide, verifierConfiguration } from "./contrat.ts";

const refs = { auteurs: ["fr/lea"], sujets: ["fr/design"], images: ["../../../assets/covers/a.webp"] };
const fiche = { title: "Article", description: "Description", pubDate: "2026-09-15", author: "fr/lea", topic: "fr/design", draft: true };
assert.deepEqual(validerReef(fiche, "Corps", "fr", refs), []);
assert.deepEqual(validerReef({ ...fiche, author: "en/lea" }, "Corps", "fr", refs), ["author"]);
assert.deepEqual(validerReef({ ...fiche, topic: "fr/absent" }, "Corps", "fr", refs), ["topic"]);
assert.deepEqual(validerReef({ ...fiche, cover: "../../secret" }, "Corps", "fr", refs), ["cover", "coverAlt"]);
assert.deepEqual(validerReef({ ...fiche, pubDate: "invalide" }, "Corps", "fr", refs), ["pubDate"]);
assert.deepEqual(validerReef({ ...fiche, tags: [1] }, "Corps", "fr", refs), ["tags"]);
assert.deepEqual(validerReef({ ...fiche, draft: "false" }, "Corps", "fr", refs), ["draft"]);
assert.deepEqual(validerReef(fiche, "", "fr", refs), ["body"]);
assert.equal(identifiantValide("../autre-site"), false);
assert.equal(identifiantValide("article-francais"), true);
assert.throws(() => verifierConfiguration({ id: "reef", depot: "owner/repo", branche: "main", dossierArticles: "../secret", dossierAuteurs: "auteurs", dossierSujets: "sujets", dossierImages: "images", format: "reef", langues: ["fr"] }));
console.log("11 controles editoriaux passent : references, contenu, types et chemins.");
