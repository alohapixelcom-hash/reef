// src/moteur/live.emdash.ts - branche le contenu en base sur le systeme de contenu d'Astro. Identique dans tout site du moteur.
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
