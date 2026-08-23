// src/i18n/ui/fr/demo.ts - dictionnaire francais, tranche "demo".
//
// Le type Pick<Dictionary, "demo"> fait le travail de relecture : oublier une
// cle de cette tranche casse le build, et en inventer une qui n'existe pas
// cote anglais aussi.

import type { Dictionary } from "../types";

export const frDemo: Pick<Dictionary, "demo"> = {
  demo: {
    notice: "Ce site est une démonstration du thème Reef, conçu par {studio}.",
    studio: "Aloha Pixel",
  },
};
