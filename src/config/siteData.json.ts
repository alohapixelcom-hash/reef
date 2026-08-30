import type { SiteDataProps } from "./types/configDataTypes";

// Tout ce qui identifie la publication vit ici. C'est le premier fichier que
// l'utilisateur edite, et le seul a editer pour changer de marque.
const siteData: SiteDataProps = {
  name: "Reef",
  title: "Reef - the Astro theme for people who write",
  description:
    "A free Astro 7 blog theme built for reading: an editorial home, a post page tuned for eight minutes of attention, topic archives, author pages, client-side search, and a bilingual layer that costs one line per language.",
  useViewTransitions: true,

  // VIDE VOLONTAIREMENT : une demonstration ne cite pas d'entreprise reelle.
  // La ligne de pied de page qui citait le studio est donc eteinte. Le mecanisme
  // reste entier, champ, composant et cles i18n compris, et se rallume en
  // remettant "demo.notice" dans ce champ.
  demoNotice: "",

  // Identite NEUTRE, pour la meme raison : une demo ne porte ni nom
  // d'utilisateur reel, ni domaine que l'on ne possede pas. L'utilisateur met
  // les siens ici, et le pied de page suit.
  author: {
    name: "Example Studio",
    email: "hello@example.com",
    twitter: "",
  },

  defaultImage: {
    src: "/og/default.png",
    alt: "Reef, the Astro theme for people who write",
  },
};

export default siteData;
