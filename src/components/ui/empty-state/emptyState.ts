// src/components/ui/empty-state/emptyState.ts - les classes de EmptyState.

import { tv, type VariantProps } from "tailwind-variants";

export const emptyState = tv({
  slots: {
    root: "flex flex-col items-center px-6 py-14 text-center",
    // Le motif est contenu et discret : un ecran vide ne doit pas devenir une
    // affiche. 8rem est la taille ou il se lit sans attirer le regard.
    art: "relative mb-6 size-32 shrink-0",
    ring: "text-border",
    heading: "font-display text-foreground text-lg font-bold",
    lede: "text-muted-foreground mt-2 max-w-sm text-[0.95rem] leading-relaxed text-pretty",
    // La marge n'apparait que s'il y a vraiment une action : empty:hidden evite
    // le trou blanc quand le slot est vide.
    actions: "mt-6 flex flex-wrap items-center justify-center gap-3 empty:mt-0 empty:hidden",
  },
  variants: {
    tone: {
      // Rien a signaler : c'est juste vide.
      neutral: {},
      // Une recherche sans resultat : l'accent secondaire, pose sans alarmer.
      search: { ring: "text-accent/40", art: "text-accent" },
      // Quelque chose a echoue : le primaire, jamais du rouge pur, qui
      // jurerait avec la palette et crierait plus fort que necessaire.
      error: { ring: "text-primary/40", art: "text-primary" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type EmptyStateVariants = VariantProps<typeof emptyState>;
