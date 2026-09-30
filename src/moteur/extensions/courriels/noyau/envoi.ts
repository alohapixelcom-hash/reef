// src/moteur/extensions/courriels/noyau/envoi.ts - une livraison, du reglage au journal : plafonds, liaison Cloudflare, erreur traduite ; et les trois usages du site (formulaire, essai, renvoi).
//
// LA REGLE : CHAQUE TENTATIVE S'INSCRIT AU JOURNAL, partie ou non, AVEC son
// contenu. Un message refuse (liaison absente, domaine non verifie) ou bloque
// par un plafond n'est donc jamais perdu : il attend au journal, et le bouton
// "Renvoyer" le fait repartir a l'identique une fois la cause reglee. C'est le
// repli de cette extension, a la place d'un second fournisseur : la maison ne
// pose aucune cle d'API dans les themes (tout vit chez Cloudflare), et un
// message garde vaut mieux qu'un message confie a un service de plus.
//
// `envoyer` est le coeur du fournisseur du canal d'EmDash (voir canal.ts) ;
// les usages du site ne l'appellent jamais directement : ils passent par le
// canal, comme les courriels du back office.
//
// LES PLAFONDS se comptent sur les envois PARTIS du journal, juste avant
// d'envoyer. Deux envois strictement simultanes peuvent donc depasser un
// plafond d'une unite : c'est un garde-fou contre les robots, pas une caisse.
import { type Base, comptes, inscrire, type Ligne, type Message, uneLigne } from "./base.ts";
import type { Poster } from "./canal.ts";
import { adresseValide, domaineDe, type Etat, FORMULAIRES, type Formulaire, type Langue, listeDAdresses, type Origine, plafondAtteint, type Reglages, remplir } from "./regles.ts";
import { FR, type Textes } from "../ecrans/textes.fr.ts";

/**
 * La liaison `send_email` du Worker, reduite a ce que ce module appelle : la
 * forme structuree de Cloudflare Email Sending (documentation email-service,
 * Workers API), la meme que le fournisseur livre avec @emdash-cms/cloudflare.
 */
export interface Liaison {
  send(message: { to: string[]; from: { email: string; name: string }; subject: string; text: string; html?: string; replyTo?: string; headers?: Record<string, string> }): Promise<unknown>;
}

export interface Contexte {
  base: Base;
  liaison: Liaison | null;
  maintenant: () => number;
  nouvelId: () => string;
}

export interface Issue {
  etat: Etat;
  id: string;
  code: string | null;
}

const LONGUEUR_DETAIL = 300;
/** Le nom du visiteur tel que l'accuse le reprend : assez pour un prenom et un nom, trop court pour une annonce. */
const NOM_DANS_L_ACCUSE = 40;

/** Le message d'erreur d'un code, dans une langue. Les codes des plafonds portent leur limite : "PLAFOND:heure:20". */
export function erreurEnClair(t: Textes, code: string | null, detail = ""): string | null {
  if (!code) return null;
  const plafond = /^PLAFOND:(heure|jour|destinataire|mois):(\d+)$/.exec(code);
  if (plafond) return t.erreurs.plafond(plafond[1] as "heure", Number(plafond[2]));
  const connu = (t.erreurs as unknown as Record<string, unknown>)[code];
  return typeof connu === "string" ? connu : t.erreurs.inconnue(code, detail);
}

export interface Options {
  /** L'envoi dont celui-ci est le renvoi. */
  renvoiDe?: string | null;
  /** L'identifiant de ligne, quand l'appelant l'a deja choisi (canal.ts). */
  id?: string;
  /** Faux : le contenu n'est pas garde (courriel du back office, porteur d'un jeton). */
  garder?: boolean;
  /**
   * Faux : les plafonds ne s'appliquent pas (meme courriel du back office).
   * "mois" : seul le plafond du mois s'applique (une parution de la lettre,
   * geste de l'administrateur : les plafonds d'heure, de jour et par adresse
   * protegent des robots du formulaire, pas d'une liste confirmee).
   */
  plafonner?: boolean | "mois";
}

/** Une livraison : garde-fous, liaison, journal. Ne leve jamais : l'issue dit ce qui s'est passe. */
export async function envoyer(ctx: Contexte, reglages: Reglages, origine: Origine, message: Message, options: Options = {}): Promise<Issue> {
  const quand = ctx.maintenant();
  const id = options.id ?? ctx.nouvelId();
  const destinataire = message.a.join(", ") || "-";
  const ligne: Ligne = { id, quand, formulaire: origine, destinataire, sujet: message.sujet, fournisseur: "aucun", etat: "refuse", code: null, erreur: null, identifiant: null, message: options.garder === false ? null : message, renvoi_de: options.renvoiDe ?? null };
  const noter = async (etat: Etat, code: string | null, detail = "", fournisseur = "aucun"): Promise<Issue> => {
    await inscrire(ctx.base, { ...ligne, etat, code, erreur: erreurEnClair(FR, code, detail), fournisseur });
    return { etat, id, code };
  };

  if (message.a.length === 0) return noter("refuse", "SANS_DESTINATAIRE");
  if (!reglages.expediteur) return noter("refuse", "SANS_EXPEDITEUR");
  if (!ctx.liaison) return noter("refuse", "SANS_LIAISON");

  const plafonds = options.plafonner === "mois" ? { heure: 0, jour: 0, destinataire: 0, mois: reglages.plafonds.mois } : reglages.plafonds;
  const atteint = options.plafonner === false ? null : plafondAtteint(plafonds, await comptes(ctx.base, destinataire, quand, reglages.cycle));
  if (atteint) return noter("plafonne", `PLAFOND:${atteint}:${reglages.plafonds[atteint]}`);

  try {
    const reponse = (await ctx.liaison.send({
      to: message.a,
      from: { email: reglages.expediteur, name: reglages.nom || domaineDe(reglages.expediteur) },
      subject: message.sujet,
      text: message.texte,
      ...(message.html ? { html: message.html } : {}),
      ...(message.reponse ? { replyTo: message.reponse } : {}),
      ...(message.entetes ? { headers: message.entetes } : {}),
    })) as { messageId?: unknown } | undefined;
    const identifiant = typeof reponse?.messageId === "string" ? reponse.messageId : null;
    await inscrire(ctx.base, { ...ligne, etat: "envoye", fournisseur: "cloudflare", identifiant });
    return { etat: "envoye", id, code: null };
  } catch (erreur) {
    // La liaison leve une Error qui porte un `code` (E_SENDER_NOT_VERIFIED,
    // E_RATE_LIMIT_EXCEEDED...). Le message d'origine ne contient que la raison
    // donnee par Cloudflare : il est garde, raccourci, pour le cas inconnu.
    const e = erreur as { code?: unknown; message?: unknown };
    const code = typeof e.code === "string" && /^E_[A-Z_]+$/.test(e.code) ? e.code : "INCONNU";
    const detail = String(e.message ?? erreur).slice(0, LONGUEUR_DETAIL);
    return noter("refuse", code, detail, "cloudflare");
  }
}

/* --- Le formulaire de contact -------------------------------------------- */

export interface Champs {
  nom: string;
  adresse: string;
  sujet: string;
  message: string;
  /** Le champ piege, invisible pour un humain : rempli, c'est un robot. */
  piege: string;
  langue: Langue;
}

/** Ce que le visiteur lira en revenant sur la page. */
export type Accueil = "envoye" | "garde" | "invalide";

const propre = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "");

export function lireChamps(brut: Record<string, unknown>): Champs {
  return {
    nom: propre(brut.name, 200).replace(/[\n<>"]/g, " "),
    adresse: propre(brut.email, 254).toLowerCase(),
    // "topic" (Koa), ou "subject" (le nom d'origine du champ chez Reef).
    sujet: propre(brut.topic ?? brut.subject, 200).replace(/\n/g, " "),
    message: propre(brut.message, 5000),
    piege: propre(brut.site_web, 200),
    langue: brut.langue === "fr" ? "fr" : "en",
  };
}

export interface Site {
  /** Le nom du site, pour le corps des courriels. */
  nom: string;
  /** La langue de la personne qui recoit les notifications : celle du back office. */
  langue: Langue;
  catalogues: Record<Langue, Textes>;
  /**
   * Garde le message dans la base du site (ecran "Messages" du back office),
   * AVANT la notification : un message dont la notification echoue reste
   * lisible. Absent : rien n'est garde (les essais purs).
   */
  garder?: (m: { nom: string; adresse: string; sujet: string; message: string; langue: Langue }) => Promise<void>;
}

/**
 * Recoit un message du formulaire de contact : la notification au destinataire
 * regle, puis, si elle est partie et si l'accuse est allume, l'accuse au
 * visiteur dans sa langue. Les deux passent par le canal d'EmDash.
 */
export async function recevoirContact(poster: Poster, reglages: Reglages, champs: Champs, site: Site): Promise<Accueil> {
  // Un robot recoit la meme reponse qu'un humain : lui dire qu'il est reconnu
  // l'aiderait a se corriger. Rien ne part, rien ne s'inscrit.
  if (champs.piege) return "envoye";
  if (!champs.nom || !champs.message || !adresseValide(champs.adresse)) return "invalide";

  const t = site.catalogues[site.langue];
  const sujet = champs.sujet || t.courriels.sansSujet;
  if (site.garder) await site.garder({ nom: champs.nom, adresse: champs.adresse, sujet, message: champs.message, langue: champs.langue });
  const issue = await poster(
    {
      a: listeDAdresses(reglages.destinataires.contact),
      sujet: t.courriels.notificationSujet(sujet),
      texte: t.courriels.notification({ site: site.nom, nom: champs.nom, adresse: champs.adresse, sujet, message: champs.message }),
    },
    { origine: "contact", reponse: champs.adresse },
  );
  if (issue.etat !== "envoye") return "garde";

  if (reglages.accuse.actif) {
    // L'accuse part vers une adresse saisie par un inconnu : il ne recopie
    // JAMAIS le message, et le nom y est raccourci. Sinon un robot ferait du
    // formulaire un relais de pourriel vers l'adresse de son choix, signe du
    // domaine du site. Les plafonds (par destinataire surtout) font le reste.
    const nomAffiche = reglages.nom || site.nom;
    await poster(
      {
        a: [champs.adresse],
        sujet: reglages.accuse.sujet[champs.langue],
        texte: remplir(reglages.accuse.texte[champs.langue], { nom: champs.nom.slice(0, NOM_DANS_L_ACCUSE), site: nomAffiche }),
      },
      { origine: "accuse", reponse: reglages.reponse || reglages.expediteur },
    );
  }
  return "envoye";
}

/* --- L'essai et le renvoi ------------------------------------------------ */

export function essai(poster: Poster, reglages: Reglages, vers: string, t: Textes, site: string, quand: string): Promise<Issue> {
  return poster({ a: [vers], sujet: t.courriels.essaiSujet(site), texte: t.courriels.essai(site, quand) }, { origine: "essai", reponse: reglages.reponse || reglages.expediteur });
}

/**
 * Renvoie une ligne du journal, a l'identique, par le canal. Un message de
 * formulaire garde sans destinataire (il n'etait pas encore regle) repart vers
 * le destinataire regle aujourd'hui : c'est tout l'interet de l'avoir garde.
 */
export async function renvoyer(poster: Poster, base: Base, reglages: Reglages, id: string): Promise<Issue | "introuvable" | "sans-contenu"> {
  const ligne = await uneLigne(base, id);
  if (!ligne) return "introuvable";
  if (!ligne.message) return "sans-contenu";
  const formulaire = (FORMULAIRES as readonly string[]).includes(ligne.formulaire) ? (ligne.formulaire as Formulaire) : null;
  const a = ligne.message.a.length === 0 && formulaire ? listeDAdresses(reglages.destinataires[formulaire]) : ligne.message.a;
  const { reponse, ...message } = ligne.message;
  return poster({ ...message, a }, { origine: ligne.formulaire, renvoiDe: ligne.id, ...(reponse ? { reponse } : {}) });
}

export type Manque = "liaison" | "fournisseur" | "expediteur" | "destinataire";

/** Pret a recevoir le formulaire : la liaison, le fournisseur choisi (quand on le sait), l'expediteur et le destinataire du contact. */
export function manques(reglages: Reglages, liaison: boolean, fournisseur = true): Manque[] {
  const liste: Manque[] = [];
  if (!liaison) liste.push("liaison");
  if (liaison && !fournisseur) liste.push("fournisseur");
  if (!reglages.expediteur) liste.push("expediteur");
  if (!reglages.destinataires.contact) liste.push("destinataire");
  return liste;
}
