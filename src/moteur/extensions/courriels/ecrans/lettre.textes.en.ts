// src/moteur/extensions/courriels/ecrans/lettre.textes.en.ts - the English catalogue of the newsletter, same shape as lettre.textes.fr.ts.
//
// Le type vient du catalogue francais : une cle oubliee ici casse `pnpm check`.
import type { TextesDeLaLettre } from "./lettre.textes.fr.ts";

const count = (n: number) => new Intl.NumberFormat("en-GB").format(n);
const subscribers = (n: number) => `${count(n)} subscriber${n > 1 ? "s" : ""}`;

export const LETTRE_EN: TextesDeLaLettre = {
  page: "Newsletter",
  intro:
    "People who sign up on your site first receive an email to confirm their address. Once confirmed, they appear here, and you can send them an article in one click. Every email carries a link to unsubscribe.",
  pasPrete: "The newsletter cannot go out yet",
  manques: (liste: string[]) => `Missing: ${liste.join("; ")}. Until everything is connected, the site's sign-up form stays as it was.`,
  inscrits: "Subscribers",
  inscritsDetail: "confirmed addresses that receive the newsletter",
  attente: "Pending",
  attenteDetail: "sign-ups not yet confirmed, erased after 7 days",
  envoyer: "Send an article",
  envoyerAide: "Choose a published article: each subscriber receives it in their language when it exists, with the title, the standfirst and a link to the page.",
  choisirArticle: "Article to send",
  aucunArticleChoisi: "Choose an article",
  aucunArticle: "No published article yet: publish one, then come back here.",
  aucunAbonne: "Nobody has subscribed yet: the send button appears with the first confirmed subscriber.",
  bouton: (n: number) => `Send to ${subscribers(n)}`,
  confirmerTitre: "Send this article?",
  confirmerTexte: (titre: string, n: number) => `"${titre}" goes out now to ${subscribers(n)}. A send cannot be undone.`,
  confirmerDeja: (titre: string, quand: string, n: number) => `"${titre}" was already sent on ${quand}. It will go out again to ${subscribers(n)}. A send cannot be undone.`,
  confirmerOui: "Send",
  confirmerNon: "Cancel",
  dejaEnvoye: (quand: string) => `Already sent on ${quand}.`,
  envoye: (n: number) => `The article went out to ${subscribers(n)}.`,
  envoyePartiel: (n: number, refuses: number) => `The article went out to ${subscribers(n)}; ${count(refuses)} email${refuses > 1 ? "s" : ""} could not go out: the reason is in the Email log, with a "Resend" button.`,
  forfait: (n: number, reste: number) => `Sending to ${subscribers(n)} would go over this month's limit (${count(reste)} left). Raise "Emails at most per month" in Email settings, or wait for next month.`,
  introuvable: "This article is no longer published: choose another one.",
  liste: "Subscribers",
  colonnes: { adresse: "Address", langue: "Language", etat: "Status", depuis: "Since" },
  langues: { fr: "French", en: "English" },
  etats: { inscrit: "Subscribed", attente: "To confirm", desinscrit: "Unsubscribed" },
  gererAilleurs: "To search for an address, unsubscribe, resubscribe or delete several at once, or export the list: open « Abonnés de la lettre » in the menu.",
  vide: "No sign-up yet. They will appear here as soon as someone fills in the site's form.",
  retirer: "Remove an address",
  retirerAide: "At someone's request, for example: the address is erased from the list, without any email.",
  choisirAbonne: "Address to remove",
  aucuneAdresseChoisie: "Choose an address",
  boutonRetirer: "Remove this address",
  retirerTitre: "Remove this address?",
  retirerTexte: (adresse: string) => `${adresse} will no longer receive the newsletter. It can sign up again from the site.`,
  retire: (adresse: string) => `${adresse} was removed from the list.`,
  parutions: "Latest newsletter sends",
  colonnesParutions: { quand: "When", article: "Article", envoyes: "Sent", refuses: "Not sent" },
  aucuneParution: "No article sent yet.",
  desinscription: {
    titre: "Unsubscribe from the newsletter",
    phrase: (site: string, adresse: string) => `The address ${adresse} will no longer receive the ${site} newsletter. You can sign up again at any time from the site.`,
    bouton: "Unsubscribe me",
    garder: "Keep my subscription",
  },
  visiteur: {
    attente: "Almost done: an email is on its way to your address. Click the link inside to confirm your subscription.",
    invalide: "This address does not look valid: check it, then sign up again.",
    garde: "The sign-up could not go through right now. Try again in a few minutes.",
    confirme: "Confirmed: you will receive the next articles. Every email contains a link to unsubscribe.",
    desinscrit: "You are unsubscribed: you will no longer receive the newsletter. You can sign up again at any time.",
    inconnu: "This link is no longer valid: it may have been used already, or the sign-up expired. Sign up again if you wish.",
  },
  courriels: {
    confirmationSujet: (site: string) => `Confirm your subscription to the ${site} newsletter`,
    confirmation: (site: string, lien: string) =>
      `Hello,\n\nSomeone, probably you, asked to receive the ${site} newsletter at this address.\n\nTo confirm, open this link:\n${lien}\n\nIf it was not you, ignore this email: without confirmation, the address is erased after 7 days and you will receive nothing.\n\n${site}`,
    lire: "Read the article",
    pied: (site: string) => `You receive this email because you subscribed to the ${site} newsletter.`,
    desinscrire: "Unsubscribe",
  },
};
