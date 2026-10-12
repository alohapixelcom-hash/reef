// src/moteur/medias/conversion.ts - convertir une photo par le liant Cloudflare Images : orientation corrigee, metadonnees retirees, 2560 px au plus, AVIF ou WebP ; l'original reste la reponse a tout echec.
//
// CE QUE FAIT LE LIANT, SELON LA DOCUMENTATION DE CLOUDFLARE (lue le
// 11/10/2026, developers.cloudflare.com/images/optimization/features/) :
//   "For all other output formats (e.g. WebP or PNG), all metadata will always
//   be discarded." et "Color profiles and EXIF rotation are applied to the
//   image even if the metadata is discarded."
// Une sortie WebP ou AVIF part donc sans EXIF (la position GPS d'un iPhone
// comprise) et deja tournee : on ne lit ni n'ecrit l'EXIF ici.
//   fit "scale-down" : "never upscales the image" ; c'est le defaut, on
//   l'ecrit quand meme pour que la regle se lise dans le code.
//   quality : non posee, Cloudflare applique son defaut ("The default is 85").
//
// JAMAIS DE PERTE POUR LE CLIENT : aucune exception ne sort d'ici. Liant
// absent, erreur, format rendu inattendu, sortie plus lourde : le resultat dit
// "passe" ou "echec" avec sa raison, et l'appelant garde l'original.
import {
  type Decision,
  decider,
  dimensionsDe,
  type Dimensions,
  type Essai,
  essaiRetenu,
  type FormatDeSortie,
  GRAND_COTE_MAX,
  nomAvecExtension,
  type Raison,
  type Sorte,
  sorteDe,
  TYPES,
  webpAnime,
} from "./regles.ts";

/** La forme du liant Images, reduite a ce que ce fichier appelle (types complets : @cloudflare/workers-types). */
export interface Images {
  input(flux: ReadableStream<Uint8Array>): {
    transform(t: { width?: number; height?: number; fit?: "scale-down" }): {
      output(o: { format: string; quality?: number }): Promise<{ image(): ReadableStream<Uint8Array>; contentType(): string }>;
    };
  };
}

export interface OptionsDeConversion {
  /** false : jamais d'AVIF (par exemple pour garder le recadrage natif d'EmDash 0.38, reserve a JPEG, PNG et WebP). */
  avif?: boolean;
}

export type Conversion =
  | {
      etat: "converti";
      octets: Uint8Array<ArrayBuffer>;
      nom: string;
      type: string;
      format: FormatDeSortie;
      /** Relues dans les octets rendus ; null si illisibles (EmDash les calcule alors lui-meme a l'envoi). */
      dimensions: Dimensions | null;
      avant: number;
      apres: number;
      sorte: Sorte;
    }
  | { etat: "passe"; raison: Raison; sorte: Sorte; avant: number }
  | { etat: "echec"; raison: Raison; sorte: Sorte; avant: number; detail: string };

function flux(octets: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      c.enqueue(octets);
      c.close();
    },
  });
}

/** Un message d'erreur court pour le journal, sans pile ni donnee du client. */
export function court(e: unknown): string {
  const texte = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return texte.slice(0, 200);
}

async function essayer(images: Images, octets: Uint8Array, format: FormatDeSortie): Promise<{ essai: Essai; sortie: Uint8Array<ArrayBuffer> | null; erreur: string | null }> {
  try {
    const rendu = await images
      .input(flux(octets))
      .transform({ width: GRAND_COTE_MAX, height: GRAND_COTE_MAX, fit: "scale-down" })
      .output({ format: TYPES[format] });
    const sortie = new Uint8Array(await new Response(rendu.image()).arrayBuffer());
    return { essai: { demande: format, recue: sortie.length ? sorteDe(sortie) : null, taille: sortie.length }, sortie, erreur: null };
  } catch (e) {
    return { essai: { demande: format, recue: null, taille: 0 }, sortie: null, erreur: court(e) };
  }
}

/** La decision pour ces octets, sans rien appeler : reconnaissance, dimensions, animation. */
export function decisionPour(octets: Uint8Array, options: OptionsDeConversion = {}): { decision: Decision; sorte: Sorte } {
  const sorte = sorteDe(octets);
  const decision = decider({ sorte, taille: octets.length, dimensions: dimensionsDe(octets), anime: sorte === "webp" && webpAnime(octets) }, options);
  return { decision, sorte };
}

/**
 * Convertit une photo. `nom` est celui que le client a donne : seule son
 * extension change. Rend toujours un resultat, jamais une exception.
 */
export async function convertir(octets: Uint8Array, nom: string, images: Images | null | undefined, options: OptionsDeConversion = {}): Promise<Conversion> {
  const avant = octets.length;
  const { decision, sorte } = decisionPour(octets, options);
  if (decision.action === "passer") return { etat: "passe", raison: decision.raison, sorte, avant };
  if (!images) return { etat: "passe", raison: "sans-liaison", sorte, avant };

  const erreurs: string[] = [];
  for (const format of decision.formats) {
    const { essai, sortie, erreur } = await essayer(images, octets, format);
    if (erreur) erreurs.push(`${format}: ${erreur}`);
    else if (essai.recue !== format) erreurs.push(`${format}: rendu ${essai.recue ?? "vide"}`);
    if (!sortie || !essaiRetenu({ sorte, taille: avant }, essai)) continue;
    return {
      etat: "converti",
      octets: sortie,
      nom: nomAvecExtension(nom, format),
      type: TYPES[format],
      format,
      dimensions: dimensionsDe(sortie),
      avant,
      apres: sortie.length,
      sorte,
    };
  }
  // Aucun essai retenu : sans erreur, c'est que la sortie pesait plus que l'original.
  return erreurs.length === 0 ? { etat: "passe", raison: "plus-lourd", sorte, avant } : { etat: "echec", raison: "echec", sorte, avant, detail: erreurs.join(" ; ") };
}
