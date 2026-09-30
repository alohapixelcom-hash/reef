// src/moteur/references.ts - une reference d'EmDash (l'auteur d'un article, son sujet) ramenee a l'adresse de l'entree dans une langue (generique).
//
// UN CHAMP "reference" RANGE UN IDENTIFIANT : celui du groupe de traductions
// de l'entree choisie (le champ de saisie de champs/admin.ts), parfois celui
// d'une de ses versions (une saisie par l'API). Le site, lui, relie une page a
// l'adresse de l'entree dans la langue de la page ("/fr/authors/mara/").
// Cette fonction fait le pont, sans base ni moteur : on lui donne les fiches
// lues une fois par requete, elle rend l'adresse.
//
// UNE BASE D'AVANT LA MIGRATION range encore l'adresse elle-meme : une valeur qui n'est l'identifiant d'aucune
// fiche est rendue telle quelle. Le code et la base peuvent donc arriver en
// ligne dans n'importe quel ordre.

/** Ce qu'on garde d'une entree : son identifiant, son groupe de traductions, sa langue, son adresse. */
export interface Fiche {
  id: string;
  groupe: string;
  langue: string;
  slug: string;
}

export interface IndexDesFiches {
  /** Identifiant (d'une version ou du groupe) vers groupe. */
  groupes: Map<string, string>;
  /** "groupe|langue" vers adresse. */
  adresses: Map<string, string>;
  /** Groupe vers une adresse quelconque, quand la langue demandee n'a pas de version. */
  repli: Map<string, string>;
}

/** Les fiches lues, indexees une fois. Une fiche sans adresse est ignoree. */
export function indexer(fiches: readonly Fiche[]): IndexDesFiches {
  const index: IndexDesFiches = { groupes: new Map(), adresses: new Map(), repli: new Map() };
  for (const f of fiches) {
    if (!f.slug) continue;
    const groupe = f.groupe || f.id;
    index.groupes.set(f.id, groupe);
    index.groupes.set(groupe, groupe);
    index.adresses.set(`${groupe}|${f.langue}`, f.slug);
    if (!index.repli.has(groupe) || f.langue === "en") index.repli.set(groupe, f.slug);
  }
  return index;
}

/** L'adresse de l'entree referencee dans une langue ; la valeur elle-meme si elle ne designe aucune fiche (ancienne base). */
export function adresseDeLaReference(valeur: unknown, langue: string, index: IndexDesFiches): string {
  const brut = typeof valeur === "string" ? valeur.trim() : "";
  const groupe = index.groupes.get(brut);
  if (!groupe) return brut;
  return index.adresses.get(`${groupe}|${langue}`) ?? index.repli.get(groupe) ?? brut;
}

/** Une fiche depuis les donnees d'une entree rendue par getEmDashCollection (id, translationGroup, locale, slug). */
export function ficheDe(donnees: unknown, repliDeLangue: string): Fiche {
  const d = (donnees ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return { id: s(d.id), groupe: s(d.translationGroup), langue: s(d.locale) || repliDeLangue, slug: s(d.slug) };
}
