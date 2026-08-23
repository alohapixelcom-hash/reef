// src/i18n/ui/en/demo.ts - dictionnaire anglais, tranche "demo" : la ligne qui dit que ce site est une demonstration du theme.
//
// Cette tranche n'existe que pour le site de demonstration. Elle n'est
// affichee que si siteData.demoNotice est renseigne : vider ce champ suffit a
// faire disparaitre la ligne, sans ouvrir un composant.

export const enDemo = {
  demo: {
    /** Le jeton {studio} porte le lien vers l'atelier : le dictionnaire n'a
     *  ainsi pas a contenir de HTML pour qu'un mot soit cliquable. */
    notice: "This site is a demo of the Reef theme, made by {studio}.",
    /** Nom de l'atelier, et libelle du lien. Un nom propre ne se traduit pas. */
    studio: "Aloha Pixel",
  },
} as const;
