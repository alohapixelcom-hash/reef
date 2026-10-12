// src/moteur/seo/site.ts - ce que le plan vivant et l'ecran SEO de Reef savent du site : ses langues, ses adresses rendues a la demande, ses collections.
//
// Fichier du SITE : le socle le pose une fois puis ne le reecrit plus.
//
// (b) LES ADRESSES RENDUES A LA DEMANDE : le plan des pages gerees que le theme
// tient deja (src/moteur/plan-du-site.ts : accueil, blog, sujets, auteurs, etiquettes, annexes, dans les deux langues),
// repris tel quel par depuisUneRoute, alternatives de langue comprises. Il n'a
// plus d'adresse publique a lui : /sitemap-contenu.xml repond 301 vers l'index.
// (c) LES COLLECTIONS : les pages libres publiees entrent au plan ; les entrees de posts, sujets, auteurs, deja listees par le plan des pages gerees, y prennent
// seulement leur date (`ajoute: false`).
// (a) LES PAGES FIGEES viennent du manifeste du build (integration planFige de
// moteur.config.mjs).
import type { APIContext } from "astro";
import { GET as llmsDuSite } from "../../pages/llms.txt";
import { GET as planDesPagesGerees } from "../plan-du-site";
import type { ReglagesDuSeo } from "./fichiers.ts";
import { type AdresseDEntree, depuisUneRoute, type OptionsDuPlanVivant } from "./route.ts";

/** L'anglais a la racine, le francais sous /fr/ (src/i18n/config.ts). */
const prefixe = (locale: string | null): string => (locale === "fr" ? "/fr" : "");
const sous = (chemin: string): AdresseDEntree => (e) => `${prefixe(e.locale)}${chemin}${e.slug}/`;

export const PLAN: OptionsDuPlanVivant = {
  langues: { parDefaut: "en", prefixes: { fr: "/fr" } },
  aLaDemande: depuisUneRoute(planDesPagesGerees),
  collections: {
    pages: { adresse: sous("/") },
    posts: { adresse: sous("/blog/"), ajoute: false },
    sujets: { adresse: sous("/topics/"), ajoute: false },
    auteurs: { adresse: sous("/authors/"), ajoute: false },
  },
  // La recherche, les exemples et les pages introuvables portent noindex : jamais au plan.
  horsDuPlan: /^\/(?:[a-z]{2}\/)?(?:404|examples|search)(?:\/|$)/,
};

/**
 * llms.txt se rend a la demande moteur allume (src/moteur/pages-gerees.mjs) :
 * son texte par defaut, montre dans l'ecran SEO, est celui que sa route rend.
 * robots.txt est fige : null, les fichiers publics le donnent.
 */
// L'adresse publique du site, la meme que `site` dans astro.config.mjs.
const ORIGINE = "https://reef.alohapixel.app";

export const SEO: ReglagesDuSeo = {
  liaison: "DB",
  texteParDefaut: async (nom) => {
    if (nom !== "llms") return null;
    const r = await llmsDuSite({ site: new URL(ORIGINE), url: new URL("/llms.txt", ORIGINE) } as unknown as APIContext);
    return r.ok ? r.text() : null;
  },
};
