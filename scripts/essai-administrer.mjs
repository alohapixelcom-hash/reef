// scripts/essai-administrer.mjs - rejoue les gestes du guide docs/administrer.md dans un vrai navigateur, par l'interface (barre d'edition et back office, jamais l'API), verifie chaque resultat en visiteur anonyme, puis RESTAURE.
//
// CE QUE LE SCRIPT PROUVE. Un client qui suit le guide y arrive sans code :
// chaque geste est fait comme lui le ferait (clic, saisie, Enregistrer,
// Publier), puis la page publique est relue SANS session, comme un visiteur.
// Le geste est ensuite defait par le meme chemin. Les lectures de la base
// (valeur d'origine d'un champ, identifiant d'une entree) passent par l'API en
// lecture seule ; aucune ecriture ne passe par elle.
//
//   node scripts/essai-administrer.mjs --url http://localhost:4382 --session <cookie> [--captures <dossier>] [--json <fichier>]
//
// La session vient de la porte de developpement d'astro dev (voir
// navigateur.mjs), reutilisee par le build de production servi par workerd
// sur la meme base locale. Le code de sortie vaut 1 des qu'un geste echoue.
// Modele : scripts/essai-administrer.mjs de Swell ; les gestes sont ceux de Reef (quatorze).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { arguments_, contexteEditeur, ouvrirChromium } from "./navigateur.mjs";

const { nommes } = arguments_();
const url = (nommes.url ?? "http://localhost:4382").replace(/\/$/, "");
const captures = nommes.captures ?? null;
const ADMIN = `${url}/_emdash/admin`;
const IMAGE = fileURLToPath(new URL("../public/reef-iphone-poster.webp", import.meta.url));

const navigateur = await ouvrirChromium();
const contexte = await contexteEditeur(navigateur, { url, session: nommes.session, largeur: 1440 });
const page = await contexte.newPage();
page.setDefaultTimeout(15000);
const journal = [];
page.on("console", (m) => { if (m.type() === "error") journal.push(`${page.url()} : ${m.text()}`.slice(0, 300)); });

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
async function entree(collection, slug, locale = "en") {
  const liste = await lire(`/content/${collection}?locale=${locale}&limit=100`);
  const trouvee = (liste.items ?? liste).find((e) => e.slug === slug);
  if (!trouvee) throw new Error(`${collection}/${slug} (${locale}) introuvable`);
  return trouvee;
}

async function fermerAccueil() {
  const bouton = page.getByRole("button", { name: "Commencer" });
  if (await bouton.isVisible().catch(() => false)) await bouton.click();
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

/** Deplacer une entree vers la corbeille, depuis son ecran. */
async function corbeille(collection, slug) {
  const e = await entree(collection, slug);
  await ouvrir(`${ADMIN}/content/${collection}/${e.id}?locale=en`);
  await page.getByRole("button", { name: "Déplacer vers la corbeille" }).click();
  await page.locator("[role=dialog]").getByRole("button", { name: "Déplacer vers la corbeille" }).click();
  await page.waitForTimeout(1000);
}

const resultats = [];
async function geste(nom, faire, verifierFait, restaurer, verifierRestaure) {
  const ligne = { nom, fait: false, visible: false, restaure: false, erreur: null };
  try {
    await faire();
    ligne.fait = true;
    ligne.visible = await verifierFait();
    await capture(nom.replace(/[^a-z0-9]+/gi, "-").toLowerCase());
    await restaurer();
    ligne.restaure = await verifierRestaure();
  } catch (erreur) {
    ligne.erreur = erreur.message.split("\n")[0].slice(0, 200);
    await capture(`erreur-${nom.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`).catch(() => {});
  }
  resultats.push(ligne);
  console.log(`${ligne.visible && ligne.restaure ? "ok  " : "ECHEC"} ${nom}${ligne.erreur ? ` : ${ligne.erreur}` : ""}`);
}

// 1. UN TITRE, PAR LA BARRE (guide : "Changer un texte").
const hero = await entree("sections", "hero");
await geste(
  "Titre de l'accueil par la barre",
  async () => {
    await ouvrir(`${url}/`);
    await editerDansLaPage(page.locator("#hero-title"), "Essai du guide");
    if ((await anonyme("/")).texte.includes("Essai du guide")) throw new Error("visible avant Publier");
    await publierParLaBarre();
  },
  async () => (await anonyme("/")).texte.includes("Essai du guide"),
  async () => {
    await ouvrir(`${url}/`);
    await editerDansLaPage(page.locator("#hero-title"), hero.data.title);
    await publierParLaBarre();
  },
  async () => !(await anonyme("/")).texte.includes("Essai du guide"),
);

// 2. UNE PHOTO, PAR SA PASTILLE (guide : "Changer une image").
const pastilleHero = (champ) => page.locator(`[data-slot="home-hero"] [data-aloha-pastilles] [data-emdash-ref*='"field":"${champ}"']`).first();
const photoChoisie = (html) => /data-slot="home-hero"[\s\S]{0,4000}?_emdash(%2F|\/)api(%2F|\/)media/.test(html);
await geste(
  "Photo de l'accueil par la pastille",
  async () => {
    await ouvrir(`${url}/`);
    await pastilleHero("image").click();
    await page.locator("#emdash-img-upload").setInputFiles(IMAGE);
    await page.locator("#emdash-tb-publish").waitFor({ state: "visible", timeout: 30000 });
    await publierParLaBarre();
  },
  async () => photoChoisie((await anonyme("/")).html),
  async () => {
    await ouvrir(`${url}/`);
    await pastilleHero("image").click();
    await page.locator('.emdash-img-popover [data-action="remove"]').click();
    await page.locator("#emdash-tb-publish").waitFor({ state: "visible" });
    await publierParLaBarre();
  },
  async () => !photoChoisie((await anonyme("/")).html),
);

// 3. L'ADRESSE D'UN BOUTON, DANS SA PASTILLE (guide : "Changer un bouton").
await geste(
  "Adresse du bouton principal par sa pastille",
  async () => {
    await ouvrir(`${url}/`);
    await editerDansLaPage(pastilleHero("cta_link"), "/essai-lien/");
    await publierParLaBarre();
  },
  async () => (await anonyme("/")).html.includes('href="/essai-lien/"'),
  async () => {
    await ouvrir(`${url}/`);
    await editerDansLaPage(pastilleHero("cta_link"), " ");
    await publierParLaBarre();
  },
  async () => !(await anonyme("/")).html.includes("/essai-lien/"),
);

/** L'ecran d'une entree de `sections` dans le back office. */
async function ouvrirSection(slug, locale = "en") {
  const e = await entree("sections", slug, locale);
  await ouvrir(`${ADMIN}/content/sections/${e.id}?locale=${locale}`);
}

// 4. UN BLOC MASQUE (guide : "Masquer ou reafficher un bloc").
async function basculerMasque() {
  await ouvrirSection("signatures");
  await page.locator("#field-hidden").click();
  await enregistrerEtPublier();
}
await geste(
  "Bloc des signatures masque",
  basculerMasque,
  async () => !(await anonyme("/")).html.includes('aria-labelledby="writers-title"'),
  basculerMasque,
  async () => (await anonyme("/")).html.includes('aria-labelledby="writers-title"'),
);

// 5. UN LIEN DU MENU PRINCIPAL RENOMME (guide : "Changer un menu").
async function renommerLien(menu, rang, libelle) {
  await ouvrir(`${ADMIN}/menus/${menu}`);
  await page.getByRole("button", { name: "Modifier" }).nth(rang + 1).click();
  await page.locator('[role=dialog] input[name="label"]').fill(libelle);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(800);
}
await geste(
  "Lien du menu principal renomme",
  () => renommerLien("principal", 0, "Essai menu"),
  async () => (await anonyme("/")).html.includes("Essai menu"),
  () => renommerLien("principal", 0, "Posts"),
  async () => !(await anonyme("/")).html.includes("Essai menu"),
);

// 6. UN LIEN AJOUTE AU PIED (guide : "Changer un lien ou une colonne du pied de page").
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
await geste(
  "Lien ajoute a une colonne du pied",
  () => ajouterLien("pied-studio", "Essai pied", "/essai-pied/"),
  async () => (await anonyme("/about/")).html.includes('href="/essai-pied/"'),
  () => retirerDernierLien("pied-studio"),
  async () => !(await anonyme("/about/")).html.includes("/essai-pied/"),
);

// 7. LE NOM DU SITE ET LE LOGO (guide : "Reglages du site").
async function reglageGeneral(libelle, valeur) {
  await ouvrir(`${ADMIN}/settings/general`);
  await page.getByLabel(libelle).fill(valeur);
  await page.getByRole("button", { name: /^Enregistrer/ }).first().click();
  await page.waitForTimeout(1000);
}
await geste(
  "Nom du site dans les reglages",
  () => reglageGeneral("Titre du site", "Essai Maree"),
  async () => /<title>[^<]*Essai Maree/.test((await anonyme("/about/")).html),
  () => reglageGeneral("Titre du site", "Reef"),
  async () => !(await anonyme("/about/")).html.includes("Essai Maree"),
);
await geste(
  "Logo dans les reglages",
  async () => {
    await ouvrir(`${ADMIN}/settings/general`);
    await page.getByRole("button", { name: "Sélectionner le logo" }).click();
    await page.locator('[role=dialog] input[type="file"]').setInputFiles(IMAGE);
    const choisir = page.locator("[role=dialog]").getByRole("button", { name: "Choisir", exact: true });
    await choisir.and(page.locator(":enabled")).waitFor({ timeout: 20000 });
    await choisir.click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /^Enregistrer/ }).first().click();
    await page.waitForTimeout(1000);
  },
  async () => /style="height:1\.5rem;width:auto"/.test((await anonyme("/")).html),
  async () => {
    await ouvrir(`${ADMIN}/settings/general`);
    await page.getByRole("button", { name: "Supprimer", exact: true }).first().click();
    await page.waitForTimeout(500);
    const enregistrer = page.getByRole("button", { name: /^Enregistrer(\s+Enregistrer)?$/ }).first();
    if (await enregistrer.isEnabled().catch(() => false)) await enregistrer.click();
    await page.waitForTimeout(1000);
  },
  async () => !/style="height:1\.5rem;width:auto"/.test((await anonyme("/")).html),
);

// 8. LE NOMBRE DE BILLETS PAR PAGE (guide : "Reglages du site" ; Reef n'a pas de prix).
await geste(
  "Articles par page dans les reglages",
  () => reglageGeneral("Articles par page", "3"),
  async () => (await anonyme("/blog/2/")).statut === 200,
  () => reglageGeneral("Articles par page", "9"),
  async () => (await anonyme("/blog/2/")).statut === 404,
);

// 9. UN SUJET RENOMME (guide : "Ajouter une rubrique, un sujet, un auteur").
const craft = await entree("sujets", "craft");
async function nomDuSujet(nom) {
  await ouvrir(`${ADMIN}/content/sujets/${craft.id}?locale=en`);
  await page.locator("#field-name").fill(nom);
  await enregistrerEtPublier();
}
await geste(
  "Sujet renomme",
  () => nomDuSujet("Essai sujet"),
  async () => (await anonyme("/topics/")).texte.includes("Essai sujet") && (await anonyme("/topics/craft/")).texte.includes("Essai sujet"),
  () => nomDuSujet(craft.data.name),
  async () => !(await anonyme("/topics/")).texte.includes("Essai sujet"),
);

// 10. UNE PAGE AJOUTEE, PUIS MISE AU MENU (guide : "Ajouter une page").
await geste(
  "Page ajoutee et mise au menu",
  async () => {
    await ouvrir(`${ADMIN}/content/pages/new`);
    await page.locator("#field-title").fill("Essai page");
    await page.getByLabel("Slug").fill("essai-page");
    await enregistrerEtPublier();
    await ajouterLien("principal", "Essai page", "/essai-page/");
  },
  async () => (await anonyme("/essai-page/")).statut === 200 && (await anonyme("/")).html.includes('href="/essai-page/"'),
  async () => {
    await retirerDernierLien("principal");
    await corbeille("pages", "essai-page");
  },
  async () => (await anonyme("/essai-page/")).statut === 404 && !(await anonyme("/")).html.includes("/essai-page/"),
);

// 11. UN BILLET PUBLIE (guide : "Ajouter un billet").
async function choisir(libelle, option) {
  await page.getByRole("combobox", { name: libelle }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
await geste(
  "Billet ajoute et publie",
  async () => {
    await ouvrir(`${ADMIN}/content/posts/new`);
    await page.locator("#field-title").fill("Essai billet");
    await page.locator("#field-description").fill("Essai du guide : un billet.");
    await choisir(/^Sujet/, "Craft");
    await choisir(/^Auteur/, "Mara-lindqvist");
    await page.getByLabel("Slug").fill("essai-billet");
    await enregistrerEtPublier();
  },
  async () => {
    const billet = await anonyme("/blog/essai-billet/");
    const liste = await anonyme("/blog/");
    if (billet.statut !== 200 || !liste.texte.includes("Essai billet")) console.log(`  billet ${billet.statut}, liste ${liste.statut} ${liste.texte.includes("Essai billet") ? "avec" : "sans"} le billet`);
    return billet.statut === 200 && liste.texte.includes("Essai billet");
  },
  () => corbeille("posts", "essai-billet"),
  async () => (await anonyme("/blog/essai-billet/")).statut === 404 && !(await anonyme("/blog/")).texte.includes("Essai billet"),
);

// 12. UNE REDIRECTION (guide : "Une redirection").
await geste(
  "Redirection 301",
  async () => {
    await ouvrir(`${ADMIN}/redirects`);
    await page.getByRole("button", { name: "Nouvelle redirection" }).click();
    await page.getByLabel("Chemin source").fill("/essai-ancien/");
    await page.getByLabel("Chemin d'arrivée").fill("/about/");
    await page.getByRole("button", { name: "Créer" }).click();
    await page.waitForTimeout(1000);
  },
  async () => {
    const r = await anonyme("/essai-ancien/");
    return r.statut === 301 && (r.entetes.get("location") ?? "").endsWith("/about/");
  },
  async () => {
    await ouvrir(`${ADMIN}/redirects`);
    await page.getByRole("button", { name: /Supprimer/ }).first().click();
    const confirmer = page.locator("[role=dialog]").getByRole("button", { name: /Supprimer/ });
    if (await confirmer.isVisible().catch(() => false)) await confirmer.click();
    await page.waitForTimeout(1000);
  },
  async () => (await anonyme("/essai-ancien/")).statut === 404,
);

// 13. UN TITRE SEO (guide : "Le SEO").
const contact = await entree("sections", "contact");
async function titreSeo(valeur) {
  await ouvrirSection("contact");
  await page.locator("#field-meta_title").fill(valeur);
  await enregistrerEtPublier();
}
await geste(
  "Titre SEO de la page Contact",
  () => titreSeo("Essai SEO"),
  async () => /<title>Essai SEO/.test((await anonyme("/contact/")).html),
  () => titreSeo(contact.data.meta_title),
  async () => !(await anonyme("/contact/")).html.includes("Essai SEO"),
);

await navigateur.close();
if (nommes.json) writeFileSync(nommes.json, JSON.stringify({ resultats, console: journal }, null, 2));
const echecs = resultats.filter((r) => !(r.visible && r.restaure));
console.log(`\n${resultats.length - echecs.length}/${resultats.length} geste(s) faits, vus en visiteur, puis defaits.`);
process.exit(echecs.length > 0 ? 1 : 0);
