// src/moteur/qualite-image.ts - la qualite d'encodage des images rendues a la demande : celle que sharp applique au build statique, ecrite dans l'adresse.
//
// LE DEFAUT MESURE EN LIGNE LE 24 SEPTEMBRE 2026. Au build, aucune image du
// theme ne declare de qualite : le service sharp d'Astro laisse alors sharp
// appliquer ses defauts, 80 en WebP et en JPEG, 50 en AVIF. A la demande
// (moteur allume), l'adresse /_image ne portait pas de parametre q, et le
// liant Cloudflare Images encode alors presque sans perte : l'image de tete
// de la demo pesait 569 Ko a 390 px et 1,5 Mo a 1440 px, quand le build
// statique sort les memes images entre 100 et 200 Ko. La regle ci-dessous
// ecrit donc dans l'adresse la qualite que le build aurait appliquee, format
// par format.
//
// Pur, sans import : le self-check (qualite-image.selfcheck.ts) le compare
// aux defauts de la version de sharp installee.

/** La qualite qu'applique sharp quand Astro ne lui en donne aucune, par format de sortie. */
export const QUALITE_DU_BUILD: Readonly<Record<string, number>> = {
  webp: 80,
  jpeg: 80,
  jpg: 80,
  avif: 50,
};

/**
 * Les options d'une image, avec la qualite du build quand elles n'en portent
 * pas. Une qualite deja declaree (nombre ou mot : "low", "high"...) reste la
 * sienne ; un format sans defaut connu (png, gif, svg) n'en recoit pas.
 * L'objet recu n'est pas modifie.
 */
export function avecQualiteDuBuild<T extends { format?: string; quality?: unknown }>(options: T): T {
  if (options.quality !== undefined && options.quality !== null && options.quality !== "") return options;
  const qualite = options.format ? QUALITE_DU_BUILD[options.format] : undefined;
  return qualite === undefined ? options : { ...options, quality: qualite };
}
