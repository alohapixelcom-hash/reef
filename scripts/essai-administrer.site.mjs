// scripts/essai-administrer.site.mjs - les gestes du guide propres a Reef (articles par page, un sujet renomme, un billet publie), rejoues apres les gestes communs par scripts/essai-administrer.mjs du socle.
//
// Fichier du site : son export par defaut recoit les outils du script commun
// et rend une liste de gestes { nom, faire, verifierFait, restaurer,
// verifierRestaure }. Reef n'a pas de prix : ses reglages propres sont le
// nombre de billets par page, ses sujets et ses billets, et (3.8.1) la police
// du site et la place d'un bloc sur l'accueil.

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
  return [
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
        await choisir(/^Sujet/, "Craft");
        await choisir(/^Auteur/, "Mara-lindqvist");
        await page.getByLabel(/^(Adresse web|Slug)$/).fill(`essai-billet-${o.suffixe}`);
        await enregistrerEtPublier();
      },
      verifierFait: async () => (await anonyme(`/blog/essai-billet-${o.suffixe}/`)).statut === 200 && (await anonyme("/blog/")).texte.includes("Essai billet"),
      restaurer: () => corbeille("posts", `essai-billet-${o.suffixe}`),
      verifierRestaure: async () => (await anonyme(`/blog/essai-billet-${o.suffixe}/`)).statut === 404 && !(await anonyme("/blog/")).texte.includes("Essai billet"),
    },
  ];
}
