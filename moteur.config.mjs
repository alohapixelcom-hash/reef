// moteur.config.mjs - le moteur de publication, debrayable : sans ALOHA_MOTEUR, Reef reste un site 100% statique.
//
// POURQUOI UN FICHIER A PART : astro.config.mjs decrit le theme, celui-ci
// decrit le moteur. Qui n'achete que le theme ne lit jamais ce fichier, et
// qui allume le moteur n'a qu'une variable a poser.
//
// Le moteur est EmDash (MIT, emdashcms.com) : la base D1 porte le contenu, R2
// les medias, et les pages gerees se rendent a la demande. Publier dans le
// back office ecrit en base, et la page suivante le montre : aucun build.
import { fileURLToPath } from "node:url";
import { PAGES_GEREES } from "./src/moteur/pages-gerees.mjs";

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

/** Rend a la demande les pages gerees, fige toutes les autres, ajoute le plan de site et habille le back office. */
function partageDesPages() {
  return {
    name: "aloha:moteur-pages",
    hooks: {
      "astro:config:setup": ({ injectRoute, addMiddleware }) => {
        // Habille le back office aux jetons du theme (voir habillage.ts).
        addMiddleware({ entrypoint: ici("./src/moteur/habillage.ts"), order: "post" });
        injectRoute({ pattern: "/sitemap-contenu.xml", entrypoint: ici("./src/moteur/plan-du-site.ts"), prerender: false });
      },
      "astro:route:setup": ({ route }) => {
        if (!route.component.startsWith("src/pages/")) return;
        route.prerender = !PAGES_GEREES.includes(route.component);
      },
    },
  };
}

const alias = (source) => ({
  "@moteur/source": ici(`./src/moteur/source.${source}.ts`),
  "@moteur/live": ici(`./src/moteur/live.${source}.ts`),
  "@moteur/TexteRiche.astro": ici(`./src/moteur/TexteRiche.${source}.astro`),
});

// Les paquets du moteur ne se chargent QUE moteur allume : un build statique
// ne lit ni l'adapter Cloudflare ni EmDash, et n'en paie pas le demarrage.
async function allume() {
  const { default: cloudflare } = await import("@astrojs/cloudflare");
  const { default: react } = await import("@astrojs/react");
  const { d1, r2 } = await import("@emdash-cms/cloudflare");
  const { default: emdash } = await import("emdash/astro");
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
    },
    integrations: [
      react(),
      emdash({
        database: d1({ binding: "DB" }),
        storage: r2({ binding: "MEDIA" }),
        // Le back office porte le nom et la marque du site, pas ceux du moteur.
        admin: { siteName: "Reef", logo: "/favicon.svg", favicon: "/favicon.svg" },
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
 *   alias: Record<string, string>,
 *   plans: string[],
 *   config: import("astro").AstroUserConfig,
 *   integrations: import("astro").AstroIntegration[],
 * }}
 */
export const moteur = MOTEUR_ACTIF
  ? await allume()
  : { alias: alias("fichiers"), plans: [], config: {}, integrations: [] };
