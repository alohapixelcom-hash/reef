// src/components/Cards/topicTone.ts - la table qui traduit l'accent declare par un sujet en tokens semantiques.
//
// L'accent d'un sujet est un NOM (coral, reef, ink), jamais une couleur : le
// contenu declare une intention et cette table la traduit. C'est ce qui permet
// de repeindre le theme sans rouvrir un seul fichier de contenu.
//
// La table vit dans son propre module et pas dans une carte, parce que quatre
// composants la lisent (carte de sujet, carte de billet, billet a la une,
// pastilles de sujets) : un sujet ne peut donc pas etre vert dans une grille et
// corail trois blocs plus bas.

export const topicTone = {
  coral: {
    dot: "bg-primary",
    chip: "bg-primary/12 text-primary",
    hover: "hover:border-primary/40",
    rule: "bg-primary",
    // Le filigrane : l'initiale du sujet posee tres grande derriere le texte.
    // Portee en text-* et non en bg-*, parce que c'est une lettre et pas un
    // rectangle.
    ghost: "text-primary",
    // Le halo de la couverture du billet a la une. Un halo se pose dans un
    // radial-gradient(), qui n'accepte pas une classe utilitaire : il lui faut
    // donc une couleur. Elle est declaree dans tokens.css sous --halo-*, et
    // cette table ne fait que la citer. La phrase precedente affirmait deja
    // que la couleur restait dans les tokens alors qu'elle etait ecrite ici,
    // en clair, avec son nom de palette.
    halo: "var(--halo-coral)",
  },
  reef: {
    dot: "bg-accent",
    chip: "bg-accent/15 text-accent",
    hover: "hover:border-accent/40",
    rule: "bg-accent",
    ghost: "text-accent",
    halo: "var(--halo-reef)",
  },
  ink: {
    dot: "bg-foreground",
    chip: "bg-foreground/8 text-foreground",
    hover: "hover:border-foreground/30",
    rule: "bg-foreground",
    ghost: "text-foreground",
    halo: "var(--halo-ink)",
  },
} as const;

/** Les trois valeurs de `accent` du schema des sujets, derivees de la table. */
export type TopicAccent = keyof typeof topicTone;
