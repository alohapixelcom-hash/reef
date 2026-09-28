// src/moteur/contenu.selfcheck.ts - self-check des textes rediges : chaque chemin existe, la graine dit ce que disent les fichiers, et la base posee sur les fichiers rend les fichiers.
// Lancer : node --experimental-strip-types src/moteur/contenu.selfcheck.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { type DonneesDeSection, extraireLaSection, lire, SECTIONS, type Textes, textesAvecLaBase } from "./contenu.ts";
import { chargerLesTextes } from "./textes.node.mjs";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

const textes = (await chargerLesTextes()) as Record<string, Textes>;
const langues = Object.keys(textes);
type Champ = { slug: string; type: string; validation?: { subFields?: { slug: string }[]; options?: string[] } };
type Entree = { id: string; slug: string; locale: string; translationOf?: string; status: string; data: DonneesDeSection };
const graine = JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8")) as {
  collections: { slug: string; fields: Champ[] }[];
  content: { sections?: Entree[] };
};
const collection = graine.collections.find((c) => c.slug === "sections");
assert.ok(collection, "la graine declare la collection sections");
const champs = new Map(collection.fields.map((f) => [f.slug, f]));

// 1. Chaque chemin de la table existe dans les deux langues, chaque champ nomme
//    existe dans la graine, et aucun texte n'est porte par deux sections : une
//    faute de frappe ou un doublon ne se tairaient pas.
const slugs = new Set<string>();
const chemins = new Set<string>();
for (const section of SECTIONS) {
  assert.ok(!slugs.has(section.slug), `slug en double : ${section.slug}`);
  slugs.add(section.slug);
  assert.ok(champs.get("page")?.validation?.options?.includes(section.page), `${section.slug} : page "${section.page}" absente des options de la graine`);
  const tous: [string, string][] = Object.entries(section.champs);
  if (section.arguments) tous.push(["arguments", section.arguments.liste]);
  for (const [champ, chemin] of tous) {
    assert.ok(champs.has(champ), `${section.slug} : champ ${champ} absent de la graine`);
    assert.ok(!chemins.has(chemin), `${chemin} porte par deux sections`);
    chemins.add(chemin);
    for (const langue of langues) {
      const valeur = lire(textes[langue], chemin);
      assert.ok(champ === "arguments" ? Array.isArray(valeur) : typeof valeur === "string", `${section.slug} : ${chemin} absent ou d'une autre forme en ${langue}`);
    }
  }
  if (section.arguments) {
    const sous = new Set(champs.get("arguments")?.validation?.subFields?.map((s) => s.slug));
    const noms = "texte" in section.arguments ? [section.arguments.texte] : Object.keys(section.arguments.cles);
    for (const nom of noms) assert.ok(sous.has(nom), `${section.slug} : sous-champ arguments.${nom} absent de la graine`);
  }
}
checks += 1;

// 2. La graine porte une entree publiee par section et par langue, la
//    traduction rattachee a l'anglais, et ses donnees sont EXACTEMENT celles
//    des fichiers (node scripts/graine-sections.mjs la remet d'accord).
const entrees = graine.content.sections ?? [];
is(entrees.length, SECTIONS.length * langues.length, "une entree par section et par langue, rien de plus");
for (const section of SECTIONS) {
  for (const langue of langues) {
    const entree = entrees.find((e) => e.slug === section.slug && e.locale === langue);
    assert.ok(entree, `graine : ${section.slug} absente en ${langue}`);
    is(entree.status, "published", `graine : ${section.slug} (${langue}) publiee`);
    is(entree.translationOf, langue === "en" ? undefined : `sections-${section.slug}-en`, `graine : ${section.slug} (${langue}) rattachee a l'anglais`);
    is(entree.data, extraireLaSection(section, textes[langue]), `graine : ${section.slug} (${langue}) dit ce que disent les fichiers (node scripts/graine-sections.mjs)`);
  }
}

// 3. L'aller-retour : la graine posee sur les fichiers rend exactement les
//    fichiers, et les fichiers eux-memes ne sont pas touches.
for (const langue of langues) {
  const avant = structuredClone(textes[langue]);
  const base = new Map(entrees.filter((e) => e.locale === langue).map((e) => [e.slug, e.data]));
  is(textesAvecLaBase(textes[langue], base), textes[langue], `${langue} : la graine posee sur les fichiers rend les fichiers`);
  is(textes[langue], avant, `${langue} : les fichiers ne sont pas modifies`);
}

// 4. Ce que la base change, et ce qu'elle laisse aux fichiers.
const en = textes.en;
const avec = (slug: string, donnees: DonneesDeSection) => textesAvecLaBase(en, new Map([[slug, donnees]]));
is(avec("hero", { title: "Un autre titre" }).home.heroTitle, "Un autre titre", "un titre publie remplace celui des fichiers");
is(avec("hero", { title: "Un autre titre" }).home.heroLede, en.home.heroLede, "un champ absent garde le texte des fichiers");
is(avec("hero", { title: "", lede: null }).home.heroTitle, en.home.heroTitle, "un champ vide garde le texte des fichiers");
is(textesAvecLaBase(en, new Map()), en, "aucune section publiee : les fichiers tels quels");
is(avec("hero", { arguments: [{ title: "billets" }, {}] }).home.heroLedger, ["billets", en.home.heroLedger[1]], "une liste publiee remplace celle des fichiers ; une ligne vide garde la sienne");
is(avec("hero", { arguments: [] }).home.heroLedger, en.home.heroLedger, "une liste vide garde celle des fichiers");
is(
  avec("a-propos-regles", { arguments: [{ title: "Une regle", body: "Son texte" }] }).about.values,
  [{ title: "Une regle", text: "Son texte" }],
  "les lignes d'un champ repete prennent les cles des fichiers (body devient text)",
);
is(
  avec("confidentialite", { revised: "2026-09-24T00:00:00.000Z" }).legalData.privacy.lastUpdated,
  "2026-09-24",
  "une date de revision revient au format des fichiers",
);
is(avec("inconnue", { title: "x" }), en, "une entree que la table ne connait pas ne change rien");

console.log(`contenu.selfcheck : ${checks} verifications, ${SECTIONS.length} sections, ${entrees.length} entrees de graine.`);
