// scripts/essai-administrer.gestes.mjs - les gestes du guide communs a tous les themes (generique), parametres par ESSAI_DE_L_ADMINISTRATION de theme.ts ; lus par essai-administrer.mjs.
//
// Chaque fonction rend une liste de gestes { nom, faire, verifierFait,
// restaurer, verifierRestaure } ; un geste dont le parametre manque n'y est
// pas. Les valeurs d'origine sont lues avant tout geste (API en lecture
// seule), pour que la restauration rende exactement la base de depart.

/** "section[aria-labelledby=\"hero-title\"]" -> 'aria-labelledby="hero-title"' : le morceau de HTML qui situe le bloc dans la page anonyme. */
const marqueDuSelecteur = (selecteur) => {
  const m = /\[([\w-]+)="([^"]+)"\]/.exec(selecteur);
  return m ? `${m[1]}="${m[2]}"` : null;
};
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MEDIA = "_emdash(%2F|\\/)api(%2F|\\/)media";

/** Les gestes 1 a 8 du guide : titre, photo, bouton, bloc masque, menu, pied, nom du site, logo, page libre. */
export async function gestesCommuns(P, o) {
  const { page, url, ADMIN, IMAGE, anonyme, entree, ouvrir, editerDansLaPage, publierParLaBarre, ouvrirSection, enregistrerEtPublier } = o;
  const gestes = [];

  if (P.titre) {
    const { entree: slug, selecteur, champ = "title", page: ou = "/" } = P.titre;
    const origine = (await entree("sections", slug)).data[champ];
    gestes.push({
      nom: "Titre par la barre",
      faire: async () => {
        await ouvrir(url + ou);
        await editerDansLaPage(page.locator(selecteur), "Essai du guide");
        if ((await anonyme(ou)).texte.includes("Essai du guide")) throw new Error("visible avant Publier");
        await publierParLaBarre();
      },
      verifierFait: async () => (await anonyme(ou)).texte.includes("Essai du guide"),
      restaurer: async () => {
        await ouvrir(url + ou);
        await editerDansLaPage(page.locator(selecteur), origine);
        await publierParLaBarre();
      },
      verifierRestaure: async () => !(await anonyme(ou)).texte.includes("Essai du guide"),
    });
  }

  if (P.bandeau) {
    const { selecteur, page: ou = "/" } = P.bandeau;
    const pastille = (champ) => page.locator(`${selecteur} [data-aloha-pastilles] [data-emdash-ref*='"field":"${champ}"']`).first();
    const marque = marqueDuSelecteur(selecteur);
    // La photo choisie, cherchee dans le bloc quand on sait le situer (une autre photo de la page ne compte pas).
    const photoChoisie = (html) => new RegExp(marque ? `${echapper(marque)}[\\s\\S]{0,4000}?${MEDIA}` : MEDIA).test(html);
    if (P.bandeau.photo !== false) {
      gestes.push({
        nom: "Photo du bandeau par la pastille",
        faire: async () => {
          await ouvrir(url + ou);
          await pastille("image").click();
          await page.locator("#emdash-img-upload").setInputFiles(IMAGE);
          await page.locator("#emdash-tb-publish").waitFor({ state: "visible", timeout: 30000 });
          await publierParLaBarre();
        },
        verifierFait: async () => photoChoisie((await anonyme(ou)).html),
        restaurer: async () => {
          await ouvrir(url + ou);
          await pastille("image").click();
          await page.locator('.emdash-img-popover [data-action="remove"]').click();
          await page.locator("#emdash-tb-publish").waitFor({ state: "visible" });
          await publierParLaBarre();
        },
        verifierRestaure: async () => !photoChoisie((await anonyme(ou)).html),
      });
    }
    if (P.bandeau.bouton !== false) {
      gestes.push({
        nom: "Adresse du bouton principal par sa pastille",
        faire: async () => {
          await ouvrir(url + ou);
          await editerDansLaPage(pastille("cta_link"), "/essai-lien/");
          await publierParLaBarre();
        },
        verifierFait: async () => (await anonyme(ou)).html.includes('href="/essai-lien/"'),
        restaurer: async () => {
          await ouvrir(url + ou);
          await editerDansLaPage(pastille("cta_link"), " ");
          await publierParLaBarre();
        },
        verifierRestaure: async () => !(await anonyme(ou)).html.includes("/essai-lien/"),
      });
    }
  }

  if (P.masquer) {
    const { entree: slug, marqueur, page: ou = "/" } = P.masquer;
    const basculer = async () => {
      await ouvrirSection(slug);
      await page.locator("#field-hidden").click();
      await enregistrerEtPublier();
    };
    gestes.push({
      nom: `Bloc ${slug} masque`,
      faire: basculer,
      verifierFait: async () => !(await anonyme(ou)).html.includes(marqueur),
      restaurer: basculer,
      verifierRestaure: async () => (await anonyme(ou)).html.includes(marqueur),
    });
  }

  if (P.menu) {
    const { nom, rang, libelle, page: ou = "/" } = P.menu;
    gestes.push({
      nom: "Lien du menu principal renomme",
      faire: () => o.renommerLien(nom, rang, "Essai menu"),
      verifierFait: async () => (await anonyme(ou)).html.includes("Essai menu"),
      restaurer: () => o.renommerLien(nom, rang, libelle),
      verifierRestaure: async () => !(await anonyme(ou)).html.includes("Essai menu"),
    });
  }

  if (P.pied) {
    const { menu, page: ou = "/" } = P.pied;
    gestes.push({
      nom: "Lien ajoute a une colonne du pied",
      faire: () => o.ajouterLien(menu, "Essai pied", "/essai-pied/"),
      verifierFait: async () => (await anonyme(ou)).html.includes('href="/essai-pied/"'),
      restaurer: () => o.retirerDernierLien(menu),
      verifierRestaure: async () => !(await anonyme(ou)).html.includes("/essai-pied/"),
    });
  }

  if (P.nomDuSite) {
    const { valeur, page: ou = "/about/" } = P.nomDuSite;
    gestes.push({
      nom: "Nom du site dans les reglages",
      faire: () => o.reglageGeneral("Titre du site", "Essai Maree"),
      verifierFait: async () => /<title>[^<]*Essai Maree/.test((await anonyme(ou)).html),
      restaurer: () => o.reglageGeneral("Titre du site", valeur),
      verifierRestaure: async () => !(await anonyme(ou)).html.includes("Essai Maree"),
    });
  }

  if (P.logo) {
    const motif = new RegExp(P.logo.motif);
    const ou = P.logo.page ?? "/";
    gestes.push({
      nom: "Logo dans les reglages",
      faire: async () => {
        await ouvrir(`${ADMIN}/settings/general`);
        await page.getByRole("button", { name: "Sélectionner le logo" }).click();
        await page.locator('[role=dialog] input[type="file"]').setInputFiles(IMAGE);
        // Le fichier envoye est choisi d'office : "Choisir" valide.
        const choisir = page.locator("[role=dialog]").getByRole("button", { name: "Choisir", exact: true });
        await choisir.and(page.locator(":enabled")).waitFor({ timeout: 20000 });
        await choisir.click();
        await page.waitForTimeout(800);
        await page.getByRole("button", { name: /^Enregistrer/ }).first().click();
        await page.waitForTimeout(1000);
      },
      verifierFait: async () => motif.test((await anonyme(ou)).html),
      restaurer: async () => {
        await ouvrir(`${ADMIN}/settings/general`);
        await page.getByRole("button", { name: "Supprimer", exact: true }).first().click();
        await page.waitForTimeout(500);
        const enregistrer = page.getByRole("button", { name: /^Enregistrer(\s+Enregistrer)?$/ }).first();
        if (await enregistrer.isEnabled().catch(() => false)) await enregistrer.click();
        await page.waitForTimeout(1000);
      },
      verifierRestaure: async () => !motif.test((await anonyme(ou)).html),
    });
  }

  if (P.pageLibre) {
    const { menu } = P.pageLibre;
    const slug = `essai-page-${o.suffixe}`;
    gestes.push({
      nom: "Page ajoutee et mise au menu",
      faire: async () => {
        await ouvrir(`${ADMIN}/content/pages/new`);
        await page.locator("#field-title").fill("Essai page");
        await page.getByLabel(/^(Adresse web|Slug)$/).fill(slug);
        await enregistrerEtPublier();
        await o.ajouterLien(menu, "Essai page", `/${slug}/`);
      },
      verifierFait: async () => (await anonyme(`/${slug}/`)).statut === 200 && (await anonyme("/")).html.includes(`href="/${slug}/"`),
      restaurer: async () => {
        await o.retirerDernierLien(menu);
        await o.corbeille("pages", slug);
      },
      verifierRestaure: async () => (await anonyme(`/${slug}/`)).statut === 404 && !(await anonyme("/")).html.includes(`/${slug}/`),
    });
  }
  return gestes;
}

/** Les deux derniers gestes du guide : une redirection, un titre SEO ; puis la police du site et la place d'un bloc de l'accueil. */
export async function gestesDeFin(P, o) {
  const { page, ADMIN, anonyme, entree, ouvrir, ouvrirSection, enregistrerEtPublier } = o;
  const gestes = [];
  if (P.police) {
    const pages = P.police.pages ?? ["/"];
    const site = await entree("site", "site");
    const police = async (nom) => {
      await ouvrir(`${ADMIN}/content/site/${site.id}?locale=${o.langue ?? "en"}`);
      await o.choisir(/^Police du site/, nom);
      await enregistrerEtPublier();
    };
    // La police choisie : la feuille de typographie.ts posee en tete (pile a empattements), sans prechargement de police du theme.
    const classique = (html) => /<style>:root\{--[\w-]+:ui-serif/.test(html) && !/rel="preload"[^>]*woff2/.test(html);
    const origine = (html) => !/<style>:root\{--[\w-]+:ui-serif/.test(html);
    const partout = async (test) => {
      for (const ou of pages) if (!test((await anonyme(ou)).html)) return false;
      return true;
    };
    gestes.push({
      nom: "Police du site choisie",
      faire: () => police("Classique, à empattements"),
      verifierFait: async () => (await o.bientot(() => partout(classique))),
      restaurer: () => police("Police d'origine du thème"),
      verifierRestaure: async () => (await o.bientot(() => partout(origine))),
    });
  }
  if (P.ordre) {
    const { entree: slug, marqueBloc, marqueTete } = P.ordre;
    const pages = P.ordre.pages ?? ["/"];
    const place = async (valeur) => {
      await ouvrirSection(slug);
      await page.locator("#field-order").fill(valeur);
      await enregistrerEtPublier();
    };
    const enTete = async (ou) => {
      const { html } = await anonyme(ou);
      const bloc = html.indexOf(marqueBloc);
      const tete = html.indexOf(marqueTete);
      return bloc !== -1 && tete !== -1 && bloc < tete;
    };
    const partout = async (attendu) => {
      for (const ou of pages) if ((await enTete(ou)) !== attendu) return false;
      return true;
    };
    gestes.push({
      nom: `Bloc ${slug} place en tete de l'accueil`,
      faire: () => place("1"),
      verifierFait: async () => (await o.bientot(() => partout(true))),
      restaurer: () => place(""),
      verifierRestaure: async () => (await o.bientot(() => partout(false))),
    });
  }
  if (P.redirection) {
    const { vers } = P.redirection;
    gestes.push({
      nom: "Redirection 301",
      faire: async () => {
        await ouvrir(`${ADMIN}/redirects`);
        await page.getByRole("button", { name: "Nouvelle redirection" }).click();
        await page.getByLabel("Chemin source").fill("/essai-ancien/");
        await page.getByLabel("Chemin d'arrivée").fill(vers);
        await page.getByRole("button", { name: "Créer" }).click();
        await page.waitForTimeout(1000);
      },
      verifierFait: async () => {
        const r = await anonyme("/essai-ancien/");
        return r.statut === 301 && (r.entetes.get("location") ?? "").endsWith(vers);
      },
      restaurer: async () => {
        await ouvrir(`${ADMIN}/redirects`);
        await page.getByRole("button", { name: /Supprimer/ }).first().click();
        const confirmer = page.locator("[role=dialog]").getByRole("button", { name: /Supprimer/ });
        if (await confirmer.isVisible().catch(() => false)) await confirmer.click();
        await page.waitForTimeout(1000);
      },
      verifierRestaure: async () => (await anonyme("/essai-ancien/")).statut === 404,
    });
  }
  if (P.seo) {
    const { entree: slug, page: ou, champ = "meta_title" } = P.seo;
    const origine = (await entree("sections", slug)).data[champ];
    const titreSeo = async (valeur) => {
      await ouvrirSection(slug);
      await page.locator(`#field-${champ}`).fill(valeur ?? "");
      await enregistrerEtPublier();
    };
    gestes.push({
      nom: `Titre SEO de ${ou}`,
      faire: () => titreSeo("Essai SEO"),
      verifierFait: async () => /<title>Essai SEO/.test((await anonyme(ou)).html),
      restaurer: () => titreSeo(origine),
      verifierRestaure: async () => !(await anonyme(ou)).html.includes("Essai SEO"),
    });
  }
  return gestes;
}
