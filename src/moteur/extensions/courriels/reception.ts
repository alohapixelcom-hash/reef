// src/moteur/extensions/courriels/reception.ts - la route qui recoit le formulaire de contact, l'envoie par le canal de courriel d'EmDash, puis renvoie le visiteur sur sa page avec le resultat.
//
// UN FORMULAIRE HTML ORDINAIRE : le navigateur poste, cette route repond 303
// vers la page d'ou il vient (?courriel=envoye|garde|invalide|verification),
// et la page affiche la phrase correspondante. Seul le widget Turnstile
// demande JavaScript ; sans lui, le formulaire le dit (Envoi.turnstile.sansScript).
//
// LE PIEGE D'ABORD (un robot lit la meme phrase qu'un humain), PUIS LA PORTE
// (noyau/turnstile.ts), AVANT toute ecriture en base et tout envoi : un jeton
// absent ou refuse, une adresse vide, ramenent au formulaire avec leur avis.
// Ce qui ne peut pas y revenir repond une petite page dans la langue du
// visiteur (noyau/garde.ts) : GET 405, protection exigee mais pas posee 503.
//
// LES CHAMPS EN PLUS : le champ cache `formulaire` nomme un formulaire declare
// par le site (configuration.ts, formulairesDuSite) ; ses champs sont lus,
// nettoyes et bornes (noyau/champs.ts), et partent en tete du message.
//
// La route vit sous /_emdash/ : les Workers de la maison ne redirigent jamais
// ces adresses vers une langue (worker-langue.ts), et le middleware d'EmDash les
// traite comme des adresses publiques. Astro verifie l'origine d'un POST de
// formulaire (security.checkOrigin) : un site tiers ne peut pas poster ici.
//
// LE CANAL : le message part par `emdash.email.send(message, "aloha-courriels")`,
// le canal natif d'EmDash, que le middleware pose sur toute adresse /_emdash.
// Il passe donc par les intermediaires eventuels, puis par le fournisseur
// choisi dans Reglages > Courriels (l'extension Courriels, qui livre par la
// liaison Cloudflare et inscrit la ligne au journal).
import type { APIRoute } from "astro";
import { getSiteSettings } from "emdash";
import { formulaireDuSite, hote, hotesTurnstile, nouvelId, turnstileExige } from "./adaptateur.ts";
import { CONFIGURATION } from "./configuration.ts";
import { IDENTITE } from "./identite.mjs";
import { lireLesReglages } from "./noyau/base.ts";
import { lireLesChampsEnPlus } from "./noyau/champs.ts";
import { reponseDuRefus } from "./noyau/garde.ts";
import { garderLeMessage } from "./noyau/messages.ts";
import { type Canal, poster } from "./noyau/canal.ts";
import { cheminDeRetour, type Langue } from "./noyau/regles.ts";
import { controler, type Recuperer } from "./noyau/turnstile.ts";
import { type Accueil, lireChamps, recevoirContact } from "./noyau/envoi.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

export const prerender = false;

function retour(chemin: string, accueil: Accueil | "verification"): Response {
  return new Response(null, { status: 303, headers: { Location: `${chemin}?courriel=${accueil}#courriel`, "Cache-Control": "no-store" } });
}

/** Le vrai fetch du Worker, sous la forme que la porte appelle. */
const recuperer: Recuperer = (adresse, init) => fetch(adresse, init);

async function nomDuSite(): Promise<string> {
  try {
    const reglages = (await getSiteSettings()) as { title?: unknown };
    return typeof reglages.title === "string" && reglages.title.trim() ? reglages.title.trim() : CONFIGURATION.nomDuSite;
  } catch {
    return CONFIGURATION.nomDuSite;
  }
}

/** Le canal d'EmDash tel que le middleware le pose sur `locals` ; null tant qu'aucun fournisseur n'est choisi. */
function canalDe(locals: unknown): Canal | null {
  const email = (locals as { emdash?: { email?: { isAvailable(): boolean; send(m: unknown, source: string): Promise<void> } | null } }).emdash?.email;
  return email?.isAvailable() ? (m) => email.send(m, IDENTITE.id) : null;
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  let brut: Record<string, unknown> = {};
  try {
    const donnees = await request.formData();
    brut = Object.fromEntries([...donnees.entries()].filter(([, v]) => typeof v === "string"));
  } catch {
    return retour("/", "invalide");
  }
  const chemin = cheminDeRetour(brut.retour);
  const langue: Langue = brut.langue === "fr" ? "fr" : "en";
  const h = await hote();
  // Le piege d'abord : un robot lit toujours la meme phrase qu'un humain
  // (recevoirContact). Puis la porte Turnstile, avant toute ecriture.
  if (!lireChamps(brut).piege) {
    const refus = await controler({ methode: request.method, url, brut, ip: request.headers.get("CF-Connecting-IP"), action: "contact" }, { protection: h.turnstile, hotes: hotesTurnstile(), exigee: turnstileExige() }, recuperer);
    if (refus === "indisponible") {
      console.error("Courriels : Turnstile exige ou a moitie pose, formulaire refuse en ligne");
      return reponseDuRefus((langue === "fr" ? FR : EN).visiteur.refus, { langue, refus, lien: chemin });
    }
    if (refus) return retour(chemin, refus === "sans-adresse" ? "invalide" : "verification");
  }
  const { base } = h;
  if (!base) return retour(chemin, "garde");
  try {
    const reglages = await lireLesReglages(base);
    const declare = formulaireDuSite(brut.formulaire);
    const enPlus = lireLesChampsEnPlus(declare, brut, CONFIGURATION.langue);
    const champs = { ...lireChamps(brut), enPlus: enPlus.valeurs, manquant: enPlus.manquant, nomRequis: declare?.nomRequis !== false, messageRequis: declare?.messageRequis !== false };
    const accueil = await recevoirContact(poster({ base, maintenant: Date.now, nouvelId }, canalDe(locals)), reglages, champs, {
      nom: reglages.nom || (await nomDuSite()),
      langue: CONFIGURATION.langue,
      catalogues: { fr: FR, en: EN },
      garder: (m) => garderLeMessage(base, { ...m, page: chemin }, Date.now(), nouvelId()),
    });
    return retour(chemin, accueil);
  } catch (erreur) {
    console.error("Courriels : message non traite", erreur instanceof Error ? erreur.message : String(erreur));
    return retour(chemin, "garde");
  }
};

/** Une adresse ouverte a la main : 405, avec une page qui ramene a l'accueil. */
export const GET: APIRoute = () => reponseDuRefus((CONFIGURATION.langue === "fr" ? FR : EN).visiteur.refus, { langue: CONFIGURATION.langue, refus: "methode", lien: "/" });
