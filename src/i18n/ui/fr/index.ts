// src/i18n/ui/fr/index.ts - le dictionnaire francais complet, recompose depuis ses tranches.
//
// Ce n'est pas une traduction mot a mot de l'anglais : c'est la meme intention,
// ecrite comme un francophone l'ecrirait. Un theme de blog dont la copie sent
// la traduction automatique se disqualifie en trois lignes, puisque tout ce
// qu'il vend est justement la qualite de la lecture.

import type { Dictionary } from "../types";
import { frChrome } from "./chrome";
import { frPages } from "./pages";
import { frReading } from "./reading";

export const fr: Dictionary = {
  ...frChrome,
  ...frPages,
  ...frReading,
};

export default fr;
