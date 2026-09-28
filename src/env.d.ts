// src/env.d.ts - ce que la requete porte d'une page a ses composants : les textes rediges de la page et leurs proxys d'edition (voir src/moteur/textes.ts).
declare namespace App {
  interface Locals {
    /** Les textes de la page en cours, poses par la page ; useTranslations(Astro) les lit. */
    textes?: import("./moteur/contenu").Textes;
    /** Les proxys d'edition d'EmDash des sections de la page, par slug ; annotationsDe (src/moteur/annotations.ts) les lit. */
    editions?: import("./moteur/annotations").Editions;
  }
}
