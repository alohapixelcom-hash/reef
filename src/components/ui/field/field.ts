// src/components/ui/field/field.ts - les classes de Field.

import { tv, type VariantProps } from "tailwind-variants";

export const field = tv({
  slots: {
    root: "flex flex-col gap-2",
    labelClass: "text-foreground text-sm font-semibold",
    control: "contents",
    hintClass: "text-muted-foreground text-xs leading-relaxed",
    // L'erreur emprunte le corail de la marque et non un rouge pur : elle doit
    // se voir sans hurler, et rester dans la palette.
    errorClass: "text-primary text-xs font-medium leading-relaxed",
    star: "text-primary ml-0.5",
  },
  variants: {
    tone: {
      normal: {},
      invalid: { labelClass: "text-foreground" },
    },
  },
  defaultVariants: { tone: "normal" },
});

export type FieldVariants = VariantProps<typeof field>;
