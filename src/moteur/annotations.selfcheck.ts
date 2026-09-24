// src/moteur/annotations.selfcheck.ts - self-check des annotations d'edition : les vrais proxys d'EmDash, l'attribut rendu par Astro en edition, rien hors edition.
// Lancer : node --experimental-strip-types src/moteur/annotations.selfcheck.ts
import assert from "node:assert/strict";
import { spreadAttributes } from "astro/runtime/server/index.js";
import { createEditable, createNoop } from "emdash";
import { REF, annotationDe, estEditable } from "./annotations.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// Ce qu'Astro ecrit dans la balise pour `<h1 {...objet}>` : la meme fonction
// que le code compile d'un gabarit appelle.
const html = (attributs: Record<string, unknown>): string => String(spreadAttributes(attributs));

// --- Mode edition : le proxy que getEmDashCollection pose sur chaque entree ---
const edition = createEditable("posts", "01K5BILLET", { status: "published", hasDraft: true });
const entree = annotationDe(edition);
is(JSON.parse(entree[REF] ?? "{}"), { collection: "posts", id: "01K5BILLET", status: "published", hasDraft: true }, "l'entree porte collection, id et statut, que la barre lit sur la premiere balise annotee");
is(JSON.parse(annotationDe(edition, "title")[REF] ?? "{}"), { collection: "posts", id: "01K5BILLET", status: "published", hasDraft: true, field: "title" }, "un champ porte en plus son nom");
is(JSON.parse(annotationDe(edition, "cover")[REF] ?? "{}").field, "cover", "la couverture est un champ comme un autre");
is(estEditable(edition), true, "le proxy du mode edition est reconnu");
is(html(annotationDe(edition, "title")).startsWith(` ${REF}="{&quot;collection&quot;:&quot;posts&quot;`), true, "Astro ecrit l'attribut, guillemets echappes");
is(JSON.parse(html(annotationDe(edition)).replace(/^ data-emdash-ref="(.*)"$/, "$1").replaceAll("&quot;", '"')).id, "01K5BILLET", "l'attribut rendu se relit tel que la barre le relit (JSON.parse)");

// --- Hors edition : le proxy muet d'EmDash, et le billet d'un fichier -------
const muet = createNoop();
is(annotationDe(muet), {}, "visiteur anonyme : aucune annotation d'entree");
is(annotationDe(muet, "title"), {}, "visiteur anonyme : aucune annotation de champ");
is(estEditable(muet), false, "le proxy muet n'est pas editable");
is(html(annotationDe(muet, "title")), "", "visiteur anonyme : Astro n'ecrit rien dans la balise");
is(annotationDe(undefined), {}, "moteur eteint : un billet de fichier n'a pas de proxy");
is(annotationDe(undefined, "title"), {}, "moteur eteint : aucun champ annote");
is(html(annotationDe(undefined)), "", "moteur eteint : la balise reste celle du build statique");

// --- Formes inattendues : jamais d'exception dans un gabarit ----------------
is(annotationDe(null, "title"), {}, "null ne casse rien");
is(annotationDe({ [REF]: 42 }), {}, "une valeur qui n'est pas du texte est ignoree");
is(annotationDe({ title: "pas un objet" }, "title"), {}, "un champ d'une autre forme est ignore");
is(annotationDe({ [REF]: "" }), {}, "une annotation vide n'est pas ecrite");

console.log(`annotations.selfcheck: ${checks} verifications passees`);
