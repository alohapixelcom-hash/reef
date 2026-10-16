// src/moteur/qualite-image.ts - la qualite d'encodage des images rendues a la demande : jamais moins que le plancher HD, ecrite dans l'adresse /_image.
//
// LE DEFAUT MESURE EN LIGNE. Au build, aucune image du
// site ne declare de qualite : le service sharp d'Astro laisse alors sharp
// appliquer ses defauts, 80 en WebP et en JPEG, 50 en AVIF. A la demande
// (moteur allume), l'adresse /_image ne portait pas de parametre q, et le
// liant Cloudflare Images encode alors presque sans perte : sur les demos de
// la famille, l'image de tete pesait de 569 a 953 Ko a 390 px et jusqu'a
// 2,9 Mo a 1440 px, contre 100 a 200 Ko pour la variante du build statique.
// La regle ci-dessous ecrit donc dans l'adresse la qualite que le build aurait
// appliquee, format par format.
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

/**
 * LE PLANCHER HD DES IMAGES RENDUES A LA DEMANDE (demande de Justin, 16/10/2026 :
 * « du HD et aucune image pixelisee »). A la demande, c'est le liant
 * Cloudflare Images qui encode, pas sharp : a la meme valeur il lisse plus.
 * Regarde a l'oeil le 16/10/2026 (deux photos Pexels en pleine resolution,
 * vrai liant, crops a 100 % et a 300 %) : WebP 80 efface le grain fin d'une
 * eau calme, 85 ne se distingue plus de la reference a 100 % ; AVIF 70 lisse
 * le sable et le feuillage, 80 non. Toute qualite chiffree plus basse,
 * declaree par un composant ou heritee du build, remonte a ce plancher.
 */
export const PLANCHER_HD: Readonly<Record<string, number>> = {
  webp: 85,
  jpeg: 85,
  jpg: 85,
  avif: 80,
};

/**
 * Les options d'une image rendue a la demande, avec une qualite jamais sous
 * le plancher HD : absente, elle prend le plancher ; chiffree et plus basse,
 * elle y remonte ; chiffree et plus haute, ou nommee ("high"), elle reste la
 * sienne. Un format sans plancher (png, gif, svg) ne recoit rien. L'objet
 * recu n'est pas modifie.
 */
export function avecQualiteHD<T extends { format?: string; quality?: unknown }>(options: T): T {
  const plancher = options.format ? PLANCHER_HD[options.format] : undefined;
  if (plancher === undefined) return options;
  const q = options.quality;
  if (typeof q === "string" && q !== "" && Number.isNaN(Number(q))) return options;
  const chiffre = q === undefined || q === null || q === "" ? undefined : Number(q);
  if (chiffre !== undefined && chiffre >= plancher) return options;
  return { ...options, quality: plancher };
}
