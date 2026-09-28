// src/moteur/cadre.fichiers.ts - moteur eteint, le cadre du site (generique) : aucun reglage, aucun menu, aucune page libre ; tout vient des fichiers du theme.
//
// La meme forme que cadre.emdash.ts, choisie par l'alias @moteur/cadre-base.
// Rien n'est importe du moteur : le build statique ne change pas d'un octet.
import type { DonneesDuSite, MenuLu, Reglages } from "./cadre";

export interface CadreLu {
  reglages: Reglages;
  site?: DonneesDuSite;
  edition?: unknown;
  menus: Map<string, MenuLu>;
}

export interface PageLibre {
  slug: string;
  data: Record<string, unknown> & { seo?: { title?: string | null; description?: string | null; image?: unknown; canonical?: string | null; noIndex?: boolean } };
  edit?: unknown;
}

export async function lireLeCadre(_locale: string, _nomsDesMenus: readonly string[]): Promise<CadreLu> {
  return { reglages: {}, menus: new Map() };
}

export async function pageLibre(_slug: string, _locale: string): Promise<PageLibre | null> {
  return null;
}

export async function pagesLibres(_locale: string): Promise<{ slug: string; noindex: boolean }[]> {
  return [];
}
