// src/config/siteData.json.ts - l'identite de la publication : nom, auteur, adresse, reseaux.
import type { SiteDataProps } from "./types/configDataTypes";

// Tout ce qui identifie la publication vit ici. C'est le premier fichier que
// l'utilisateur edite, et le seul a editer pour changer de marque.
const siteData: SiteDataProps = {
  name: "Reef",
  // Une valeur par langue : le flux RSS francais porte le titre francais.
  title: {
    en: "Reef - the Astro theme for people who write",
    fr: "Reef, le thème Astro pour celles et ceux qui écrivent",
  },
  description:
    "A free Astro 7 blog theme built for reading: an editorial home, a post page tuned for eight minutes of attention, topic archives, author pages, client-side search, and a bilingual layer that costs one line per language.",
  useViewTransitions: true,

  // La ligne de pied de page qui dit que ce site est une demonstration du
  // theme, avec le lien vers la boutique. Le texte vit dans src/i18n/ui/{en,fr}/demo.ts et ne cite
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

  // La carte de partage est une photo seule : son alternative
  // decrit la photo, la vague en tube de l'accueil, et non la marque. Une
  // valeur par langue, comme tout texte lu par un lecteur d'ecran.
  defaultImage: {
    src: "/og/default.jpg",
    alt: {
      en: "Looking through the barrel of a turquoise wave at a sandy shore",
      fr: "Vue à travers le tube d'une vague turquoise, vers une plage de sable",
    },
  },
};

export default siteData;
