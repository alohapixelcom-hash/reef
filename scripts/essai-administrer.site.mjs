// scripts/essai-administrer.site.mjs - les gestes du guide propres a Reef (articles par page, un sujet renomme, un billet publie), rejoues apres les gestes communs par scripts/essai-administrer.mjs du socle.
//
// Fichier du site : son export par defaut recoit les outils du script commun
// et rend une liste de gestes { nom, faire, verifierFait, restaurer,
// verifierRestaure }. Reef n'a pas de prix : ses reglages propres sont le
// nombre de billets par page, ses sujets et ses billets.

export default async function gestesDeReef(o) {
  const { page, ADMIN, anonyme, entree, ouvrir, enregistrerEtPublier, reglageGeneral, corbeille, choisir } = o;
  const craft = await entree("sujets", "craft");
  const nomDuSujet = async (nom) => {
    await ouvrir(`${ADMIN}/content/sujets/${craft.id}?locale=en`);
    await page.locator("#field-name").fill(nom);
    await enregistrerEtPublier();
  };
  return [
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
