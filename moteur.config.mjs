// moteur.config.mjs - le moteur de publication, debrayable : sans ALOHA_MOTEUR, Reef reste un site 100% statique.
//
// POURQUOI UN FICHIER A PART : astro.config.mjs decrit le theme, celui-ci
// decrit le moteur. Qui n'achete que le theme ne lit jamais ce fichier, et
// qui allume le moteur n'a qu'une variable a poser.
//
// Le moteur est EmDash (MIT, emdashcms.com) : la base D1 porte le contenu, R2
// les medias, et les pages gerees se rendent a la demande. Publier dans le
// back office ecrit en base, et la page suivante le montre : aucun build.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { IDENTITE as ACCUEIL } from "./src/moteur/accueil/identite.mjs";
import { catalogueDuBackOffice } from "./src/moteur/catalogue-bo.config.mjs";
import { IDENTITE as DEPLOYER } from "./src/moteur/deployer/identite.mjs";
import { PAGES_GEREES } from "./src/moteur/pages-gerees.mjs";
import { routesDuCache } from "./src/moteur/routes-du-cache.mjs";

const ici = (chemin) => fileURLToPath(new URL(chemin, import.meta.url));

/** Vrai quand le moteur est allume. Lu au build ET par `astro dev`. */
export const MOTEUR_ACTIF = process.env.ALOHA_MOTEUR === "emdash";

// LES IMAGES DES PAGES RENDUES A LA DEMANDE.
//
// "compile" seul les laisserait sortir dans leur poids d'origine : sharp ne
// tourne qu'au build, et une page rendue a la demande n'a pas de build. Mesure
// sur l'accueil de Kai le 21 septembre 2026 : 552 430 octets par largeur au
// lieu de 19 960. Le liant Images de Cloudflare fait a la demande ce que sharp
// fait au build ; il demande Cloudflare Images sur le compte.
//
// ALOHA_IMAGES=origine garde "compile" seul, pour qui n'a pas ce service : le
// site marche, ses images gerees sont simplement plus lourdes.
const IMAGES =
  process.env.ALOHA_IMAGES === "origine" ? "compile" : { build: "compile", runtime: "cloudflare-binding" };

// LE CACHE D'OBJETS. Aucun par defaut : les pages gerees lisent la base a
// chaque requete, et une publication se voit en moins de 100 ms (docs/moteur.md).
// Un site a fort trafic peut garder ces lectures :
//   ALOHA_CACHE_OBJETS=kv       dans Cloudflare KV (liant "CACHE" a declarer dans wrangler.moteur.jsonc)
//   ALOHA_CACHE_OBJETS=memoire  dans la memoire du processus (essais locaux)
// EmDash l'invalide a chaque ecriture ; le bouton "Tout deployer" le vide en entier.
const CACHE_OBJETS = ["kv", "memoire"].includes(process.env.ALOHA_CACHE_OBJETS ?? "")
  ? process.env.ALOHA_CACHE_OBJETS
  : null;

// LE CACHE DE ROUTES. Aucun par defaut, pour la meme raison. Un site a fort
// trafic peut garder ses pages gerees au bord du reseau :
//   ALOHA_CACHE_ROUTES=cloudflare  dans Workers Cache (a activer aussi dans wrangler.moteur.jsonc, voir docs/moteur.md)
//   ALOHA_CACHE_ROUTES=memoire     dans la memoire du processus (essais locaux : prouve la purge a la publication)
// Chaque page geree declare alors sa duree et porte l'etiquette de ses
// collections : a chaque publication, EmDash purge ces etiquettes, et la page
// suivante est rendue a neuf. "Tout deployer" vide le tout.
const CACHE_ROUTES = ["cloudflare", "memoire"].includes(process.env.ALOHA_CACHE_ROUTES ?? "")
  ? process.env.ALOHA_CACHE_ROUTES
  : null;

/** Une page en cache sert au plus une minute de retard si une purge se perd ; au-dela, elle est rendue a neuf en arriere-plan. */
const DUREE_DU_CACHE = { maxAge: 60, swr: 600 };

// LA LANGUE DU BACK OFFICE. Le francais par defaut : Reef s'edite en
// francais, et un libelle anglais dans le rail est un defaut. ALOHA_BO_LANGUE
// reste le levier - ALOHA_BO_LANGUE=en rend le back office a l'anglais,
// ALOHA_BO_LANGUE=navigateur le laisse suivre chaque navigateur, comme le
// moteur le fait seul (28 langues). Dans tous les cas, chaque personne garde
// le dernier mot dans ses reglages : ce qui est pose ici n'est qu'un defaut
// (voir src/moteur/langue-bo.ts).
//
// Le catalogue francais d'EmDash 0.38 laisse 678 messages en anglais ; le
// dictionnaire du theme les complete (voir src/moteur/catalogue-bo.ts).
// ALOHA_BO_FUSEAU regle le fuseau des heures affichees par les extensions.
const LANGUE_DEMANDEE = (process.env.ALOHA_BO_LANGUE ?? "").trim();
const LANGUE_BO =
  LANGUE_DEMANDEE === "navigateur"
    ? null
    : /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(LANGUE_DEMANDEE)
      ? LANGUE_DEMANDEE
      : "fr";
const FUSEAU_BO = (process.env.ALOHA_BO_FUSEAU ?? "").trim() || "Europe/Paris";

/** Les collections du schema (seed/seed.json) : ce sont les etiquettes qu'EmDash purge a chaque publication. */
function collectionsDuSchema() {
  const graine = JSON.parse(readFileSync(ici("./seed/seed.json"), "utf8"));
  return (graine.collections ?? []).map((collection) => collection.slug);
}

/** Rend a la demande les pages gerees, fige toutes les autres, ajoute le plan de site et /version.json, habille le back office. */
function partageDesPages() {
  return {
    name: "aloha:moteur-pages",
    hooks: {
      "astro:config:setup": ({ config, injectRoute, addMiddleware, updateConfig }) => {
        // Le cache de routes ne vaut que pour les pages gerees, un motif par
        // langue (voir routes-du-cache.mjs) : l'API et l'administration du
        // moteur n'en recoivent aucun. Le plan de site des pages gerees change
        // avec elles.
        if (CACHE_ROUTES) {
          const regle = { ...DUREE_DU_CACHE, tags: collectionsDuSchema() };
          const { locales, defaultLocale } = config.i18n ?? { locales: [], defaultLocale: "" };
          const langues = locales.map((l) => (typeof l === "string" ? l : l.path));
          updateConfig({
            routeRules: { ...routesDuCache(PAGES_GEREES, langues, defaultLocale, regle), "/sitemap-contenu.xml": regle },
          });
        }
        // Habille le back office aux jetons du theme (voir habillage.ts).
        addMiddleware({ entrypoint: ici("./src/moteur/habillage.ts"), order: "post" });
        // La langue par defaut du back office, seulement si elle est demandee.
        if (LANGUE_BO) addMiddleware({ entrypoint: ici("./src/moteur/langue-bo.ts"), order: "post" });
        injectRoute({ pattern: "/sitemap-contenu.xml", entrypoint: ici("./src/moteur/plan-du-site.ts"), prerender: false });
        injectRoute({ pattern: "/version.json", entrypoint: ici("./src/moteur/version.ts"), prerender: false });
        // Figees ICI, une fois par build : l'horodatage est la preuve que
        // montre "Tout deployer" (il ne change que si un nouveau build est en
        // ligne), et les caches declares sont ceux que le bouton a le droit
        // de dire "vides". Le cache de routes se lit dans la configuration
        // d'Astro elle-meme : qui en pose un n'a rien d'autre a declarer.
        const { version } = JSON.parse(readFileSync(ici("./package.json"), "utf8"));
        updateConfig({
          vite: {
            plugins: CATALOGUE_BO ? [CATALOGUE_BO.greffon] : [],
            define: {
              __ALOHA_VERSION__: JSON.stringify(version),
              __ALOHA_CONSTRUIT__: JSON.stringify(new Date().toISOString()),
              __ALOHA_CACHES__: JSON.stringify({ objets: CACHE_OBJETS, routes: config.cache?.provider?.name ?? null }),
              __ALOHA_BO_LANGUE__: JSON.stringify(LANGUE_BO),
              __ALOHA_BO_FUSEAU__: JSON.stringify(FUSEAU_BO),
            },
          },
        });
      },
      "astro:route:setup": ({ route }) => {
        if (!route.component.startsWith("src/pages/")) return;
        route.prerender = !PAGES_GEREES.includes(route.component);
      },
    },
  };
}

// Le catalogue francais du back office (piece du socle, voir en tete de
// src/moteur/catalogue-bo.ts) : son alias entre dans `alias`, son greffon dans
// `vite.plugins`, moteur allume seulement.
const CATALOGUE_BO = MOTEUR_ACTIF ? catalogueDuBackOffice(import.meta.url) : null;

/** Les alias de Vite, en tableau : c'est la forme que le greffon du catalogue attend. */
const alias = (source) => [
  { find: "@moteur/source", replacement: ici(`./src/moteur/source.${source}.ts`) },
  { find: "@moteur/live", replacement: ici(`./src/moteur/live.${source}.ts`) },
  { find: "@moteur/TexteRiche.astro", replacement: ici(`./src/moteur/TexteRiche.${source}.astro`) },
  ...(CATALOGUE_BO?.alias ?? []),
];

/** Le fournisseur du cache de routes (`cache` d'Astro), quand ALOHA_CACHE_ROUTES est posee ; rien sinon. Les regles se posent dans partageDesPages. */
async function cacheDeRoutes() {
  if (!CACHE_ROUTES) return {};
  // "cloudflare" passe par src/moteur/cache-routes.ts : le fournisseur de
  // l'adapter, dont une purge impossible ne casse pas une publication.
  const provider =
    CACHE_ROUTES === "cloudflare"
      ? { name: "cloudflare", entrypoint: ici("./src/moteur/cache-routes.ts") }
      : (await import("astro/config")).memoryCache();
  return { cache: { provider } };
}

// Les paquets du moteur ne se chargent QUE moteur allume : un build statique
// ne lit ni l'adapter Cloudflare ni EmDash, et n'en paie pas le demarrage.
async function allume() {
  const { default: cloudflare } = await import("@astrojs/cloudflare");
  const { default: react } = await import("@astrojs/react");
  const { d1, r2, kvCache } = await import("@emdash-cms/cloudflare");
  const { default: emdash, memoryCache } = await import("emdash/astro");
  const cacheObjets = { kv: () => kvCache({ binding: "CACHE" }), memoire: () => memoryCache() }[CACHE_OBJETS ?? ""];
  return {
    alias: alias("emdash"),
    // Declare dans l'index du plan de site (customSitemaps, astro.config.mjs).
    plans: ["/sitemap-contenu.xml"],
    config: {
      // "server" est ce qu'EmDash attend pour ses propres routes ; le
      // partage ci-dessus refige aussitot toutes les pages non gerees.
      output: "server",
      // Les routes du moteur (/_emdash/api/...) s'appellent sans barre
      // finale, et "always" leur repondrait 404.
      trailingSlash: "ignore",
      adapter: cloudflare({ configPath: "./wrangler.moteur.jsonc", imageService: IMAGES }),
      ...(await cacheDeRoutes()),
    },
    integrations: [
      react(),
      emdash({
        database: d1({ binding: "DB" }),
        storage: r2({ binding: "MEDIA" }),
        // Le back office porte le nom et la marque du site, pas ceux du moteur.
        admin: { siteName: "Reef", logo: "/favicon.svg", favicon: "/favicon.svg" },
        ...(cacheObjets ? { objectCache: cacheObjets() } : {}),
        // "Tout deployer" : extension native rangee dans le depot. EmDash
        // l'importe par son chemin et l'embarque dans le Worker au build.
        plugins: [
          { ...DEPLOYER, entrypoint: ici("./src/moteur/deployer/extension.ts") },
          // La carte du site sur le tableau de bord : une extension React, son
          // composant est importe par le paquet de l'administration.
          {
            ...ACCUEIL,
            entrypoint: ici("./src/moteur/accueil/extension.ts"),
            adminEntry: ici("./src/moteur/accueil/carte.ts"),
          },
        ],
      }),
      partageDesPages(),
    ],
  };
}

/**
 * Ce qu'astro.config.mjs etale dans sa propre configuration. Le type est ecrit
 * ici pour que `trailingSlash` reste le litteral "ignore" et non une chaine
 * quelconque : astro.config.mjs est controle (@ts-check), et le refuserait.
 *
 * @type {{
 *   alias: { find: string | RegExp, replacement: string }[],
 *   plans: string[],
 *   config: import("astro").AstroUserConfig,
 *   integrations: import("astro").AstroIntegration[],
 * }}
 */
export const moteur = MOTEUR_ACTIF
  ? await allume()
  : { alias: alias("fichiers"), plans: [], config: {}, integrations: [] };
