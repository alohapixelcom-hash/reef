// scripts/essai-administrer.site.mjs - les gestes du guide propres a Reef (articles par page, un sujet renomme, un billet publie, auteur, sujet et etiquettes d'un article, lettre d'information), rejoues apres les gestes communs par scripts/essai-administrer.mjs du socle.
//
// Fichier du site : son export par defaut recoit les outils du script commun
// et rend une liste de gestes { nom, faire, verifierFait, restaurer,
// verifierRestaure }. Reef n'a pas de prix : ses reglages propres sont le
// nombre de billets par page, ses sujets et ses billets, la police du site et
// la place d'un bloc sur l'accueil, l'auteur et le sujet d'un article choisis
// par leur nom, une etiquette, et la lettre d'information du visiteur qui
// s'inscrit jusqu'a sa desinscription.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Les courriels que Miniflare ecrit en local au lieu de les envoyer (astro dev,
// liaison send_email simulee) : le plus recent qui contient `motif`.
const COURRIELS_LOCAUX = new URL("../.wrangler/tmp/email/", import.meta.url).pathname;
function courrielsLocaux() {
  if (!existsSync(COURRIELS_LOCAUX)) return [];
  const fichiers = [];
  const parcourir = (d) => {
    for (const n of readdirSync(d)) {
      const f = join(d, n);
      if (statSync(f).isDirectory()) parcourir(f);
      else fichiers.push({ f, t: statSync(f).mtimeMs });
    }
  };
  parcourir(COURRIELS_LOCAUX);
  return fichiers.sort((a, b) => b.t - a.t).map((x) => readFileSync(x.f, "utf8"));
}
const lienDans = (motif) => {
  for (const texte of courrielsLocaux()) {
    const m = new RegExp(`https?://\\S+${motif}\\?jeton=[0-9a-f]{64}`).exec(texte);
    if (m) return m[0];
  }
  return null;
};

export default async function gestesDeReef(o) {
  const { page, ADMIN, anonyme, entree, ouvrir, ouvrirSection, enregistrerEtPublier, reglageGeneral, corbeille, choisir } = o;
  const site = await entree("site", "site");
  const police = async (nom) => {
    await ouvrir(`${ADMIN}/content/site/${site.id}?locale=en`);
    await choisir(/^Police du site/, nom);
    await enregistrerEtPublier();
  };
  // La police choisie se voit dans la feuille posee en tete de page, dans les deux langues (champ commun), sans prechargement des polices du theme.
  const policeClassique = async (chemin) => {
    const { html } = await anonyme(chemin);
    return html.includes("--font-display:ui-serif") && html.includes("--font-sans:ui-serif") && !/rel="preload"[^>]*woff2/.test(html);
  };
  const policeDuTheme = async (chemin) => {
    const { html } = await anonyme(chemin);
    return !html.includes("--font-display:ui-serif") && /rel="preload"[^>]*woff2/.test(html);
  };
  const place = async (valeur) => {
    await ouvrirSection("lettre");
    await page.locator("#field-order").fill(valeur);
    await enregistrerEtPublier();
  };
  // La lettre d'information (id="newsletter") avant ou apres l'ouverture (id="hero-title").
  const lettreEnHaut = async (chemin) => {
    const { html } = await anonyme(chemin);
    const lettre = html.indexOf('id="newsletter"');
    const tete = html.indexOf('id="hero-title"');
    return lettre !== -1 && tete !== -1 && lettre < tete;
  };
  const craft = await entree("sujets", "craft");
  const nomDuSujet = async (nom) => {
    await ouvrir(`${ADMIN}/content/sujets/${craft.id}?locale=en`);
    await page.locator("#field-name").fill(nom);
    await enregistrerEtPublier();
  };
  // Un article existant, son auteur, son sujet, une etiquette.
  const billet = await entree("posts", "a-type-scale-you-can-defend");
  const ouvrirBillet = () => ouvrir(`${ADMIN}/content/posts/${billet.id}?locale=en`);
  const nomDe = async (collection, slug) => (await entree(collection, slug)).data.name;
  const [tomas, noor, typo, design] = await Promise.all([nomDe("auteurs", "tomas-abaroa"), nomDe("auteurs", "noor-benali"), nomDe("sujets", "typography"), nomDe("sujets", "design")]);
  const champ = async (id, nom) => {
    await ouvrirBillet();
    await page.locator(`#field-${id}`).selectOption({ label: nom });
    await enregistrerEtPublier();
  };
  const listeLe = async (chemin) => (await anonyme(chemin)).html.includes("/blog/a-type-scale-you-can-defend/");
  const etiquette = `Essai ${o.suffixe}`;
  const adresseEtiquette = `essai-${o.suffixe}`;
  const ajouterEtiquette = async () => {
    await ouvrirBillet();
    const saisie = page.getByPlaceholder(/Ajouter des étiquettes/);
    await saisie.fill(etiquette);
    await saisie.press("Enter");
    // Une etiquette est rattachee a l'article des qu'on la valide (EmDash
    // l'enregistre seul, pour les deux langues) : rien a publier.
    await page.getByRole("button", { name: `Supprimer ${etiquette}` }).waitFor();
    await page.waitForTimeout(800);
  };
  const retirerEtiquette = async () => {
    await ouvrirBillet();
    await page.getByRole("button", { name: `Supprimer ${etiquette}` }).click();
    await page.waitForTimeout(1200);
  };
  // La lettre : l'administrateur regle l'adresse d'expedition s'il n'y en a
  // pas (Reglages des courriels, comme le demande l'ecran de la lettre), un
  // visiteur (sans session) s'inscrit sur /fr/, confirme par le lien recu,
  // l'administrateur lui envoie un article, le visiteur suit le lien du pied du
  // courriel et confirme sa desinscription sur la page qui s'ouvre. L'adresse
  // d'expedition d'origine est remise ensuite.
  const abonne = `lecteur-${o.suffixe}@reef.test`;
  const visiteur = await page.context().browser().newContext();
  const vue = await visiteur.newPage();
  const lettre = `${ADMIN}/plugins/aloha-courriels/lettre`;
  const envoye = { lien: null, expediteur: null };
  const reglagesDesCourriels = `${ADMIN}/plugins/aloha-courriels/reglages`;
  const expediteur = async (valeur) => {
    await ouvrir(reglagesDesCourriels);
    const champ = page.getByLabel(/^Adresse d'expédition/);
    if (envoye.expediteur === null) envoye.expediteur = await champ.inputValue();
    if ((await champ.inputValue()) === valeur) return;
    await champ.fill(valeur);
    await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
    await page.waitForTimeout(1200);
  };
  return [
    {
      nom: "Auteur d'un article choisi par son nom",
      faire: () => champ("author", noor),
      verifierFait: async () => (await o.bientot(() => listeLe("/authors/noor-benali/"))) && (await listeLe("/fr/authors/noor-benali/")) && !(await listeLe("/authors/tomas-abaroa/")),
      restaurer: () => champ("author", tomas),
      verifierRestaure: async () => (await o.bientot(() => listeLe("/authors/tomas-abaroa/"))) && !(await listeLe("/authors/noor-benali/")),
    },
    {
      nom: "Sujet d'un article choisi par son nom",
      faire: () => champ("topic", design),
      verifierFait: async () => (await o.bientot(() => listeLe("/topics/design/"))) && (await listeLe("/fr/topics/design/")),
      restaurer: () => champ("topic", typo),
      verifierRestaure: async () => (await o.bientot(() => listeLe("/topics/typography/"))) && !(await listeLe("/topics/design/")),
    },
    {
      nom: "Etiquette ajoutee a un article",
      faire: ajouterEtiquette,
      verifierFait: async () =>
        (await o.bientot(async () => (await anonyme(`/tags/${adresseEtiquette}/`)).statut === 200)) &&
        (await listeLe(`/tags/${adresseEtiquette}/`)) &&
        (await anonyme("/blog/a-type-scale-you-can-defend/")).html.includes(`/tags/${adresseEtiquette}/`) &&
        (await anonyme(`/fr/tags/${adresseEtiquette}/`)).statut === 200,
      restaurer: retirerEtiquette,
      verifierRestaure: async () => (await o.bientot(async () => (await anonyme(`/tags/${adresseEtiquette}/`)).statut === 404)) && !(await anonyme("/blog/a-type-scale-you-can-defend/")).html.includes(`/tags/${adresseEtiquette}/`),
    },
    {
      nom: "Lettre : inscription confirmee, article envoye, desinscription",
      faire: async () => {
        await ouvrir(reglagesDesCourriels);
        const actuelle = await page.getByLabel(/^Adresse d'expédition/).inputValue();
        await expediteur(actuelle || "lettre@reef.test");
        await vue.goto(`${o.url}/fr/`, { waitUntil: "networkidle" });
        await vue.locator("#home-newsletter-email").fill(abonne);
        await vue.locator('form[name="newsletter-home"] button[type="submit"]').click();
        await vue.waitForURL(/lettre=attente/);
        const confirmer = await o.bientot(async () => !!lienDans("/confirmer")) ? lienDans("/confirmer") : null;
        if (!confirmer) throw new Error("courriel de confirmation introuvable");
        await vue.goto(confirmer, { waitUntil: "networkidle" });
        await ouvrir(lettre);
        await choisir(/Article à envoyer/, "Une échelle typographique défendable");
        await page.getByRole("button", { name: /^Envoyer à / }).click();
        await page.getByRole("button", { name: "Envoyer", exact: true }).click();
        await page.getByText(/L'article est parti vers/).first().waitFor();
        envoye.lien = lienDans("/desinscrire");
      },
      verifierFait: async () =>
        (await vue.locator("#lettre-avis").innerText()).includes("C'est confirmé") &&
        (await page.getByText(abonne).count()) > 0 &&
        courrielsLocaux().some((t) => t.includes("/blog/a-type-scale-you-can-defend/") && t.includes("/desinscrire?jeton=")),
      restaurer: async () => {
        if (!envoye.lien) throw new Error("lien de desinscription introuvable");
        await vue.goto(envoye.lien, { waitUntil: "networkidle" });
        await vue.getByRole("button", { name: "Me désinscrire" }).click();
        await vue.waitForURL(/lettre=desinscrit/);
        await expediteur(envoye.expediteur ?? "");
      },
      verifierRestaure: async () => {
        const avis = (await vue.locator("#lettre-avis").innerText()).includes("Vous êtes désinscrit");
        await ouvrir(lettre);
        return avis && (await page.getByText(abonne).count()) === 0;
      },
    },
    {
      nom: "Police du site choisie",
      faire: () => police("Classique, à empattements"),
      verifierFait: async () => (await o.bientot(() => policeClassique("/"))) && (await policeClassique("/fr/")) && (await policeClassique("/blog/")),
      restaurer: () => police("Police d'origine du thème"),
      verifierRestaure: async () => (await o.bientot(() => policeDuTheme("/"))) && (await policeDuTheme("/fr/")),
    },
    {
      nom: "Bloc de l'accueil deplace",
      faire: () => place("1"),
      verifierFait: async () => (await o.bientot(() => lettreEnHaut("/"))) && (await lettreEnHaut("/fr/")),
      restaurer: () => place(""),
      verifierRestaure: async () => (await o.bientot(async () => !(await lettreEnHaut("/")))) && !(await lettreEnHaut("/fr/")),
    },
    {
      nom: "Articles par page dans les reglages",
      faire: () => reglageGeneral("Articles par page", "3"),
      verifierFait: async () => (await anonyme("/blog/2/")).statut === 200,
      restaurer: () => reglageGeneral("Articles par page", "9"),
      verifierRestaure: async () => (await anonyme("/blog/2/")).statut === 404,
    },
    {
      nom: "Sujet renomme",
      faire: () => nomDuSujet("Essai sujet"),
      verifierFait: async () => (await anonyme("/topics/")).texte.includes("Essai sujet") && (await anonyme("/topics/craft/")).texte.includes("Essai sujet"),
      restaurer: () => nomDuSujet(craft.data.name),
      verifierRestaure: async () => !(await anonyme("/topics/")).texte.includes("Essai sujet"),
    },
    {
      nom: "Billet ajoute et publie",
      faire: async () => {
        await ouvrir(`${ADMIN}/content/posts/new`);
        await page.locator("#field-title").fill("Essai billet");
        await page.locator("#field-description").fill("Essai du guide : un billet.");
        // Sujet et auteur par leur nom, dans la liste de l'extension "champs".
        await page.locator("#field-topic").selectOption({ label: "Craft" });
        await page.locator("#field-author").selectOption({ label: "Mara Lindqvist" });
        await page.getByLabel(/^(Adresse web|Slug)$/).fill(`essai-billet-${o.suffixe}`);
        await enregistrerEtPublier();
      },
      verifierFait: async () => (await anonyme(`/blog/essai-billet-${o.suffixe}/`)).statut === 200 && (await anonyme("/blog/")).texte.includes("Essai billet"),
      restaurer: () => corbeille("posts", `essai-billet-${o.suffixe}`),
      verifierRestaure: async () => (await anonyme(`/blog/essai-billet-${o.suffixe}/`)).statut === 404 && !(await anonyme("/blog/")).texte.includes("Essai billet"),
    },
  ];
}
