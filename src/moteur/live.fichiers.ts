// src/moteur/live.fichiers.ts - moteur eteint : aucun chargeur a la demande, tout le contenu vient des fichiers.
//
// Le type est declare ici et non importe de types.ts : types.ts est propre a
// chaque site (Swell n'en a pas), ce fichier est commun a tous.
/** Le chargeur des collections a la demande : une fabrique moteur allume, rien moteur eteint. */
export type Chargeur = (() => import("astro/loaders").LiveLoader) | undefined;

export const chargeur: Chargeur = undefined;
