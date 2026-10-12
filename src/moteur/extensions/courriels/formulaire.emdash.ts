// src/moteur/extensions/courriels/formulaire.emdash.ts - moteur allume : le formulaire de contact et celui de la lettre postent vers l'extension Courriels, quand elle est branchee, avec le widget Turnstile visible.
//
// BRANCHEE veut dire : la liaison d'envoi existe dans le Worker, les reglages
// ont une adresse d'expedition et un destinataire pour le contact, et
// Turnstile n'est ni a moitie pose ni exige sans etre pose
// (noyau/turnstile.ts). Il manque une piece : null, et le formulaire se
// comporte exactement comme avant (aucune action, rien n'est envoye). L'ecran
// "Courriels" du back office dit alors ce qui manque. Aucune adresse n'est lue
// ailleurs que dans les reglages : il n'y en a aucune dans le code.
import { hote, type Hote, lettreDuSite, ROUTE_DE_LA_LETTRE, ROUTE_DU_FORMULAIRE, turnstileExige } from "./adaptateur.ts";
import type { Envoi, WidgetTurnstile } from "./formulaire.fichiers.ts";
import { lireLesReglages } from "./noyau/base.ts";
import { manques } from "./noyau/envoi.ts";
import { manquesDeLaLettre } from "./noyau/parution.ts";
import { protectionPrete, SCRIPT_TURNSTILE } from "./noyau/turnstile.ts";
import { LETTRE_EN } from "./ecrans/lettre.textes.en.ts";
import { LETTRE_FR } from "./ecrans/lettre.textes.fr.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

export type { Envoi };

/** Le nom du champ piege : un robot remplit tout, un humain ne le voit pas. */
export const CHAMP_PIEGE = "site_web";

/** Le widget Turnstile du formulaire : seulement quand la protection est active (cle publique ET secret, noyau/turnstile.ts). */
function widget(h: Hote, langue: "fr" | "en", action: WidgetTurnstile["action"]): Pick<Envoi, "turnstile" | "verification" | "cleTurnstile"> {
  const cle = h.turnstile.etat === "active" ? h.turnstile.cle : null;
  if (!cle) return { turnstile: null, verification: null, cleTurnstile: null };
  const w: WidgetTurnstile = { cle, langue, action, script: SCRIPT_TURNSTILE, sansScript: (langue === "fr" ? FR : EN).visiteur.sansScript, toString: () => cle };
  return { turnstile: w, verification: w, cleTurnstile: cle };
}

/** Le formulaire est-il branche cote Turnstile ? Une protection a moitie posee (ou exigee et absente) le laisse inerte. */
const pret = (h: Hote, url: URL): boolean => protectionPrete(h.turnstile, url, turnstileExige());

export async function envoiDuFormulaire(page: { url: URL; currentLocale?: string | undefined }, formulaire?: string): Promise<Envoi | null> {
  const h = await hote();
  const { base, liaison } = h;
  if (!base || !liaison || !pret(h, page.url)) return null;
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
          : statut === "verification"
            ? { ton: "attention" as const, texte: t.visiteur.verification }
            : null;
  return {
    attributs: { action: ROUTE_DU_FORMULAIRE, method: "post" },
    caches: { retour: page.url.pathname, langue, piege: CHAMP_PIEGE, ...(formulaire ? { formulaire } : {}) },
    avis,
    ...widget(h, langue, "contact"),
  };
}

/**
 * Le formulaire d'inscription a la lettre : il poste vers la route de la
 * lettre quand le site a une lettre (configuration.ts), la liaison d'envoi,
 * une adresse d'expedition et, en ligne, la verification anti-robot. Sinon
 * null, et le formulaire reste tel qu'il est livre (ou poste vers l'adresse
 * externe de l'entree "site").
 */
export async function envoiDeLaLettre(page: { url: URL; currentLocale?: string | undefined }): Promise<Envoi | null> {
  if (!lettreDuSite()) return null;
  const h = await hote();
  const { base, liaison } = h;
  if (!base || !liaison || !pret(h, page.url)) return null;
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
    ...widget(h, langue, "lettre"),
  };
}
