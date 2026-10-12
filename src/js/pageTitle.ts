// src/js/pageTitle.ts - le titre complet d'une page ("Titre | Marque"), tenu entre 30 et 60 caracteres : allonge par une signature de la marque quand il est trop court, sans marque quand il est trop long.

/** Sous ce nombre de caracteres, un titre dit trop peu dans un resultat de recherche (seuil de l'audit SEO du socle : 30 a 60). */
export const TITRE_COURT = 30;
/** Au-dela, Google coupe le titre dans un resultat de recherche. */
export const TITRE_LONG = 60;

/**
 * Le titre complet d'une page.
 *
 * - Un titre qui porte deja la marque reste tel quel ; sinon la marque le suit
 *   ("Pricing | Lagoon").
 * - Trop long avec la marque (plus de TITRE_LONG caracteres), un titre qui
 *   tient seul garde sa place et perd la marque, plutot que d'etre coupe.
 * - Trop court (moins de TITRE_COURT caracteres), il prend la premiere des
 *   signatures (le titre de l'accueil, puis une signature courte) qui nomme la
 *   marque et le mene entre TITRE_COURT et TITRE_LONG ("Pricing | Lagoon - know
 *   what your customers actually feel"). Un titre qui portait deja la marque
 *   prend la signature sans elle ("About Onda | Invoicing that gets paid").
 * - Une signature qui ne nomme pas la marque (marque changee dans les
 *   reglages, accueil reecrit) n'est jamais employee : le titre court reste
 *   juste plutot que d'annoncer une autre marque.
 * - Le titre de l'accueil lui-meme (egal a une signature) ne change pas.
 */
export function pageTitle(title: string, brand: string, separator: string, signatures: readonly string[]): string {
  const brandIn = (s: string) => brand !== "" && s.toLowerCase().includes(brand.toLowerCase());
  const plain = brandIn(title) ? title : `${title}${separator}${brand}`;
  if (plain.length > TITRE_LONG && !brandIn(title) && title.length >= TITRE_COURT && title.length <= TITRE_LONG) return title;
  if (plain.length >= TITRE_COURT || signatures.includes(title)) return plain;
  for (const signature of signatures) {
    if (!brandIn(signature)) continue;
    let long = `${title}${separator}${signature}`;
    if (brandIn(title)) {
      const reste = signature.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").replace(/^[\s,:;|-]+/, "").trim();
      if (reste === "") continue;
      long = `${title}${separator}${reste.charAt(0).toLocaleUpperCase()}${reste.slice(1)}`;
    }
    if (long.length >= TITRE_COURT && long.length <= TITRE_LONG) return long;
  }
  return plain;
}
