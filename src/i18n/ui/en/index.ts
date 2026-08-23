// src/i18n/ui/en/index.ts - le dictionnaire anglais complet, recompose depuis ses tranches.
//
// C'est LA source de verite des cles : la forme de cet objet definit le type
// `Dictionary` (voir ../types.ts), et toute autre langue doit l'honorer
// exactement. Une traduction a trous ne compile pas, ce qui est voulu.

import { enChrome } from "./chrome";
import { enDemo } from "./demo";
import { enPages } from "./pages";
import { enReading } from "./reading";

export const en = {
  ...enChrome,
  ...enDemo,
  ...enPages,
  ...enReading,
} as const;

export default en;
