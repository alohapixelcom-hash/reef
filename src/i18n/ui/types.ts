// src/i18n/ui/types.ts - le contrat que toute traduction doit honorer.
//
// `en.ts` est ecrit en `as const` : TypeScript en deduit des types litteraux
// ("Pricing" et pas string). Tel quel, une autre langue serait obligee d'ecrire
// le mot anglais exact pour compiler, ce qui n'a aucun sens.
//
// `Widen` elargit recursivement ces litteraux vers leurs types de base, en
// gardant la FORME intacte : memes cles, memes tableaux, meme profondeur.
// Resultat : oublier une cle en francais casse le build, mais traduire un mot
// ne casse rien. C'est exactement le filet qu'on veut.

import type { en } from "./en/index";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? // readonly conserve : les tranches sont ecrites en `as const`, donc
          // leurs tableaux sont readonly. Les elargir en tableaux mutables
          // rendrait le dictionnaire anglais non assignable a son propre type.
          readonly Widen<U>[]
        : { -readonly [K in keyof T]: Widen<T[K]> };

/** La forme exacte qu'un dictionnaire doit avoir, quelle que soit la langue. */
export type Dictionary = Widen<typeof en>;
