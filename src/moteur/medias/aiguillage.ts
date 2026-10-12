// src/moteur/medias/aiguillage.ts - l'aiguillage des photos en tete du Worker : chaque photo envoyee a la Mediatheque est convertie avant qu'EmDash la range.
//
// LE CHEMIN DES OCTETS DANS EMDASH 0.38 (relu dans son dist et dans l'admin) :
//   1. l'admin demande d'abord une adresse d'envoi : POST
//      /_emdash/api/media/upload-url (JSON : nom, type, taille). EmDash cree
//      une ligne media "pending" (type, taille et cle figes) ; avec R2 en
//      liaison, il n'a pas d'adresse signee (storage/r2.mjs : NOT_SUPPORTED)
//      et rend /_emdash/api/media/<id>/upload, puis l'admin y envoie les
//      octets bruts (PUT, taille exacte exigee) et confirme (POST .../confirm) ;
//   2. si cette demande repond 501, l'admin retombe sur l'envoi en un temps :
//      POST /_emdash/api/media en multipart (file, width, height, dossier...),
//      ou EmDash lit le fichier, choisit la cle d'apres le nom, calcule
//      empreinte, flou et couleur, et cree la ligne d'un coup.
// Le crochet media:beforeUpload ne recoit que {name, type, size}, jamais les
// octets : la conversion ne peut pas s'y faire.
//
// D'OU LE PARTI : pour une photo, l'aiguillage repond 501 a la demande
// d'adresse (1), et reecrit l'envoi en un temps (2) : le fichier converti
// remplace l'original dans le formulaire, avec son nom, son type et ses
// dimensions ; EmDash fait tout le reste comme d'habitude (cle a la bonne
// extension, mime_type, size, width, height, flou, dedoublonnage). Aucune
// ligne d'EmDash n'est touchee ici. Le HEIC, qu'EmDash 0.38 refuse
// (GLOBAL_UPLOAD_ALLOWLIST), entre ainsi converti.
//
// JAMAIS DE PERTE : liant absent ou en echec, sortie plus lourde, champ qui
// n'accepte pas le format converti (liste propre a un champ, refus 400
// INVALID_TYPE) : l'original part tel quel, et c'est inscrit au journal.
//
// JAMAIS DE TRANSFORMATION POUR UN INCONNU : chaque transformation est
// facturee (developers.cloudflare.com/images/optimization/binding/). Avant de
// convertir, l'aiguillage demande a EmDash qui est connecte (/auth/me) ; sans
// session d'un role qui peut envoyer (contributeur, 20, et plus), la requete
// part telle quelle et EmDash la refuse lui-meme.
import { convertir, court, type Images, type OptionsDeConversion } from "./conversion.ts";
import { ROUTE_D_ADRESSE, ROUTE_D_ENVOI, ROUTE_DE_L_UTILISATEUR } from "./identite.mjs";
import { type Base, noter } from "./base.ts";
import { peutSeConvertir, sorteAnnoncee, sorteDe } from "./regles.ts";

export { d1De } from "./base.ts";

/** Le role minimal de la permission media:upload dans EmDash 0.38 (@emdash-cms/auth, Permissions). */
export const ROLE_QUI_ENVOIE = 20;

export interface OptionsDeLAiguillage extends OptionsDeConversion {
  /** Le liant Images du Worker (env.IMAGES), ou rien : l'original passe alors, et c'est journalise. */
  images: Images | null | undefined;
  /** La base du site, pour le journal ; null : le journal part dans les traces du Worker seulement. */
  base: Base | null;
  /** La suite du Worker (EmDash), jamais ce Worker entier : l'aiguillage s'y rappellerait lui-meme. */
  suite: (requete: Request) => Promise<Response>;
  /** L'horloge, remplacable dans le self-check. */
  maintenant?: () => number;
}

const EN_TETES_SANS_CORPS = ["content-type", "content-length", "transfer-encoding"];

function entetesSansCorps(h: Headers): Headers {
  const copie = new Headers(h);
  for (const nom of EN_TETES_SANS_CORPS) copie.delete(nom);
  return copie;
}

/** Une reponse au format d'EmDash (apiError) : l'admin ne lit que le statut 501. */
function refusDAdresse(): Response {
  return Response.json(
    { error: { code: "NOT_SUPPORTED", message: "Photos are converted on the direct upload path." } },
    { status: 501, headers: { "cache-control": "private, no-store" } },
  );
}

async function journaliser(base: Base | null, ligne: Parameters<typeof noter>[1]): Promise<void> {
  // Le journal ne doit jamais faire echouer un envoi.
  console.log(`[aloha-medias] ${ligne.origine} ${ligne.etat} ${ligne.nom ?? ""} ${ligne.avant ?? ""} -> ${ligne.apres ?? ""} ${ligne.detail ?? ""}`.trim());
  if (!base) return;
  try {
    await noter(base, ligne);
  } catch (e) {
    console.error(`[aloha-medias] journal impossible : ${court(e)}`);
  }
}

/** Vrai si la requete porte une session (ou un jeton) d'un role qui peut envoyer un media. */
async function peutEnvoyer(request: Request, suite: OptionsDeLAiguillage["suite"]): Promise<boolean> {
  const entetes = new Headers();
  for (const nom of ["cookie", "authorization"]) {
    const v = request.headers.get(nom);
    if (v) entetes.set(nom, v);
  }
  if (![...entetes.keys()].length) return false;
  try {
    const r = await suite(new Request(new URL(ROUTE_DE_L_UTILISATEUR, request.url), { method: "GET", headers: entetes }));
    if (!r.ok) return false;
    const corps = (await r.json()) as { data?: { role?: unknown } };
    return typeof corps.data?.role === "number" && corps.data.role >= ROLE_QUI_ENVOIE;
  } catch {
    return false;
  }
}

/** L'identifiant et le nom du media qu'EmDash vient de creer, lus dans sa reponse sans la consommer. */
async function mediaCree(reponse: Response): Promise<{ id: string | null; nom: string | null; deja: boolean }> {
  try {
    const corps = (await reponse.clone().json()) as { data?: { item?: { id?: string; filename?: string }; deduplicated?: boolean } };
    return { id: corps.data?.item?.id ?? null, nom: corps.data?.item?.filename ?? null, deja: corps.data?.deduplicated === true };
  } catch {
    return { id: null, nom: null, deja: false };
  }
}

function envoyer(request: Request, formulaire: FormData, suite: OptionsDeLAiguillage["suite"]): Promise<Response> {
  return suite(new Request(request.url, { method: "POST", headers: entetesSansCorps(request.headers), body: formulaire }));
}

/** Le formulaire d'origine, le fichier remplace par sa conversion ; les autres champs (dossier, champ, dedoublonnage) restent. */
function formulaireConverti(origine: FormData, fichier: File, largeur: number | null, hauteur: number | null): FormData {
  const f = new FormData();
  for (const [nom, valeur] of origine.entries()) {
    if (nom === "file" || nom === "width" || nom === "height") continue;
    f.append(nom, valeur);
  }
  f.append("file", fichier);
  // Sans dimensions lisibles, EmDash les calcule lui-meme (enrichImageMetadata).
  if (largeur && hauteur) {
    f.append("width", String(largeur));
    f.append("height", String(hauteur));
  }
  return f;
}

/** Vrai si EmDash a refuse le type du fichier (liste propre a un champ). */
async function typeRefuse(reponse: Response): Promise<boolean> {
  if (reponse.status !== 400) return false;
  try {
    const corps = (await reponse.clone().json()) as { error?: { code?: string } };
    return corps.error?.code === "INVALID_TYPE";
  } catch {
    return false;
  }
}

async function demandeDAdresse(request: Request, o: OptionsDeLAiguillage): Promise<Response | null> {
  let corps: { contentType?: unknown; filename?: unknown };
  try {
    corps = await request.clone().json();
  } catch {
    return null;
  }
  const sorte = sorteAnnoncee(typeof corps.contentType === "string" ? corps.contentType : "", typeof corps.filename === "string" ? corps.filename : "");
  if (!peutSeConvertir(sorte)) return null;
  if (!o.images) {
    // Sans liant, l'envoi en deux temps d'EmDash fait son travail habituel : l'original passe.
    const nom = typeof corps.filename === "string" ? corps.filename : null;
    await journaliser(o.base, {
      media_id: `envoi:${crypto.randomUUID()}`,
      etat: "garde",
      origine: "envoi",
      nom,
      avant: null,
      apres: null,
      format: null,
      detail: "sans-liaison",
      quand: new Date((o.maintenant ?? Date.now)()).toISOString(),
    });
    return null;
  }
  return refusDAdresse();
}

async function envoiEnUnTemps(request: Request, o: OptionsDeLAiguillage): Promise<Response | null> {
  const maintenant = o.maintenant ?? Date.now;
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) return null;
  let formulaire: FormData;
  try {
    formulaire = await request.formData();
  } catch {
    // Le corps est lu : il ne peut plus partir a EmDash, qui l'aurait refuse de meme.
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid form data" } }, { status: 400 });
  }
  const fichier = formulaire.get("file");
  if (!(fichier instanceof File)) return envoyer(request, formulaire, o.suite);
  // Une video ou un PDF (jusqu'a 50 Mo chez EmDash) ne doit pas etre copie en memoire pour rien :
  // les premiers octets suffisent a dire que ce n'est pas une photo a convertir.
  const tete = new Uint8Array(await fichier.slice(0, 4096).arrayBuffer());
  if (!peutSeConvertir(sorteDe(tete))) return envoyer(request, formulaire, o.suite);
  if (!(await peutEnvoyer(request, o.suite))) return envoyer(request, formulaire, o.suite);

  const octets = new Uint8Array(await fichier.arrayBuffer());
  const conversion = await convertir(octets, fichier.name, o.images, o);
  const quand = () => new Date(maintenant()).toISOString();

  if (conversion.etat !== "converti") {
    const reponse = await envoyer(request, formulaire, o.suite);
    const cree = await mediaCree(reponse);
    await journaliser(o.base, {
      media_id: cree.id ?? `envoi:${crypto.randomUUID()}`,
      etat: conversion.etat === "echec" ? "echec" : "garde",
      origine: "envoi",
      nom: fichier.name,
      avant: conversion.avant,
      apres: null,
      format: null,
      detail: conversion.etat === "echec" ? `${conversion.raison} : ${conversion.detail}` : conversion.raison,
      quand: quand(),
    });
    return reponse;
  }

  const converti = new File([conversion.octets], conversion.nom, { type: conversion.type });
  const d = conversion.dimensions;
  let reponse = await envoyer(request, formulaireConverti(formulaire, converti, d?.largeur ?? null, d?.hauteur ?? null), o.suite);
  if (await typeRefuse(reponse)) {
    // Le champ n'accepte que certains types : l'original, que le client a choisi, passe.
    reponse = await envoyer(request, formulaire, o.suite);
    const cree = await mediaCree(reponse);
    await journaliser(o.base, {
      media_id: cree.id ?? `envoi:${crypto.randomUUID()}`,
      etat: "garde",
      origine: "envoi",
      nom: fichier.name,
      avant: conversion.avant,
      apres: null,
      format: null,
      detail: `champ-refuse-${conversion.format}`,
      quand: quand(),
    });
    return reponse;
  }
  if (reponse.ok) {
    const cree = await mediaCree(reponse);
    await journaliser(o.base, {
      media_id: cree.id ?? `envoi:${crypto.randomUUID()}`,
      etat: "fait",
      origine: "envoi",
      nom: cree.nom ?? conversion.nom,
      avant: conversion.avant,
      apres: conversion.apres,
      format: conversion.format,
      detail: cree.deja ? "deja-en-base" : null,
      quand: quand(),
    });
  }
  return reponse;
}

/**
 * La reponse de l'aiguillage pour cette requete, ou null quand elle ne le
 * concerne pas : le Worker continue alors son chemin habituel, requete
 * intacte. A appeler en tete du fetch, avant EmDash.
 */
export async function aiguillerLesMedias(request: Request, options: OptionsDeLAiguillage): Promise<Response | null> {
  if (request.method !== "POST") return null;
  const chemin = new URL(request.url).pathname.replace(/\/+$/, "");
  if (chemin === ROUTE_D_ADRESSE) return demandeDAdresse(request, options);
  if (chemin === ROUTE_D_ENVOI) return envoiEnUnTemps(request, options);
  return null;
}
