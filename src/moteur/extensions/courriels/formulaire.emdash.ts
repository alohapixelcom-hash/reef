// src/moteur/extensions/courriels/formulaire.emdash.ts - moteur allume : le formulaire de contact et celui de la lettre postent vers l'extension Courriels, quand elle est branchee.
//
// BRANCHEE veut dire : la liaison d'envoi existe dans le Worker, et les
// reglages ont une adresse d'expedition et un destinataire pour le contact.
// Il manque une piece : null, et le formulaire se comporte exactement comme
// avant (aucune action, rien n'est envoye). L'ecran "Courriels" du back
// office dit alors ce qui manque. Aucune adresse n'est lue ailleurs que dans
// les reglages : il n'y en a aucune dans le code.
import { hote, lettreDuSite, ROUTE_DE_LA_LETTRE, ROUTE_DU_FORMULAIRE } from "./adaptateur.ts";
import type { Envoi } from "./formulaire.fichiers.ts";
import { lireLesReglages } from "./noyau/base.ts";
import { manques } from "./noyau/envoi.ts";
import { manquesDeLaLettre } from "./noyau/parution.ts";
import { LETTRE_EN } from "./ecrans/lettre.textes.en.ts";
import { LETTRE_FR } from "./ecrans/lettre.textes.fr.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

export type { Envoi };

/** Le nom du champ piege : un robot remplit tout, un humain ne le voit pas. */
export const CHAMP_PIEGE = "site_web";

export async function envoiDuFormulaire(page: { url: URL; currentLocale?: string | undefined }): Promise<Envoi | null> {
  const { base, liaison } = await hote();
  if (!base || !liaison) return null;
  try {
    const reglages = await lireLesReglages(base);
    if (manques(reglages, true).length > 0) return null;
  } catch {
    return null;
  }
  const langue = page.currentLocale === "fr" ? "fr" : "en";
  const t = langue === "fr" ? FR : EN;
  const statut = page.url.searchParams.get("courriel");
  const avis =
    statut === "envoye"
      ? { ton: "succes" as const, texte: t.visiteur.envoye }
      : statut === "garde"
        ? { ton: "attention" as const, texte: t.visiteur.garde }
        : statut === "invalide"
          ? { ton: "attention" as const, texte: t.visiteur.invalide }
          : null;
  return {
    attributs: { action: ROUTE_DU_FORMULAIRE, method: "post" },
    caches: { retour: page.url.pathname, langue, piege: CHAMP_PIEGE },
    avis,
  };
}

/**
 * Le formulaire d'inscription a la lettre : il poste vers la route de la
 * lettre quand le site a une lettre (configuration.ts), la liaison d'envoi et
 * une adresse d'expedition. Sinon null, et le formulaire reste tel qu'il est
 * livre (ou poste vers l'adresse externe de l'entree "site").
 */
export async function envoiDeLaLettre(page: { url: URL; currentLocale?: string | undefined }): Promise<Envoi | null> {
  if (!lettreDuSite()) return null;
  const { base, liaison } = await hote();
  if (!base || !liaison) return null;
  try {
    if (manquesDeLaLettre(await lireLesReglages(base), true).length > 0) return null;
  } catch {
    return null;
  }
  const langue = page.currentLocale === "fr" ? "fr" : "en";
  const t = langue === "fr" ? LETTRE_FR : LETTRE_EN;
  const statut = page.url.searchParams.get("lettre") ?? "";
  const bons = ["confirme", "attente", "desinscrit"];
  const avis = Object.hasOwn(t.visiteur, statut) ? { ton: bons.includes(statut) ? ("succes" as const) : ("attention" as const), texte: t.visiteur[statut as keyof typeof t.visiteur] } : null;
  return {
    attributs: { action: `${ROUTE_DE_LA_LETTRE}/inscrire`, method: "post" },
    caches: { retour: page.url.pathname, langue, piege: CHAMP_PIEGE },
    avis,
  };
}
