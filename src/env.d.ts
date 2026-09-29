// src/env.d.ts - ce que la requete porte d'une page a ses composants : les textes rediges de la page, leurs proxys d'edition, le cadre du site et les donnees des sections (voir src/moteur/textes.ts).
/** La capture du telephone dessine existe (public/reef-iphone-poster.webp), figee au build par astro.config.mjs. */
declare const __REEF_CAPTURE_DU_TELEPHONE__: boolean;

declare namespace App {
  interface Locals {
    /** Les textes de la page en cours, poses par la page ; useTranslations(Astro) les lit. */
    textes?: import("./moteur/contenu").Textes;
    /** Les proxys d'edition d'EmDash des sections de la page, par slug ; annotationsDe (src/moteur/annotations.ts) les lit. */
    editions?: import("./moteur/annotations").Editions;
    /** Le cadre du site (reglages natifs, entree site, menus), pose par la page ; cadre.ts le lit. Moteur eteint : des cartes vides. */
    cadre?: import("./moteur/cadre").Cadre;
    /** Les donnees brutes des sections publiees (photos, liens, blocs masques), par identifiant ; cadre.ts les lit. */
    sections?: import("./moteur/cadre").DonneesDesSections;
  }
}
