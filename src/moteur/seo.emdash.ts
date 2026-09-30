// src/moteur/seo.emdash.ts - le panneau SEO d'une entree de collection, moteur allume (generique) : relu par getEmDashEntry quand la liste ne l'a pas apporte.
//
// LE DEFAUT D'EMDASH 0.38 (trouve par Koa). Le chargeur ne plie la
// table _emdash_seo (titre, description, image de partage, canonique,
// noindex) que dans la lecture d'UNE entree : une entree rendue par
// getEmDashCollection n'a pas data.seo. Un gabarit qui lit le SEO d'un projet,
// d'un billet ou d'un produit depuis une liste le perd donc sans bruit (la
// fumee l'a vu, ni la couverture ni le guide). Chaque source.emdash.ts qui
// lit une collection a SEO appelle seoDeLEntree, jamais data.seo seul.
//
// Moteur allume seulement : ce fichier importe emdash, il n'est lu que par
// les fichiers .emdash du site.
import { getEmDashEntry } from "emdash";

/** Le panneau SEO natif d'une entree (tous les champs facultatifs). */
export interface PanneauSeo {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  canonical?: string | null;
  noIndex?: boolean;
}

const plein = (seo: unknown): seo is PanneauSeo => typeof seo === "object" && seo !== null && Object.keys(seo).length > 0;

/**
 * Le panneau SEO de l'entree `slug` (dans `locale`) de `collection`, vide
 * s'il n'est pas rempli. `porte` : ce que la liste a deja apporte (data.seo),
 * pris tel quel quand il est rempli, sans relire la base.
 */
export async function seoDeLEntree(collection: string, slug: string, locale: string, porte?: unknown): Promise<PanneauSeo> {
  if (plein(porte)) return porte;
  const { entry } = await getEmDashEntry(collection, slug, { locale });
  const seo = (entry?.data as { seo?: unknown } | undefined)?.seo;
  return plein(seo) ? seo : {};
}
