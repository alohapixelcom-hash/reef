// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

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
      filter: (page) => !["/404/", "/examples/"].some((p) => page.includes(p)),
      // Le sitemap porte les memes alternatives que les balises hreflang du
      // head : Google recoupe les deux, et un desaccord fait ignorer les deux.
      i18n: { defaultLocale: "en", locales: { en: "en", fr: "fr" } },
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
      // permettre de le rendre a la limite du lisible. Le sombre passe deja,
      // il ne bouge pas.
      themes: { light: "github-light-high-contrast", dark: "github-dark-dimmed" },
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // N'inline pas les petits scripts, pour qu'ils survivent aux view transitions.
      assetsInlineLimit: 0,
    },
  },
});
