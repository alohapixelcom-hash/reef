// src/moteur/extensions/gestion/boite.ts - la boite des messages d'un site, ou qu'ils vivent : dans sa propre base (le cas general), ou chez un autre Worker par une liaison de service (alohapixel.com, dont le formulaire est range par la boutique).
//
// UNE FORME, DEUX SOURCES. L'ecran "Messages" ne sait pas d'ou viennent les
// lignes : il appelle les routes de extension.ts, qui parlent a une `Boite`.
// La boite locale lit la table courriels_messages (extension Courriels) ; la
// boite distante appelle l'entree de service declaree par le site
// (site.ts), sans rien recopier : un message lu d'un cote l'est de l'autre.
import type { Base } from "../courriels/noyau/base.ts";
import type { Poster } from "../courriels/noyau/canal.ts";
import { classer, compterLesMessages, type Filtre, listeDesMessages, type MessageRecu, noterLaReponse, type Statut, STATUTS, supprimerDesMessages, unMessage } from "../courriels/noyau/messages.ts";
import type { Reglages } from "../courriels/noyau/regles.ts";

export type { Statut };
export { STATUTS };

export interface MessageDeLaBoite {
  id: string;
  recu_le: number;
  nom: string;
  adresse: string;
  sujet: string;
  message: string;
  statut: Statut;
  page: string | null;
  repondu_le: number | null;
  reponse: string | null;
}

export interface PageDeMessages {
  items: MessageDeLaBoite[];
  /** Le decalage de la page suivante (boite locale) ou le curseur de la source distante. */
  suite: number | string | null;
  total: number;
  compteurs: Record<Statut, number>;
}

export interface Reponse {
  ok: boolean;
  message: string;
}

export interface Boite {
  /** Vrai quand les messages vivent chez un autre Worker. */
  distante: boolean;
  /** Faux quand la source ne permet pas d'effacer (l'ecran propose alors d'archiver). */
  peutSupprimer: boolean;
  liste(r: { filtre?: Filtre; q?: string; depuis?: number | string; limite?: number }): Promise<PageDeMessages>;
  /** Ouvre un message ; un message non lu passe en lu. */
  detail(id: string, qui?: string): Promise<MessageDeLaBoite | null>;
  classer(ids: readonly string[], statut: Statut, qui: string): Promise<number>;
  supprimer(ids: readonly string[], qui: string): Promise<number>;
  repondre(id: string, texte: string, qui: string): Promise<Reponse>;
  nonLus(): Promise<number>;
}

const versLaBoite = (m: MessageRecu): MessageDeLaBoite => ({ id: m.id, recu_le: m.recu_le, nom: m.nom, adresse: m.adresse, sujet: m.sujet, message: m.message, statut: m.statut, page: m.page, repondu_le: m.repondu_le, reponse: m.reponse });

/** "Re : sujet", sans empiler les "Re :". */
export const sujetDeLaReponse = (sujet: string): string => (/^re ?:/i.test(sujet.trim()) ? sujet.trim() : `Re : ${sujet.trim() || "votre message"}`);

/** Le texte de la reponse, suivi du message d'origine cite ligne a ligne. */
export function texteDeLaReponse(texte: string, m: { nom: string; recu_le: number; message: string }): string {
  const quand = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(m.recu_le));
  const cite = m.message.split("\n").map((l) => `> ${l}`).join("\n");
  return `${texte.trim()}\n\n${m.nom}, le ${quand} :\n${cite}\n`;
}

/** La boite d'un site dont le formulaire ecrit dans sa propre base. */
export function boiteLocale(base: Base, poster: Poster, reglages: () => Promise<Reglages>): Boite {
  return {
    distante: false,
    peutSupprimer: true,
    async liste(r) {
      const page = await listeDesMessages(base, { ...r, depuis: typeof r.depuis === "number" ? r.depuis : 0 });
      return { items: page.items.map(versLaBoite), suite: page.suite, total: page.total, compteurs: await compterLesMessages(base) };
    },
    async detail(id) {
      const m = await unMessage(base, id);
      if (!m) return null;
      if (m.statut === "nouveau") await classer(base, [id], "lu", Date.now());
      return versLaBoite({ ...m, statut: m.statut === "nouveau" ? "lu" : m.statut });
    },
    classer: (ids, statut) => classer(base, ids, statut, Date.now()),
    supprimer: (ids) => supprimerDesMessages(base, ids),
    async repondre(id, texte) {
      const m = await unMessage(base, id);
      if (!m) return { ok: false, message: "Ce message n'existe plus : il a peut-être été supprimé." };
      const r = await reglages();
      const issue = await poster(
        { a: [m.adresse], sujet: sujetDeLaReponse(m.sujet), texte: texteDeLaReponse(texte, m) },
        { origine: "contact", plafonner: "mois", ...(r.reponse || r.expediteur ? { reponse: r.reponse || r.expediteur } : {}) },
      );
      if (issue.etat !== "envoye") return { ok: false, message: "La réponse n'est pas partie. Elle est gardée dans « Journal des courriels », avec la raison et un bouton « Renvoyer ce courriel »." };
      await noterLaReponse(base, id, texte.trim(), Date.now());
      return { ok: true, message: `Réponse envoyée à ${m.adresse}.` };
    },
    async nonLus() {
      return (await compterLesMessages(base)).nouveau;
    },
  };
}
