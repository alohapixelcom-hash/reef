// src/moteur/site.selfcheck.ts - self-check du cadre et des listes : les reglages, l'entree "site", les sujets et les auteurs de la graine rendent ce que les fichiers affichent, un reglage vide rend le theme, et la couleur de marque repeint les jetons de Reef.
// Lancer : node src/moteur/site.selfcheck.ts
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import { identite, liensDuMenu, type Cadre } from "./cadre.ts";
import { liensDeLAuteur, seoDe, teinteDuSujet, TEINTES_DES_SUJETS } from "./listes.ts";
import { CHOIX_DE_COULEUR, COULEURS, couleursIllisibles, couleursQuiMentent, feuilleDeLaPalette, teinteDe } from "./palette.ts";
import { entreeDuSite, reglagesDeLaGraine } from "./site.ts";
import { CHOIX_DE_POLICE, feuilleDeLaTypographie } from "./typographie.ts";

register("./resolution.node.mjs", import.meta.url);
const { default: siteData } = await import("../config/siteData.json.ts");
const { repliDuSite, variablesDeLaPalette, ICONES, VARIABLES_DE_POLICE } = await import("./theme.ts");
const { useTranslations } = await import("../i18n/index.ts");
const { icons } = await import("../components/svg/icons/icons.ts");
const { iconeChoisie } = await import("./icones.ts");

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

type Champ = { slug: string; type?: string; translatable?: boolean; validation?: { options?: string[] } };
type Entree = { slug: string; locale: string; data: Record<string, unknown> };
const graine = JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8")) as {
  settings: { title: string; postsPerPage?: number };
  collections: { slug: string; fields: Champ[] }[];
  content: Record<string, Entree[]>;
};
const champ = (collection: string, slug: string) => graine.collections.find((c) => c.slug === collection)!.fields.find((f) => f.slug === slug)!;
const page = (cadre?: Partial<Cadre>) => ({ locals: cadre ? { cadre: { menus: new Map(), ...cadre } } : {} });

// 1. La graine porte le nom du site des fichiers, et le nombre de billets par page du theme.
is(graine.settings.title, reglagesDeLaGraine(repliDuSite("en")).title, "le titre des reglages de la graine est le nom de siteData");
is(graine.settings.postsPerPage, 9, "les listes paginent par neuf, comme le theme");

for (const l of ["en", "fr"] as const) {
  const repli = repliDuSite(l);
  const fichiers = identite(page(), repli);
  const site = graine.content.site.find((e) => e.locale === l)!.data;
  // 2. L'entree "site" de la graine rend exactement l'identite des fichiers,
  //    sauf la description francaise, qu'aucune page ne montre.
  const verse = identite(page({ reglages: { title: siteData.name }, site }), repli);
  is({ ...verse, description: fichiers.description }, fichiers, `reglages et entree site de la graine = fichiers en ${l}`);
  is(site, { ...entreeDuSite(repli, l === "en" ? repli.description : useTranslations(l).home.metaDescription), feed_title: siteData.title[l] }, `entree site de la graine en ${l}`);
  // 3. Des reglages vides rendent le theme tel qu'il est.
  is(identite(page({ reglages: { title: "", seo: { titleSeparator: "" } }, site: { email: " " } }), repli), fichiers, `reglages vides = fichiers en ${l}`);
  // 4. Les sujets et les auteurs de la graine sont les fiches de src/data.
  const dossier = (nom: string) =>
    Object.fromEntries(
      readdirSync(new URL(`../data/${nom}/${l}/`, import.meta.url)).map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(new URL(`../data/${nom}/${l}/${f}`, import.meta.url), "utf8"))]),
    );
  const topics = dossier("topics");
  for (const e of graine.content.sujets.filter((s) => s.locale === l)) {
    const t = topics[e.slug];
    is({ name: e.data.name, description: e.data.description, accent: teinteDuSujet(e.data.color), order: e.data.order }, { name: t.name, description: t.description, accent: t.accent, order: t.order }, `sujet ${e.slug} (${l}) = son fichier`);
  }
  is(graine.content.sujets.filter((s) => s.locale === l).length, Object.keys(topics).length, `tous les sujets en ${l}`);
  const authors = dossier("authors");
  for (const e of graine.content.auteurs.filter((s) => s.locale === l)) {
    const a = authors[e.slug];
    is({ name: e.data.name, role: e.data.role, bio: e.data.bio }, { name: a.name, role: a.role, bio: a.bio }, `auteur ${e.slug} (${l}) = son fichier`);
  }
  is(graine.content.auteurs.filter((s) => s.locale === l).length, Object.keys(authors).length, `tous les auteurs en ${l}`);
}

// 5. Un reglage rempli change ce qu'il dit, et rien d'autre.
const change = identite(page({ reglages: { title: "Marée", social: { twitter: "https://x.com/maree", instagram: "https://instagram.com/maree" }, seo: { titleSeparator: "·" } }, site: { email: "bonjour@maree.fr", credit_name: "Studio Marée" } }), repliDuSite("fr"));
is([change.nom, change.separateur, change.twitter, change.email], ["Marée", " · ", "maree", "bonjour@maree.fr"], "nom, separateur, compte X et e-mail suivent les reglages");
is(change.reseaux.map((r) => r.reseau), ["X", "Instagram"], "les reseaux renseignes, dans l'ordre");

// 6. Un menu d'une autre langue, ou vide, rend les liens des fichiers.
const repli = [{ text: "A", href: "/a/" }];
const menus = new Map([["principal", { name: "principal", label: "x", locale: "en", items: [{ label: "B", url: "/b/", children: [], cssClasses: "bouton" }] }]]);
is(liensDuMenu(page({ menus }), "principal", "fr", repli), repli, "menu anglais sur une page francaise : les fichiers");
is(liensDuMenu(page({ menus }), "principal", "en", repli), [{ text: "B", href: "/b/", bouton: true }], "menu de la langue : ses liens, la classe bouton lue");

// 7. Les listes de choix : couleurs des sujets, liens des auteurs, SEO.
is(champ("sujets", "color").validation?.options, Object.keys(TEINTES_DES_SUJETS), "la graine propose les couleurs des sujets de la table");
is([teinteDuSujet("Encre"), teinteDuSujet(""), teinteDuSujet("Violet")], ["ink", "coral", "coral"], "une couleur donne son accent ; vide ou inconnue, le corail du theme");
is(liensDeLAuteur([{ label: "Site", href: "https://a.b" }, { label: "", href: "https://c.d" }, { label: "X" }]), [{ label: "Site", href: "https://a.b" }], "seuls les liens complets s'affichent");
is(seoDe({ title: " ", description: "D", image: "abc.webp", noIndex: true }, { title: "T", description: "d" }), { title: "T", description: "D", image: "/_emdash/api/media/file/abc.webp", canonical: undefined, noindex: true }, "le panneau SEO passe avant les champs, un vide ne compte pas");

// 8. La couleur de la marque repeint les quatre rampes de Reef ; les icones proposees existent.
is(champ("site", "brand_color").validation?.options, [...CHOIX_DE_COULEUR], "la graine propose les couleurs de marque de la table");
for (const nom of Object.keys(COULEURS)) {
  const vars = variablesDeLaPalette(teinteDe(nom)!);
  is(Object.keys(vars).length, 29, `${nom} : 29 variables (10 corail, 11 encre, 3 papier, 5 recif)`);
  assert.ok(Object.values(vars).every((v) => /^#[0-9a-f]{6}$/.test(v)), `${nom} : des couleurs hexadecimales`);
  assert.ok(feuilleDeLaPalette(nom, variablesDeLaPalette)?.startsWith(":root{--color-"), `${nom} : une feuille posee a la racine`);
}
is(feuilleDeLaPalette(undefined, variablesDeLaPalette), null, "vide : aucune feuille, la palette du theme");
for (const [nom, icone] of Object.entries(ICONES)) assert.ok(icone in icons, `${nom} : l'icone ${icone} n'existe pas`);
is(iconeChoisie("Enveloppe", "check"), "mail", "un nom francais donne son icone");

// La couleur nommee est celle des liens et des boutons (rampe coral) : "Bleu océan" est un bleu.
// Le nom de la variable est compose : ecrit en entier, Tailwind le lirait ici et l'ajouterait a la feuille.
is(couleursQuiMentent(variablesDeLaPalette, `--color-coral-${500}`), [], "une couleur de la liste ne donne pas la teinte que son nom dit");
// Les boutons pleins aussi : "Bleu océan" les rendait orange.
is(couleursQuiMentent(variablesDeLaPalette, `--color-reef-${600}`), [], "une couleur de la liste ne donne pas aux boutons (clair) la teinte que son nom dit");
is(couleursQuiMentent(variablesDeLaPalette, `--color-reef-${400}`), [], "une couleur de la liste ne donne pas aux boutons (sombre) la teinte que son nom dit");
// Le texte des boutons reste lisible pour chaque couleur.
{
  const { CONTRASTE_DES_BOUTONS, variablesDeLaPalette: variables } = await import("./theme.ts");
  is(couleursIllisibles(variables, CONTRASTE_DES_BOUTONS), [], "une couleur de la liste laisse un bouton illisible");
}

// 9. La police du site : la graine propose les choix de la table, la feuille repeint les deux jetons de police de tokens.css.
is(champ("site", "font").validation?.options, [...CHOIX_DE_POLICE], "la graine propose les polices de la table");
is(champ("site", "font").translatable, false, "la police vaut pour les deux langues");
{
  const jetons = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
  for (const v of [...VARIABLES_DE_POLICE.texte, ...VARIABLES_DE_POLICE.titre]) assert.ok(jetons.includes(`${v}:`), `${v} n'est pas un jeton de tokens.css`);
  is(feuilleDeLaTypographie(CHOIX_DE_POLICE[0], VARIABLES_DE_POLICE), null, "l'origine : aucune feuille, les polices du theme");
  assert.ok(feuilleDeLaTypographie(CHOIX_DE_POLICE[2], VARIABLES_DE_POLICE)?.startsWith(":root{"), "une police choisie : une feuille posee a la racine");
}
// 10. La place d'un bloc sur l'accueil : un entier commun aux deux langues.
is([champ("sections", "order").type, champ("sections", "order").translatable], ["integer", false], "la place d'un bloc est un entier commun aux deux langues");

// La carte des champs de chaque bloc : chaque champ cite existe dans la graine, le libelle d'un sous-champ est le sien.
{
  const { defautsDeLaCarte } = await import("./champs-des-blocs.ts");
  const { CHAMPS_DES_BLOCS } = await import("./theme.ts");
  is(defautsDeLaCarte(CHAMPS_DES_BLOCS, JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8"))), [], "la carte des champs de chaque bloc suit la graine");
}

console.log(`site.selfcheck : ${checks} verifications passees`);
