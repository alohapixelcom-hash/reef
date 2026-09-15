// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("./dist/", import.meta.url));

// Lit les hreflang que la page construite porte deja : le head est la seule
// source, le plan de site ne peut donc plus le contredire. L'integration
// sitemap appariait les langues par identite de chemin et n'ecrivait aucun
// x-default, alors que le head en porte un sur chaque page ; `serialize` est
// appele apres le build, donc dist/ existe et on y relit la verite.
function hreflangDuHtml(/** @type {string} */ pathname) {
  // "/fr/about/" devient "fr/about/", et la racine "/" devient "" : le chemin
  // se colle a DIST sans doubler le separateur.
  const relatif = pathname.replace(/^\/+/, "");
  const fichier = `${DIST}${relatif === "" || relatif.endsWith("/") ? relatif : `${relatif}/`}index.html`;
  let html = "";
  try {
    html = readFileSync(fichier, "utf8");
  } catch {
    return [];
  }
  const links = [];
  const motif = /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/?>/g;
  for (const m of html.matchAll(motif)) links.push({ lang: m[1], url: m[2] });
  return links;
}

// https://astro.build/config
export default defineConfig({
  // Alimente canonical, OG, sitemap, robots.txt et llms.txt. Une seule edition les corrige tous.
  site: "https://reef.alohapixel.app",

  // Une seule forme d'URL canonique : le build en repertoires emet un slash final, et
  // canonical + OG s'accordent sur cette forme.
  trailingSlash: "always",

  // Pas d'adapter, volontairement : le theme compile en HTML 100% statique et
  // n'impose aucun hebergeur a son utilisateur.
  security: { checkOrigin: true },

  // Routage bilingue. L'anglais est servi a la racine (/, /about/), le francais
  // sous /fr/. prefixDefaultLocale: false est ce qui evite un /en/ inutile dans
  // les URLs. La liste vit dans src/i18n/config.ts, une seule source de verite.
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr"],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },

  integrations: [
    // Pas de React ici, volontairement : Reef n'a pas un seul ilot. Tout le
    // theme est du .astro, et la page d'article part a zero kilo-octet de
    // JavaScript. C'est le principal argument d'un theme de blog.
    mdx(),
    sitemap({
      filter: (page) => !["/404/", "/examples/", "/secret-spot/"].some((p) => page.includes(p)),
      // Le sitemap porte les memes alternatives que les balises hreflang du
      // head : Google recoupe les deux, et un desaccord fait ignorer les deux.
      i18n: { defaultLocale: "en", locales: { en: "en", fr: "fr" } },
      // Quand la page construite porte ses hreflang, ce sont eux (x-default
      // compris) qui vont dans le plan de site ; sinon l'appariement de
      // l'integration reste. Une page sans jumelle ne declare que son head.
      serialize(item) {
        const links = hreflangDuHtml(new URL(item.url).pathname);
        return links.length > 1 ? { ...item, links } : item;
      },
    }),
  ],

  markdown: {
    shikiConfig: {
      // Deux themes, commutes par la classe .dark : un bloc de code qui reste
      // clair sur une page sombre est la premiere chose qu'on remarque, et la
      // derniere qu'on pardonne a un theme de blog.
      //
      // La variante "high-contrast" en clair n'est pas un gout : "github-light"
      // pose ses commentaires et ses noms de propriete a 3,49 pour 1 sur le
      // fond du bloc, quand WCAG AA en demande 4,5 pour du texte courant. Un
      // billet technique dont le code est le contenu principal ne peut pas se
      // permettre de le rendre a la limite du lisible.
      //
      // Le sombre a ete cru sain jusqu'au 5 septembre 2026, jour ou le banc a
      // mesure le mode sombre pour la premiere fois : "github-dark-dimmed"
      // pose ses commentaires (#768390) a 3,88 pour 1 sur son propre fond
      // (#22272e), sur dix billets. "github-dark-default" les pose a 6,15 et
      // aucun de ses jetons ne descend sous ce chiffre ; il reste dans la meme
      // famille GitHub, donc les memes teintes de mot-cle et de chaine.
      themes: { light: "github-light-high-contrast", dark: "github-dark-default" },
      wrap: true,
    },
  },

  // LA FEUILLE DE STYLE VOYAGE DANS LE HTML, ET C'EST MESURE.
  //
  // Astro n'inline par defaut que les feuilles de moins de 4 ko et laisse les
  // autres en fichiers. Sur la demonstration de ce theme, cela faisait TROIS
  // requetes bloquantes avant le premier pixel, et Lighthouse chiffrait le
  // blocage a 730 ms sur un telephone.
  //
  // "always" les pose toutes dans le <head>. Le prix est connu et assume : la
  // feuille repart avec chaque page au lieu d'etre mise en cache une fois pour
  // tout le site, soit une vingtaine de kilo-octets compresses par page au lieu
  // d'un seul telechargement. Sur un site de contenu ou l'immense majorite des
  // visites arrive d'un moteur sur UNE page, la premiere vue gagne plus que la
  // navigation interne ne perd. Qui sert un site ou le visiteur enchaine dix
  // pages remet "auto" ici, et rien d'autre ne bouge.
  build: { inlineStylesheets: "always" },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // N'inline pas les petits scripts, pour qu'ils survivent aux view transitions.
      assetsInlineLimit: 0,
    },
  },
});
