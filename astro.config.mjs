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
      themes: { light: "github-light", dark: "github-dark-dimmed" },
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
