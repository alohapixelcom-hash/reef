// src/moteur/pages-gerees.mjs - LA liste des pages que le moteur rend a la demande.
//
// Tout ce qui affiche un billet se rend a la demande, pour qu'une publication
// se voie sans build. Le reste du site (a propos, contact, pages legales)
// garde son HTML fige.
//
// Une seule liste, lue par moteur.config.mjs (qui partage les pages) ET par le
// plan de site du moteur (qui les inventorie) : une page oubliee resterait
// figee sur le contenu du dernier build, et c'est exactement le defaut que le
// moteur vient corriger.
export const PAGES_GEREES = [
  "src/pages/[...locale]/index.astro",
  "src/pages/[...locale]/blog/[id].astro",
  "src/pages/[...locale]/blog/[...page].astro",
  "src/pages/[...locale]/topics/index.astro",
  "src/pages/[...locale]/topics/[topic]/[...page].astro",
  "src/pages/[...locale]/authors/index.astro",
  "src/pages/[...locale]/authors/[author].astro",
  "src/pages/[...locale]/search.astro",
  // A propos compte les billets de chaque auteur : figee, elle mentirait
  // d'un billet a chaque publication.
  "src/pages/[...locale]/about.astro",
  "src/pages/[...locale]/rss.xml.ts",
  "src/pages/llms.txt.ts",
];
