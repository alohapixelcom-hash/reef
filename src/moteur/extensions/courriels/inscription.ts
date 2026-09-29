// src/moteur/extensions/courriels/inscription.ts - la route de la lettre d'information : l'inscription (formulaire du site), la confirmation et la desinscription (liens des courriels).
//
// MEME FORME QUE reception.ts : des formulaires HTML ordinaires, sans script.
// Le navigateur poste, la route repond 303 vers la page d'ou il vient
// (?lettre=attente|invalide|garde#lettre-avis), et la page affiche la phrase.
// Les liens des courriels ramenent a l'accueil de la langue de l'abonne
// (?lettre=confirme|desinscrit|inconnu#lettre-avis).
//
//   POST /_emdash/courriels/lettre/inscrire     email, langue, retour, site_web (piege)
//   GET  /_emdash/courriels/lettre/confirmer?jeton=...
//   GET  /_emdash/courriels/lettre/desinscrire?jeton=...  (le lien du pied)
//   POST /_emdash/courriels/lettre/desinscrire?jeton=...  (le bouton des messageries, RFC 8058 : 200, sans page)
//
// La route vit sous /_emdash/ (voir reception.ts). Astro verifie l'origine
// d'un POST de formulaire ; le POST en un clic des messageries n'est pas un
// formulaire (corps List-Unsubscribe=One-Click) et n'a besoin que du jeton.
import type { APIRoute } from "astro";
import { getSiteSettings } from "emdash";
import { hote, lettreDuSite, nouvelId, ROUTE_DE_LA_LETTRE } from "./adaptateur.ts";
import { CONFIGURATION } from "./configuration.ts";
import { IDENTITE } from "./identite.mjs";
import { lireLesReglages } from "./noyau/base.ts";
import { type Canal, poster } from "./noyau/canal.ts";
import { accueilDe, confirmer, demanderLInscription, desinscrire, liensDeLAbonne } from "./noyau/lettre.ts";
import { confirmation } from "./noyau/parution.ts";
import { cheminDeRetour, type Langue } from "./noyau/regles.ts";
import { LETTRE_EN } from "./ecrans/lettre.textes.en.ts";
import { LETTRE_FR } from "./ecrans/lettre.textes.fr.ts";

export const prerender = false;

/** Ce que lit le visiteur en revenant : les cles de `visiteur` des catalogues de la lettre. */
export type AvisDeLaLettre = keyof typeof LETTRE_FR.visiteur;

/** L'ancre de l'avis dans la page : le site pose id="lettre-avis" sur la phrase. */
export const ANCRE_DE_L_AVIS = "lettre-avis";

function retour(chemin: string, avis: AvisDeLaLettre): Response {
  return new Response(null, { status: 303, headers: { Location: `${chemin}?lettre=${avis}#${ANCRE_DE_L_AVIS}`, "Cache-Control": "no-store" } });
}

async function nomDuSite(): Promise<string> {
  try {
    const reglages = (await getSiteSettings()) as { title?: unknown };
    return typeof reglages.title === "string" && reglages.title.trim() ? reglages.title.trim() : CONFIGURATION.nomDuSite;
  } catch {
    return CONFIGURATION.nomDuSite;
  }
}

function canalDe(locals: unknown): Canal | null {
  const email = (locals as { emdash?: { email?: { isAvailable(): boolean; send(m: unknown, source: string): Promise<void> } | null } }).emdash?.email;
  return email?.isAvailable() ? (m) => email.send(m, IDENTITE.id) : null;
}

async function inscrire(request: Request, locals: unknown): Promise<Response> {
  let brut: Record<string, unknown> = {};
  try {
    brut = Object.fromEntries([...(await request.formData()).entries()].filter(([, v]) => typeof v === "string"));
  } catch {
    return retour("/", "invalide");
  }
  const chemin = cheminDeRetour(brut.retour);
  const langue: Langue = brut.langue === "fr" ? "fr" : "en";
  // Un robot lit la meme phrase qu'un humain, et rien ne part.
  if (typeof brut.site_web === "string" && brut.site_web.trim()) return retour(chemin, "attente");
  const lettre = lettreDuSite();
  const { base } = await hote();
  if (!lettre || !base) return retour(chemin, "garde");
  try {
    const demande = await demanderLInscription(base, { adresse: String(brut.email ?? "").slice(0, 254), langue, page: chemin }, Date.now(), nouvelId);
    if (demande.etat === "invalide") return retour(chemin, "invalide");
    // Deja abonne : la meme phrase, et rien ne part (on ne dit pas a un inconnu qui est inscrit).
    if (!demande.jeton) return retour(chemin, "attente");
    const reglages = await lireLesReglages(base);
    const site = reglages.nom || (await nomDuSite());
    const { confirmer: lien } = liensDeLAbonne(new URL(request.url).origin, ROUTE_DE_LA_LETTRE, demande.jeton);
    const envoi = poster({ base, maintenant: Date.now, nouvelId }, canalDe(locals));
    const issue = await confirmation(envoi, langue === "fr" ? LETTRE_FR : LETTRE_EN, String(brut.email).trim().toLowerCase(), site, lien, reglages.reponse);
    return retour(chemin, issue.etat === "envoye" ? "attente" : "garde");
  } catch (erreur) {
    console.error("Courriels : inscription non traitee", erreur instanceof Error ? erreur.message : String(erreur));
    return retour(chemin, "garde");
  }
}

async function lien(url: URL, geste: "confirmer" | "desinscrire", unClic: boolean): Promise<Response> {
  const lettre = lettreDuSite();
  const { base } = await hote();
  const jeton = url.searchParams.get("jeton");
  if (!lettre || !base) return unClic ? new Response(null, { status: 404 }) : retour("/", "inconnu");
  if (geste === "confirmer") {
    const issue = await confirmer(base, jeton, Date.now());
    if (issue.issue === "inconnu" || !issue.abonne) return retour(accueilDe(lettre, "en"), "inconnu");
    return retour(accueilDe(lettre, issue.abonne.langue), "confirme");
  }
  const parti = await desinscrire(base, jeton);
  if (unClic) return new Response(null, { status: parti ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  return parti ? retour(accueilDe(lettre, parti.langue), "desinscrit") : retour(accueilDe(lettre, "en"), "inconnu");
}

export const GET: APIRoute = async ({ params, url }) => {
  const geste = params.geste;
  if (geste === "confirmer" || geste === "desinscrire") return lien(url, geste, false);
  return new Response(null, { status: 303, headers: { Location: "/" } });
};

export const POST: APIRoute = async ({ params, url, request, locals }) => {
  const geste = params.geste;
  if (geste === "inscrire") return inscrire(request, locals);
  if (geste === "desinscrire") return lien(url, "desinscrire", true);
  return new Response(null, { status: 404 });
};
