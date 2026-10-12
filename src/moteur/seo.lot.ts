// src/moteur/seo.lot.ts - le panneau SEO de toutes les entrees publiees d'une collection en une requete, garde le temps d'une requete du site : la partie pure de seo.emdash.ts.
//
// POURQUOI. getEmDashEntry relit une entree a la fois. Le plan du site d'une
// boutique demandait le panneau de chaque fiche et de chaque rayon, l'un apres
// l'autre : 790 lectures sur une boutique de la maison, 86 s de reponse
// (MESURE le 12 octobre 2026), et la Search Console declarait le plan illisible. Ici, des
// le deuxieme panneau demande dans une meme requete pour une meme collection
// et une meme langue, tous les panneaux publies sont lus d'un coup ; les
// suivants se lisent dans ce lot. Une page qui ne demande qu'un panneau ne
// change pas.
//
// JAMAIS PLUS VIEUX QUE LA REQUETE : le lot est range sous l'objet de contexte
// de la requete (celui d'EmDash), il disparait avec elle. Une entree absente
// du lot (brouillon, adresse par identifiant, langue de repli) repart par
// getEmDashEntry, exactement comme avant.

/** Le panneau SEO natif d'une entree (tous les champs facultatifs). */
export interface PanneauSeo {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  canonical?: string | null;
  noIndex?: boolean;
}

const IDENTIFIANT = /^[a-z][a-z0-9_]*$/;

/**
 * La requete du lot : les entrees publiees de la collection dans la langue
 * demandee (ou sans langue), avec leur ligne de _emdash_seo. Parametres :
 * la collection, puis la langue. null pour un nom de collection douteux.
 */
export function sqlDuLot(collection: string): string | null {
  if (!IDENTIFIANT.test(collection)) return null;
  return `SELECT c.slug AS slug, c.locale AS locale, s.seo_title, s.seo_description, s.seo_image, s.seo_canonical, s.seo_no_index
    FROM "ec_${collection}" c
    LEFT JOIN _emdash_seo s ON s.collection = ? AND s.content_id = c.id
    WHERE c.status = 'published' AND c.deleted_at IS NULL AND c.slug IS NOT NULL AND (c.locale = ? OR c.locale IS NULL)`;
}

/**
 * Le panneau d'une ligne, comme EmDash le plie (extractSeo du chargeur 0.38) :
 * pas de ligne _emdash_seo, pas de panneau ({}).
 */
export function panneauDe(l: Record<string, unknown>): PanneauSeo {
  const noIndex = l.seo_no_index;
  if (noIndex === null || noIndex === undefined) return {};
  const texte = (v: unknown): string | null => (typeof v === "string" ? v : null);
  return { title: texte(l.seo_title), description: texte(l.seo_description), image: texte(l.seo_image), canonical: texte(l.seo_canonical), noIndex: Number(noIndex) === 1 };
}

/** Les panneaux par slug ; une entree de la langue demandee passe devant une entree sans langue au meme slug. */
export function indexerLeLot(lignes: Record<string, unknown>[], locale: string): Map<string, PanneauSeo> {
  const lot = new Map<string, PanneauSeo>();
  const exactes = new Set<string>();
  for (const l of lignes) {
    const slug = typeof l.slug === "string" ? l.slug : null;
    if (!slug) continue;
    const exacte = l.locale === locale;
    if (lot.has(slug) && (exactes.has(slug) || !exacte)) continue;
    lot.set(slug, panneauDe(l));
    if (exacte) exactes.add(slug);
  }
  return lot;
}

/** Lit le lot d'une collection dans une langue, ou null (pas de base, collection absente). */
export type LireLeLot = (collection: string, locale: string) => Promise<Map<string, PanneauSeo> | null>;

/**
 * Les lots d'une requete. `panneau` rend le panneau tire du lot, ou undefined
 * quand il faut relire l'entree seule : pas de contexte de requete, premier
 * appel pour cette collection et cette langue, lot illisible, entree absente.
 */
export function creerLesLots(lire: LireLeLot) {
  const parRequete = new WeakMap<object, Map<string, { appels: number; lot?: Promise<Map<string, PanneauSeo> | null> }>>();
  return {
    async panneau(requete: object | null | undefined, collection: string, slug: string, locale: string): Promise<PanneauSeo | undefined> {
      if (!requete) return undefined;
      let etats = parRequete.get(requete);
      if (!etats) {
        etats = new Map();
        parRequete.set(requete, etats);
      }
      const cle = `${collection}\n${locale}`;
      const etat = etats.get(cle) ?? { appels: 0 };
      etats.set(cle, etat);
      etat.appels += 1;
      if (etat.appels < 2) return undefined;
      etat.lot ??= lire(collection, locale).catch(() => null);
      return (await etat.lot)?.get(slug);
    },
  };
}
