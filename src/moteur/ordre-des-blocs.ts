// src/moteur/ordre-des-blocs.ts - l'ordre des blocs d'une page, choisi dans le back office (generique) : chaque bloc de "Textes des pages" porte une place, vide = celle du theme.
//
// LA REGLE. Le theme donne ses blocs dans son ordre (1, 2, 3...). Un editeur
// qui ecrit une place dans le champ "order" d'un bloc le deplace : le bloc
// prend cette place, et les blocs sans place gardent le rang que le theme leur
// donne. A egalite, le bloc que l'editeur a place passe devant, puis l'ordre
// du theme departage. "1" met donc un bloc tout en haut, quelle que soit la
// place des autres. Une place illisible (texte, negatif, zero, decimal) vaut
// vide : le bloc reste a sa place.
//
// Rien n'est pose (moteur eteint, ou aucune place ecrite) : l'ordre du theme,
// tel quel, et le build statique ne change pas d'un octet.
// GENERIQUE et pur, sans import : la page passe les donnees de ses sections.

/** La place qu'un editeur a ecrite, ou null : un entier de 1 a 99. */
export function placeLue(valeur: unknown): number | null {
  const n = typeof valeur === "string" && valeur.trim() !== "" ? Number(valeur) : valeur;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

/**
 * Les blocs dans l'ordre de la page. `blocs` est l'ordre du theme ; `places`
 * rend les donnees brutes d'un bloc (donneesDe de cadre.ts), dont le champ
 * "order". Chaque bloc apparait une fois et une seule.
 */
export function ordreDesBlocs<T extends string>(blocs: readonly T[], donnees: (bloc: T) => Record<string, unknown>): T[] {
  return blocs
    .map((bloc, rang) => {
      const place = placeLue(donnees(bloc).order);
      return { bloc, rang, cle: place ?? rang + 1, choisi: place === null ? 1 : 0 };
    })
    .sort((a, b) => a.cle - b.cle || a.choisi - b.choisi || a.rang - b.rang)
    .map(({ bloc }) => bloc);
}
