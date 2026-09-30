// scripts/essai-administrer.mjs - rejoue les gestes du guide docs/administrer.md dans un vrai navigateur, par l'interface (barre d'edition et back office, jamais l'API), verifie chaque resultat en visiteur anonyme, puis RESTAURE (generique).
//
// CE QUE LE SCRIPT PROUVE. Un client qui suit le guide y arrive sans code :
// chaque geste est fait comme lui le ferait (clic, saisie, Enregistrer,
// Publier), puis la page publique est relue SANS session, comme un visiteur.
// Le geste est ensuite defait par le meme chemin. Les lectures de la base
// (valeur d'origine d'un champ, identifiant d'une entree) passent par l'API en
// lecture seule ; aucune ecriture ne passe par elle.
//
// GENERIQUE. Les gestes communs a tous les themes (un titre par la barre, la
// photo et le bouton du bandeau par leurs pastilles, un bloc masque, un menu,
// le pied, le nom du site, le logo, une page libre, une redirection, un titre
// SEO) sont rejoues avec les parametres que le theme declare dans son
// adaptateur : ESSAI_DE_L_ADMINISTRATION de src/moteur/theme.ts (forme :
// src/moteur/essai.ts). Un geste sans parametre n'est pas rejoue. Les gestes
// propres au theme (un prix, un billet, un rayon...) vivent dans
// scripts/essai-administrer.site.mjs, s'il existe : son export par defaut
// recoit les outils de ce script et rend une liste de gestes
// { nom, faire, verifierFait, restaurer, verifierRestaure }.
//
//   node scripts/essai-administrer.mjs --url http://localhost:4322 --session <cookie> [--captures <dossier>] [--json <fichier>] [--seul <mot>]
//
// La session vient de la porte de developpement d'astro dev (voir
// navigateur.mjs), reutilisee par le build de production servi par workerd
// sur la meme base locale. Le code de sortie vaut 1 des qu'un geste echoue.
import { existsSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { arguments_, contexteEditeur, ouvrirChromium } from "./navigateur.mjs";

const { nommes } = arguments_();
const url = (nommes.url ?? "http://localhost:4322").replace(/\/$/, "");
const captures = nommes.captures ?? null;
const ADMIN = `${url}/_emdash/admin`;
// theme.ts lit ses alias (@config/...) : le crochet de resolution d'abord.
register("../src/moteur/resolution.node.mjs", import.meta.url);
const { ESSAI_DE_L_ADMINISTRATION: P } = await import("../src/moteur/theme.ts");
if (!P) {
  console.error("theme.ts ne declare pas ESSAI_DE_L_ADMINISTRATION : rien a rejouer (forme : src/moteur/essai.ts).");
  process.exit(2);
}
const IMAGE = fileURLToPath(new URL(`../${P.image}`, import.meta.url));
// La langue servie a la racine du site : "en" pour les themes, "fr" pour alohapixel.com. Les
// entrees et les ecrans du back office s'ouvrent dans cette langue, sinon un site francais a la racine
// ouvrirait la version anglaise d'un bloc et le geste ne se verrait pas sur la page.
const LANGUE = P.langue ?? "en";

const navigateur = await ouvrirChromium();
const contexte = await contexteEditeur(navigateur, { url, session: nommes.session, largeur: 1440 });
const page = await contexte.newPage();
page.setDefaultTimeout(15000);
const journal = [];
page.on("console", (m) => {
  if (m.type() === "error") journal.push(`${page.url()} : ${m.text()}`.slice(0, 300));
});

/** La page publique telle qu'un visiteur la recoit : aucun cookie. `texte` est ce qu'il lit (balises retirees). */
async function anonyme(chemin, options = {}) {
  const reponse = await fetch(url + chemin, { redirect: "manual", ...options });
  const html = await reponse.text();
  const texte = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { statut: reponse.status, entetes: reponse.headers, html, texte };
}

/** Une lecture de l'API du moteur avec la session d'editeur (lecture seule). */
async function lire(chemin) {
  const reponse = await contexte.request.get(`${url}/_emdash/api${chemin}`);
  const charge = await reponse.json();
  return charge.data ?? charge;
}

/** L'entree d'une collection par son identifiant et sa langue. */
async function entree(collection, slug, locale = LANGUE) {
  const liste = await lire(`/content/${collection}?locale=${locale}&limit=100`);
  const trouvee = (liste.items ?? liste).find((e) => e.slug === slug);
  if (!trouvee) throw new Error(`${collection}/${slug} (${locale}) introuvable`);
  return trouvee;
}

// Le message d'accueil du back office ne s'affiche qu'une fois, et parfois une
// seconde apres la page (Kai) : au premier ecran du back office il est attendu
// un instant ; ensuite, ferme s'il est la, sans attendre.
let accueilAttendu = false;
async function fermerAccueil() {
  if (!page.url().includes("/_emdash/admin")) return;
  const bouton = page.getByRole("button", { name: "Commencer" });
  const vu = accueilAttendu ? await bouton.isVisible().catch(() => false) : await bouton.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false);
  accueilAttendu = true;
  if (vu) await bouton.click();
}

async function ouvrir(adresse) {
  await page.goto(adresse, { waitUntil: "networkidle" });
  await fermerAccueil();
}

async function capture(nom) {
  if (captures) await page.screenshot({ path: `${captures}/essai-${nom}.png` });
}

/** Enregistrer puis Publier, dans l'ecran d'une entree du back office ("Publier", ou "Publier les modifications" puis "maintenant"). */
async function enregistrerEtPublier() {
  const enregistrer = page.getByRole("button", { name: /^Enregistrer(\s+Enregistrer)?$/ }).first();
  if (await enregistrer.isEnabled().catch(() => false)) await enregistrer.click();
  await page.waitForTimeout(1200);
  const publier = page.getByRole("button", { name: /^Publier( les modifications)?$/ }).first();
  await publier.click();
  const maintenant = page.getByText(/^Publier (les modifications )?maintenant$/);
  if (await maintenant.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false)) await maintenant.click();
  await page.waitForTimeout(1500);
}

/** Dans la page en mode edition : un texte edite dans la page, Entree, puis le bouton Publish de la barre attend. */
async function editerDansLaPage(cible, valeur) {
  await cible.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(valeur);
  await page.keyboard.press("Enter");
  await page.locator("#emdash-tb-publish").waitFor({ state: "visible" });
}

async function publierParLaBarre() {
  await page.locator("#emdash-tb-publish").click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

/** L'ecran d'une entree de `sections` dans le back office. */
async function ouvrirSection(slug, locale = LANGUE) {
  const e = await entree("sections", slug, locale);
  await ouvrir(`${ADMIN}/content/sections/${e.id}?locale=${locale}`);
}

async function renommerLien(menu, rang, libelle) {
  await ouvrir(`${ADMIN}/menus/${menu}`);
  await page.getByRole("button", { name: "Modifier" }).nth(rang + 1).click();
  await page.locator('[role=dialog] input[name="label"]').fill(libelle);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(800);
}

async function ajouterLien(menu, libelle, adresse) {
  await ouvrir(`${ADMIN}/menus/${menu}`);
  await page.getByRole("button", { name: /Ajouter un lien personnalis/ }).click();
  await page.locator('[role=dialog] input[name="label"]').fill(libelle);
  await page.locator('[role=dialog] input[name="url"]').fill(adresse);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForTimeout(800);
}

async function retirerDernierLien(menu) {
  await ouvrir(`${ADMIN}/menus/${menu}`);
  await page.getByRole("button", { name: "Supprimer" }).last().click();
  await page.waitForTimeout(800);
}

/** Un reglage de l'ecran Reglages > General, par son libelle, puis Enregistrer. */
async function reglageGeneral(libelle, valeur) {
  await ouvrir(`${ADMIN}/settings/general`);
  await page.getByLabel(libelle).fill(valeur);
  await page.getByRole("button", { name: /^Enregistrer/ }).first().click();
  await page.waitForTimeout(1000);
}

/** Deplacer une entree vers la corbeille, depuis son ecran. */
async function corbeille(collection, slug, locale = LANGUE) {
  const e = await entree(collection, slug, locale);
  await ouvrir(`${ADMIN}/content/${collection}/${e.id}?locale=${locale}`);
  await page.getByRole("button", { name: "Déplacer vers la corbeille" }).click();
  await page.locator("[role=dialog]").getByRole("button", { name: "Déplacer vers la corbeille" }).click();
  await page.waitForTimeout(1000);
}

/** Une option d'une liste du back office, par le libelle du champ : le nom exact d'abord, sinon le nom approche (une liste qui affiche "Carte" pour "carte"). */
async function choisir(libelle, option) {
  await page.getByRole("combobox", { name: libelle }).click();
  // Les options de la liste ouverte seulement : une liste native de la page
  // (un champ choisi par son nom) a aussi des options, cachees.
  const liste = page.getByRole("listbox").last();
  await liste.getByRole("option").first().waitFor();
  const exacte = liste.getByRole("option", { name: option, exact: true });
  await ((await exacte.count()) > 0 ? exacte : liste.getByRole("option", { name: option })).first().click();
}

/** Une verification refaite jusqu'a cinq fois, a une seconde d'intervalle (une liste se relit apres la publication, pas pendant). */
async function bientot(verifier) {
  for (let essai = 0; essai < 5; essai++) {
    if (await verifier()) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

const resultats = [];
async function geste({ nom, faire, verifierFait, restaurer, verifierRestaure }) {
  // --seul <mot> : ne rejoue que les gestes dont le nom le contient (mise au point).
  if (nommes.seul && !nom.includes(nommes.seul)) return;
  const ligne = { nom, fait: false, visible: false, restaure: false, erreur: null };
  const fichier = nom.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  try {
    await faire();
    ligne.fait = true;
    ligne.visible = await verifierFait();
    await capture(fichier);
    await restaurer();
    ligne.restaure = await verifierRestaure();
  } catch (erreur) {
    ligne.erreur = erreur.message.split("\n")[0].slice(0, 200);
    await capture(`erreur-${fichier}`).catch(() => {});
  }
  resultats.push(ligne);
  const detail = ligne.erreur ?? (!ligne.visible ? "non vu en visiteur" : !ligne.restaure ? "non defait" : null);
  console.log(`${ligne.visible && ligne.restaure ? "ok  " : "ECHEC"} ${nom}${detail ? ` : ${detail}` : ""}`);
}

// Les identifiants des entrees que l'essai cree portent un suffixe propre a ce passage : une entree mise a la
// corbeille garde son identifiant, et un second passage sur la meme base se heurtait a un 409 (Reef).
const suffixe = Date.now().toString(36);
const outils = {
  page, url, ADMIN, IMAGE, nommes, suffixe, anonyme, lire, entree, ouvrir, capture, enregistrerEtPublier, editerDansLaPage, publierParLaBarre,
  ouvrirSection, renommerLien, ajouterLien, retirerDernierLien, reglageGeneral, corbeille, choisir, bientot, langue: LANGUE,
};
const { gestesCommuns, gestesDeFin } = await import("./essai-administrer.gestes.mjs");
for (const g of await gestesCommuns(P, outils)) await geste(g);
const propres = fileURLToPath(new URL("./essai-administrer.site.mjs", import.meta.url));
if (existsSync(propres)) for (const g of await (await import(propres)).default(outils)) await geste(g);
for (const g of await gestesDeFin(P, outils)) await geste(g);

await navigateur.close();
if (nommes.json) writeFileSync(nommes.json, JSON.stringify({ resultats, console: journal }, null, 2));
const echecs = resultats.filter((r) => !(r.visible && r.restaure));
console.log(`\n${resultats.length - echecs.length}/${resultats.length} geste(s) faits, vus en visiteur, puis defaits.`);
process.exit(echecs.length > 0 ? 1 : 0);
