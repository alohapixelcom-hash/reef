// src/moteur/extensions/courriels/noyau/canal.ts - le branchement sur le canal de courriel d'EmDash : le fournisseur (email:deliver), le journal (email:afterSend), et la facon d'y faire passer un courriel du site.
//
// LE CANAL NATIF D'EMDASH 0.38 (node_modules/emdash/src/plugins/email.ts) :
// tout courriel passe par `send(message, source)`, puis
//   1. email:beforeSend (intermediaires, sautes pour les courriels "system") ;
//   2. email:deliver, EXCLUSIF : un seul fournisseur livre, celui qu'EmDash
//      a choisi (seul quand il est le seul ; sinon par sa route
//      d'administration, que l'ecran "Brancher" appelle d'un clic) ;
//   3. email:afterSend, apres une livraison reussie (saute pour "system").
// Cette extension est le fournisseur (la liaison Cloudflare Email du Worker)
// ET le journal. Le formulaire de contact, l'essai et le renvoi passent par
// le meme canal que les courriels du back office : un seul chemin, un seul
// journal, et l'essai de l'ecran natif s'y inscrit aussi.
//
// CE QUE LE CANAL NE PORTE PAS : un message EmDash n'a que `to`, `subject`,
// `text` et `html`. L'adresse de reponse (le visiteur, pour la notification
// du contact), l'origine (quel formulaire) et le lien de renvoi voyagent donc
// a cote, dans un contexte asynchrone (AsyncLocalStorage) ouvert autour de
// l'appel : le fournisseur et le journal s'executent dans ce meme contexte.
// Un courriel d'une autre source (le back office, une autre extension) arrive
// sans ce contexte : il prend son origine de la source.
//
// QUI ECRIT LA LIGNE DU JOURNAL : le fournisseur, toujours, avant de rendre la
// main (un echec ne va jamais jusqu'a afterSend, et un courriel "system" non
// plus). afterSend inscrit ce qu'un AUTRE fournisseur a livre (la console
// d'EmDash en developpement) ; pour ce que Courriels a livre il ne fait rien.
// L'identifiant de ligne est unique : un doublon est impossible.
import { AsyncLocalStorage } from "node:async_hooks";
import { type Base, inscrire, type Message } from "./base.ts";
import { type Contexte, envoyer, erreurEnClair, type Issue } from "./envoi.ts";
import { listeDAdresses, type Origine, origineDeLaSource, type Reglages } from "./regles.ts";
import type { Textes } from "../ecrans/textes.fr.ts";

/** Un message tel que le canal d'EmDash le transporte (EmailMessage). */
export interface MessageDuCanal {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** L'evenement que recoivent email:deliver et email:afterSend. */
export interface Evenement {
  message: MessageDuCanal;
  source: string;
}

/** L'envoi du canal, source deja liee : `ctx.email.send` ou `emdash.email.send(m, id)`. */
export type Canal = (message: MessageDuCanal) => Promise<void>;

/** Ce qui voyage a cote du message, et ce que le fournisseur y laisse. */
interface Supplement {
  id: string;
  origine: Origine;
  reponse?: string;
  renvoiDe: string | null;
  issue?: Issue;
  /** Les en-tetes de plus du message (lettre d'information). */
  entetes?: Record<string, string>;
  /** "mois" : seul le plafond du mois s'applique (parution de la lettre). */
  plafonner?: "mois";
}

// UNE SEULE COPIE PAR ISOLAT, rangee sur globalThis. Le formulaire (route
// injectee par Astro) et le fournisseur (extension chargee par EmDash)
// peuvent importer ce module par deux chemins et en obtenir deux copies (vu
// sous astro dev : le fournisseur ne voyait pas le contexte
// ouvert par le formulaire et ecrivait une seconde ligne "Autre extension").
// Le contexte et la liste des messages livres doivent etre les memes pour tous.
interface Partage {
  contexte: AsyncLocalStorage<Supplement>;
  /** Les messages deja livres et inscrits par ce fournisseur : afterSend les reconnait. */
  livres: WeakMap<object, Issue>;
}
const CLE_PARTAGEE = Symbol.for("aloha-courriels.canal");
const racine = globalThis as unknown as Record<symbol, Partage | undefined>;
const partage: Partage = (racine[CLE_PARTAGEE] ??= { contexte: new AsyncLocalStorage<Supplement>(), livres: new WeakMap<object, Issue>() });
const { contexte, livres } = partage;

/** L'erreur que le canal rend a l'appelant (l'ecran natif l'affiche telle quelle). */
export class ErreurDeCourriel extends Error {
  readonly issue: Issue;
  constructor(issue: Issue, texte: string) {
    super(texte);
    this.name = "ErreurDeCourriel";
    this.issue = issue;
  }
}

/* --- Le fournisseur : email:deliver ------------------------------------- */

export interface Dependances {
  contexte: Contexte;
  reglages: Reglages;
  /** Le catalogue des erreurs rendues au canal : la langue du back office. */
  textes: Textes;
  /** Source du canal (identifiant d'une extension) vers origine au journal. */
  sources?: Readonly<Record<string, Origine>>;
}

/**
 * Le gestionnaire de email:deliver. Plafonds, liaison, journal : c'est
 * `envoyer`. Un courriel "system" (lien de connexion, invitation) n'est ni
 * plafonne (un plafond ne doit jamais fermer la porte du back office) ni garde
 * en entier (il porte un jeton) : seuls son sujet et son destinataire
 * s'inscrivent.
 */
export function fournisseur(charger: () => Promise<Dependances>) {
  return async (evenement: Evenement): Promise<void> => {
    const s = contexte.getStore();
    const { contexte: ctx, reglages, textes, sources } = await charger();
    const origine = s?.origine ?? origineDeLaSource(evenement.source, sources);
    const systeme = origine === "systeme";
    const message: Message = {
      a: listeDAdresses(evenement.message.to),
      sujet: evenement.message.subject,
      texte: evenement.message.text,
      ...(evenement.message.html ? { html: evenement.message.html } : {}),
      ...(s?.reponse ? { reponse: s.reponse } : reglages.reponse ? { reponse: reglages.reponse } : {}),
      ...(s?.entetes ? { entetes: s.entetes } : {}),
    };
    const issue = await envoyer(ctx, reglages, origine, message, {
      renvoiDe: s?.renvoiDe ?? null,
      ...(s ? { id: s.id } : {}),
      garder: !systeme,
      plafonner: systeme ? false : (s?.plafonner ?? true),
    });
    livres.set(evenement.message, issue);
    if (s) s.issue = issue;
    if (issue.etat !== "envoye") throw new ErreurDeCourriel(issue, erreurEnClair(textes, issue.code) ?? issue.code ?? "");
  };
}

/* --- Le journal : email:afterSend --------------------------------------- */

export interface DependancesDuJournal {
  base: Base;
  /** L'extension qui a livre, telle qu'EmDash l'a choisie ; null si inconnue. */
  livreur: string | null;
  /** L'identifiant de cette extension : quand c'est elle qui livre, sa ligne est deja ecrite. */
  soi: string;
  sources?: Readonly<Record<string, Origine>>;
  maintenant: () => number;
  nouvelId: () => string;
}

/** Le gestionnaire de email:afterSend : inscrit ce qu'un autre fournisseur a livre. */
export function journaliste(charger: () => Promise<DependancesDuJournal>) {
  return async (evenement: Evenement): Promise<void> => {
    if (livres.has(evenement.message)) return;
    const s = contexte.getStore();
    const d = await charger();
    // Deuxieme garde, independante de la memoire du module : en developpement,
    // un rechargement de Vite peut donner au fournisseur et au journal deux
    // copies de ce module (vu : une ligne "Autre extension" en
    // double d'un accuse). Si Courriels est le livreur choisi, la ligne existe.
    if (d.livreur === d.soi) return;
    const m = evenement.message;
    await inscrire(d.base, {
      id: s?.id ?? d.nouvelId(),
      quand: d.maintenant(),
      formulaire: s?.origine ?? origineDeLaSource(evenement.source, d.sources),
      destinataire: listeDAdresses(m.to).join(", ") || "-",
      sujet: m.subject,
      fournisseur: d.livreur ?? "autre",
      etat: "envoye",
      code: null,
      erreur: null,
      identifiant: null,
      message: { a: listeDAdresses(m.to), sujet: m.subject, texte: m.text, ...(m.html ? { html: m.html } : {}), ...(s?.reponse ? { reponse: s.reponse } : {}) },
      renvoi_de: s?.renvoiDe ?? null,
    });
  };
}

/* --- Faire passer un courriel du site par le canal ---------------------- */

export interface Passage {
  origine: Origine;
  reponse?: string;
  renvoiDe?: string | null;
  /** "mois" : seul le plafond du mois (parution de la lettre, voir envoi.ts). */
  plafonner?: "mois";
}

/** Ce que les usages du site (formulaire, essai, renvoi) appellent : une issue, jamais une exception. */
export type Poster = (message: Message, passage: Passage) => Promise<Issue>;

/**
 * Le poster du site : le message part par le canal d'EmDash, et l'issue est
 * celle que le fournisseur a notee. Ce que le canal refuse AVANT le
 * fournisseur (aucun fournisseur choisi, message sans destinataire) est
 * inscrit ici, avec sa cause : un message n'est jamais perdu.
 */
export function poster(ctx: Omit<Contexte, "liaison">, canal: Canal | null): Poster {
  return async (message, passage) => {
    const s: Supplement = {
      id: ctx.nouvelId(),
      origine: passage.origine,
      renvoiDe: passage.renvoiDe ?? null,
      ...(passage.reponse ? { reponse: passage.reponse } : {}),
      ...(message.entetes ? { entetes: message.entetes } : {}),
      ...(passage.plafonner ? { plafonner: passage.plafonner } : {}),
    };
    const noter = async (etat: Issue["etat"], code: string | null, fournisseur: string): Promise<Issue> => {
      await inscrire(ctx.base, {
        id: s.id,
        quand: ctx.maintenant(),
        formulaire: s.origine,
        destinataire: message.a.join(", ") || "-",
        sujet: message.sujet,
        fournisseur,
        etat,
        code,
        erreur: null,
        identifiant: null,
        message: passage.reponse ? { ...message, reponse: passage.reponse } : message,
        renvoi_de: s.renvoiDe,
      });
      return { etat, id: s.id, code };
    };
    if (message.a.length === 0) return noter("refuse", "SANS_DESTINATAIRE", "aucun");
    if (!canal) return noter("refuse", "SANS_FOURNISSEUR", "aucun");
    try {
      await contexte.run(s, () => canal({ to: message.a.join(", "), subject: message.sujet, text: message.texte, ...(message.html ? { html: message.html } : {}) }));
    } catch (erreur) {
      if (s.issue) return s.issue;
      const nom = erreur instanceof Error ? erreur.name : "";
      return noter("refuse", nom === "EmailNotConfiguredError" ? "SANS_FOURNISSEUR" : "CANAL", "aucun");
    }
    // Livre par un autre fournisseur : son afterSend a la meme ligne en route,
    // meme identifiant ; la premiere ecrite gagne, la seconde ne fait rien.
    return s.issue ?? noter("envoye", null, "autre");
  };
}
