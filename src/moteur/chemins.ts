// src/moteur/chemins.ts - a la demande, retrouve les props d'une page en rejouant SON getStaticPaths.
//
// POURQUOI REJOUER getStaticPaths : une page rendue a la demande ne recoit pas
// de props, Astro n'appelant getStaticPaths qu'au build. Plutot que d'ecrire
// dans chaque page une seconde facon de trouver son contenu, on rappelle la
// premiere et on y cherche l'adresse demandee. Une seule logique par page :
// ce qui existe au build existe a la demande, au meme endroit, et une adresse
// que le build n'aurait pas produite repond 404.
//
// Moteur eteint, la page est figee et ses props arrivent d'Astro : la fonction
// les rend telles quelles.
import { MOTEUR } from "@moteur/source";
import type { AstroGlobal, GetStaticPaths, Page, PaginateFunction } from "astro";

type Params = Record<string, string | number | undefined>;

const cle = (params: Params): string =>
  Object.keys(params)
    .sort()
    .map((nom) => `${nom}=${params[nom] ?? ""}`)
    .join("&");

/** La pagination d'Astro, refaite pour la demande : memes pages, memes params. */
const paginer: PaginateFunction = ((donnees: unknown[], options: { pageSize?: number; params?: Params; props?: object } = {}) => {
  const taille = options.pageSize ?? 10;
  const derniere = Math.max(1, Math.ceil(donnees.length / taille));
  return Array.from({ length: derniere }, (_, i) => {
    const numero = i + 1;
    const debut = i * taille;
    const fin = Math.min(debut + taille, donnees.length);
    const page = {
      data: donnees.slice(debut, fin),
      start: debut,
      end: fin - 1,
      size: taille,
      total: donnees.length,
      currentPage: numero,
      lastPage: derniere,
      // Les liens de pagination du theme se construisent depuis basePath et
      // currentPage ; ces adresses ne sont donc pas lues.
      url: { current: "", prev: undefined, next: undefined, first: undefined, last: undefined },
    } as Page<unknown>;
    return {
      params: { ...options.params, page: numero === 1 ? undefined : String(numero) },
      props: { ...options.props, page },
    };
  });
}) as unknown as PaginateFunction;

/**
 * Les props de la page demandee, ou `undefined` si l'adresse n'existe pas.
 *
 *   const props = await propsDeLaPage<Props>(Astro, getStaticPaths);
 *   if (!props) return introuvable();
 */
export async function propsDeLaPage<P extends object>(
  Astro: Pick<AstroGlobal, "params" | "props">,
  chemins: GetStaticPaths,
): Promise<P | undefined> {
  if (!MOTEUR) return Astro.props as P;
  const liste = (await chemins({ paginate: paginer, routePattern: "" })) as { params: Params; props?: object }[];
  const voulu = cle(Astro.params as Params);
  const trouve = liste.flat().find((chemin) => cle(chemin.params) === voulu);
  return trouve ? ((trouve.props ?? {}) as P) : undefined;
}

/** La reponse d'une adresse inconnue : Astro y met la page 404 du theme. */
export const introuvable = (): Response => new Response(null, { status: 404 });
