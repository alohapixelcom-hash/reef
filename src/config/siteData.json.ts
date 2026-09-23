// src/config/siteData.json.ts - l'identite de la publication : nom, auteur, adresse, reseaux.
import type { SiteDataProps } from "./types/configDataTypes";

// Tout ce qui identifie la publication vit ici. C'est le premier fichier que
// l'utilisateur edite, et le seul a editer pour changer de marque.
const siteData: SiteDataProps = {
  name: "Reef",
  title: "Reef - the Astro theme for people who write",
  description:
    "A free Astro 7 blog theme built for reading: an editorial home, a post page tuned for eight minutes of attention, topic archives, author pages, client-side search, and a bilingual layer that costs one line per language.",
  useViewTransitions: true,

  // La ligne de pied de page qui dit que ce site est une demonstration du
  // theme, avec le lien vers la boutique. Elle avait ete eteinte le temps que
  // le catalogue Astro approuve la fiche ; rallumee le 13 septembre 2026, parce
  // que la demonstration etait le seul site de la famille sans lien vers les
  // themes payants. Le texte vit dans src/i18n/ui/{en,fr}/demo.ts et ne cite
  // que la boutique, aucune personne ni adresse. Vider ce champ eteint la ligne.
  demoNotice: "demo.notice",

  // Identite NEUTRE, regle du catalogue Astro : une demo ne porte ni nom
  // d'utilisateur reel, ni domaine que l'on ne possede pas. L'utilisateur met
  // les siens ici, et le pied de page suit.
  author: {
    name: "Example Studio",
    email: "hello@example.com",
    twitter: "",
  },

  defaultImage: {
    src: "/og/default.jpg",
    alt: "Reef, the Astro theme for people who write",
  },
};

export default siteData;
