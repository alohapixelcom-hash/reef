// src/moteur/pages-gerees.mjs - LA liste des pages que le moteur rend a la demande.
//
// Tout ce qui affiche un billet se rend a la demande, pour qu'une publication
// se voie sans build. Depuis la 3.3.0, les pages fixes aussi (contact,
// mentions legales, confidentialite, conditions) : leurs textes rediges
// viennent de la base (collection `sections`, voir contenu.ts), et une section
// publiee doit se voir sans build. Seules la page introuvable et robots.txt
// restent figees : elles ne citent aucun texte de la base.
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
  "src/pages/[...locale]/contact.astro",
  "src/pages/[...locale]/legal.astro",
  "src/pages/[...locale]/privacy.astro",
  "src/pages/[...locale]/terms.astro",
  "src/pages/[...locale]/rss.xml.ts",
  "src/pages/llms.txt.ts",
];
