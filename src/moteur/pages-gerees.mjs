// src/moteur/pages-gerees.mjs - LA liste des pages que le moteur rend a la demande.
//
// Tout ce qui affiche un billet se rend a la demande, pour qu'une publication
// se voie sans build. Les pages fixes aussi (contact,
// mentions legales, confidentialite, conditions) : leurs textes rediges
// viennent de la base (collection `sections`, voir contenu.ts), et une section
// publiee doit se voir sans build. La page introuvable aussi
// (entree "introuvable") : le Worker la demande a 404-introuvable pour toute
// reponse 404, afin qu'elle passe par le chemin normal de la requete (barre
// d'edition), et page-libre rend les pages ecrites dans le back office. Seul
// robots.txt reste fige : il ne cite aucun texte de la base.
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
  "src/pages/[...locale]/tags/[tag]/[...page].astro",
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
  "src/pages/404.astro",
  "src/pages/[...locale]/404-introuvable.astro",
  "src/pages/[...locale]/page-libre.astro",
  "src/pages/llms.txt.ts",
];

// Les pages que le cache de routes peut garder (ALOHA_CACHE_ROUTES) : toutes,
// sauf la page introuvable (un 404 ne se garde pas) et la page libre (son
// adresse est celle de la page demandee, reecrite par l'accueil).
export const PAGES_EN_CACHE = PAGES_GEREES.filter((page) => !/\/404(-introuvable)?\.astro$|\/page-libre\.astro$/.test(page));
