import type { SiteDataProps } from "./types/configDataTypes";

// Tout ce qui identifie la publication vit ici. C'est le premier fichier que
// l'acheteur edite, et le seul a editer pour changer de marque.
const siteData: SiteDataProps = {
  name: "Reef",
  title: "Reef - the Astro theme for people who write",
  description:
    "A free Astro 7 blog theme built for reading: an editorial home, a post page tuned for eight minutes of attention, topic archives, author pages, client-side search, and a bilingual layer that costs one line per language.",
  useViewTransitions: true,

  // VIDER CETTE VALEUR AVANT DE PUBLIER VOTRE PROPRE SITE.
  // Ce champ porte la ligne de pied de page qui dit que ce site est une
  // demonstration du theme Reef. Une chaine vide, et la ligne disparait :
  // c'est la seule edition a faire, aucun composant a ouvrir.
  demoNotice: "demo.notice",

  author: {
    name: "Aloha Pixel",
    email: "aloha@alohapixel.app",
    twitter: "alohapixel",
  },

  defaultImage: {
    src: "/og/default.png",
    alt: "Reef, the Astro theme for people who write",
  },
};

export default siteData;
