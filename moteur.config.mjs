// moteur.config.mjs - le moteur de publication, debrayable : sans ALOHA_MOTEUR, Reef reste un site 100% statique.
//
// POURQUOI UN FICHIER A PART : astro.config.mjs decrit le theme, celui-ci
// decrit le moteur. Qui n'achete que le theme ne lit jamais ce fichier, et
// qui allume le moteur n'a qu'une variable a poser.
//
// Le moteur est EmDash (MIT, emdashcms.com) : la base D1 porte le contenu, R2
// les medias, et les pages gerees se rendent a la demande. Publier dans le
// back office ecrit en base ET purge le cache de la page : aucun build.
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import emdash from "emdash/astro";

import { fileURLToPath } from "node:url";

const ici = (chemin) => fileURLToPath(new URL(chemin, import.meta.url));

/** Vrai quand le moteur est allume. Lu au build ET par `astro dev`. */
export const MOTEUR_ACTIF = process.env.ALOHA_MOTEUR === "emdash";

// LES PAGES QUE LE MOTEUR GERE. Tout ce qui affiche un billet se rend a la
// demande, pour qu'une publication se voie sans build. Le reste du site
// (a propos, contact, pages legales) garde son HTML fige.
//
// Une seule liste, ici : une page oubliee resterait figee sur le contenu du
// dernier build, et c'est exactement le defaut que le moteur vient corriger.
const PAGES_GEREES = [
  "src/pages/[...locale]/index.astro",
  "src/pages/[...locale]/blog/[id].astro",
  "src/pages/[...locale]/blog/[...page].astro",
  "src/pages/[...locale]/topics/index.astro",
  "src/pages/[...locale]/topics/[topic]/[...page].astro",
  "src/pages/[...locale]/authors/index.astro",
  "src/pages/[...locale]/authors/[author].astro",
  "src/pages/[...locale]/search.astro",
  "src/pages/[...locale]/rss.xml.ts",
  "src/pages/llms.txt.ts",
];

/** Rend a la demande les pages gerees, et fige toutes les autres pages du theme. */
function partageDesPages() {
  return {
    name: "aloha:moteur-pages",
    hooks: {
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

export const moteur = MOTEUR_ACTIF
  ? {
      alias: alias("emdash"),
      config: {
        // "server" est ce qu'EmDash attend pour ses propres routes ; le
        // partage ci-dessus refige aussitot toutes les pages non gerees.
        output: "server",
        // Les routes du moteur (/_emdash/api/...) s'appellent sans barre
        // finale, et "always" leur repondrait 404.
        trailingSlash: "ignore",
        adapter: cloudflare({
          configPath: "./wrangler.moteur.jsonc",
          // sharp optimise les images des pages figees au build ; a la
          // demande, les medias du back office sont servis tels quels.
          imageService: "compile",
        }),
      },
      integrations: [
        react(),
        emdash({
          database: d1({ binding: "DB" }),
          storage: r2({ binding: "MEDIA" }),
        }),
        partageDesPages(),
      ],
    }
  : { alias: alias("fichiers"), config: {}, integrations: [] };
