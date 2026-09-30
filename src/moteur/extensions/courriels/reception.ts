// src/moteur/extensions/courriels/reception.ts - la route qui recoit le formulaire de contact, l'envoie par le canal de courriel d'EmDash, puis renvoie le visiteur sur sa page avec le resultat.
//
// UN FORMULAIRE HTML ORDINAIRE, SANS SCRIPT : le navigateur poste, cette route
// repond 303 vers la page d'ou il vient (?courriel=envoye|garde|invalide),
// et la page affiche la phrase correspondante. Rien ne depend de JavaScript,
// comme le reste du theme. Rendue a la demande, moteur allume seulement.
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
import { hote, nouvelId } from "./adaptateur.ts";
import { CONFIGURATION } from "./configuration.ts";
import { IDENTITE } from "./identite.mjs";
import { lireLesReglages } from "./noyau/base.ts";
import { garderLeMessage } from "./noyau/messages.ts";
import { type Canal, poster } from "./noyau/canal.ts";
import { cheminDeRetour } from "./noyau/regles.ts";
import { type Accueil, lireChamps, recevoirContact } from "./noyau/envoi.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

export const prerender = false;

function retour(chemin: string, accueil: Accueil): Response {
  return new Response(null, { status: 303, headers: { Location: `${chemin}?courriel=${accueil}#courriel`, "Cache-Control": "no-store" } });
}

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

export const POST: APIRoute = async ({ request, locals }) => {
  let brut: Record<string, unknown> = {};
  try {
    const donnees = await request.formData();
    brut = Object.fromEntries([...donnees.entries()].filter(([, v]) => typeof v === "string"));
  } catch {
    return retour("/", "invalide");
  }
  const chemin = cheminDeRetour(brut.retour);
  const { base } = await hote();
  if (!base) return retour(chemin, "garde");
  try {
    const reglages = await lireLesReglages(base);
    const accueil = await recevoirContact(poster({ base, maintenant: Date.now, nouvelId }, canalDe(locals)), reglages, lireChamps(brut), {
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

/** Une adresse ouverte a la main n'a rien a afficher : retour a l'accueil. */
export const GET: APIRoute = () => new Response(null, { status: 303, headers: { Location: "/" } });
