// src/moteur/types.ts - la forme commune du corps d'un billet, quelle que soit sa source.
import type { MarkdownHeading } from "astro";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export interface CorpsDeBillet {
  /** Source fichiers : le composant rendu par Astro. */
  Content?: AstroComponentFactory;
  /** Source base : les blocs Portable Text, rendus par TexteRiche. */
  blocs?: unknown[];
  headings: MarkdownHeading[];
}
