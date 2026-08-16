// src/js/pagination.ts - pagination pure : decoupe une liste en pages et construit des urls a slash final.

export interface PaginatedPage<T> {
  /** Les elements de cette page, dans l'ordre d'entree. */
  items: T[];
  /** Numero de page, a partir de 1. */
  page: number;
  totalPages: number;
  /** Nombre total d'elements, toutes pages confondues. */
  totalItems: number;
  /** Position 1-based du premier element de la page ; 0 quand la page est vide. */
  start: number;
  /** Position 1-based du dernier element de la page ; 0 quand la page est vide. */
  end: number;
  isFirst: boolean;
  isLast: boolean;
  /** Numero de la page precedente, null sur la premiere. */
  prev: number | null;
  /** Numero de la page suivante, null sur la derniere. */
  next: number | null;
}

// Les deux fonctions echouent fort sur une entree invalide : dans un build
// statique, une taille de page a zero est un bug a corriger, pas a masquer.
function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be an integer >= 1, got ${String(value)}`);
  }
}

/**
 * Decoupe items en pages de size elements. L'entree n'est jamais mutee et
 * l'ordre est conserve. Une liste vide produit UNE page vide : la route
 * de tete (/blog/) existe toujours, meme sans contenu.
 */
export function paginate<T>(items: readonly T[], size: number): PaginatedPage<T>[] {
  assertPositiveInteger(size, "size");
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));

  return Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    const slice = items.slice(index * size, index * size + size);
    return {
      items: slice,
      page,
      totalPages,
      totalItems,
      start: slice.length > 0 ? index * size + 1 : 0,
      end: slice.length > 0 ? index * size + slice.length : 0,
      isFirst: page === 1,
      isLast: page === totalPages,
      prev: page > 1 ? page - 1 : null,
      next: page < totalPages ? page + 1 : null,
    };
  });
}

/**
 * Url d'une page de liste, calee sur trailingSlash "always" : la page 1 vit a
 * la racine ("/blog/"), les suivantes en dessous ("/blog/2/"). Les slashs
 * finaux de basePath sont normalises ; un basePath vide designe la racine.
 */
export function buildPageHref(basePath: string, page: number): string {
  assertPositiveInteger(page, "page");
  const trimmed = basePath.replace(/\/+$/, "");
  const root = trimmed === "" ? "/" : `${trimmed}/`;
  return page === 1 ? root : `${root}${page}/`;
}
