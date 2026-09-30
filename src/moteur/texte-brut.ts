// src/moteur/texte-brut.ts - le texte brut d'un champ de texte riche lu dans la base (generique) : jamais d'exception, quel que soit ce que la base rend.
//
// POURQUOI. Un billet ou une note publie sans texte a un champ `content` a
// null, pas a [] : `texteBrut(d.content)` avec une valeur par defaut (`= []`)
// ne protege que de undefined, et le `.map` sur null faisait tomber TOUTES
// les pages moteur allume (Reef : accueil 500, listes 404 ; Kona :
// journal vide). Une entree a moitie ecrite ne doit jamais casser le site.
//
// GENERIQUE et pur : chaque theme passe sa propre facon de lire un bloc
// (Reef lit aussi le code), le socle garantit la garde.

/** Un bloc de texte riche tel que la base le rend : tout peut manquer. */
export interface BlocBrut {
  _type?: string;
  children?: { text?: unknown }[] | null;
  code?: unknown;
}

/** Le texte d'un bloc ordinaire : ses morceaux mis bout a bout ; rien si un morceau manque. */
export function texteDuBlocBrut(bloc: BlocBrut): string {
  return Array.isArray(bloc.children) ? bloc.children.map((c) => (typeof c?.text === "string" ? c.text : "")).join("") : "";
}

/**
 * Le texte brut d'un champ de texte riche : "" pour null, undefined, une
 * valeur qui n'est pas une liste ou une liste vide ; les blocs nuls sont
 * sautes. `texteDuBloc` : la lecture d'un bloc propre au theme (son type Bloc).
 */
export function texteBrut<B = BlocBrut>(blocs: unknown, texteDuBloc?: (bloc: B) => string): string {
  if (!Array.isArray(blocs)) return "";
  const lire = texteDuBloc ?? (texteDuBlocBrut as unknown as (bloc: B) => string);
  return blocs
    .filter((b) => b !== null && typeof b === "object")
    .map((b) => lire(b as B))
    .join("\n\n");
}
