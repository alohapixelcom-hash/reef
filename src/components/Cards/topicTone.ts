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
//
// Un cinquieme champ, halo, donnait la couleur d'un disque floute pose sur la
// couverture du billet a la une. Il est parti avec le disque le 2 septembre
// 2026 : la maison ne veut plus une seule lueur sur ses pages, et celle-ci
// avait en plus le defaut de ne pas suivre son propre ton.

export const topicTone = {
  coral: {
    dot: "bg-primary",
    chip: "bg-primary/12 text-primary",
    hover: "hover:border-primary/40",
    rule: "bg-primary",
    // La couleur du sur-titre. Elle s'appelait ghost et servait a peindre un
    // ornement de fond ; elle peint maintenant du TEXTE, ce qui est la seule
    // chose qu'une couleur de sujet a vraiment a faire sur une carte.
    ghost: "text-primary",
  },
  reef: {
    dot: "bg-accent",
    chip: "bg-accent/15 text-accent-text",
    hover: "hover:border-accent/40",
    rule: "bg-accent",
    ghost: "text-accent-text",
  },
  ink: {
    dot: "bg-foreground",
    chip: "bg-foreground/8 text-foreground",
    hover: "hover:border-foreground/30",
    rule: "bg-foreground",
    ghost: "text-foreground",
  },
} as const;

/** Les trois valeurs de `accent` du schema des sujets, derivees de la table. */
export type TopicAccent = keyof typeof topicTone;
