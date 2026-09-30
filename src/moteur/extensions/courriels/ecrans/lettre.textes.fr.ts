// src/moteur/extensions/courriels/ecrans/lettre.textes.fr.ts - chaque phrase de la lettre d'information en francais : ecran du back office, avis au visiteur, courriels envoyes.
//
// Meme regle que textes.fr.ts : aucune phrase dans la logique, le jumeau
// anglais (lettre.textes.en.ts) a le type de celui-ci.
const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const abonnes = (n: number) => `${nombre(n)} abonné${n > 1 ? "s" : ""}`;

export const LETTRE_FR = {
  page: "Lettre d'information",
  intro:
    "Les personnes qui s'inscrivent sur votre site reçoivent d'abord un courriel pour confirmer leur adresse. Une fois confirmées, elles apparaissent ici, et vous pouvez leur envoyer un article d'un clic. Chaque courriel porte un lien pour se désinscrire.",
  pasPrete: "La lettre ne peut pas encore partir",
  manques: (liste: string[]) => `Il manque : ${liste.join(" ; ")}. Tant que rien n'est branché, le formulaire d'inscription du site reste comme avant.`,
  inscrits: "Abonnés",
  inscritsDetail: "adresses confirmées, qui reçoivent la lettre",
  attente: "En attente",
  attenteDetail: "inscriptions pas encore confirmées, effacées au bout de 7 jours",
  envoyer: "Envoyer un article",
  envoyerAide: "Choisissez un article publié : chaque abonné le reçoit dans sa langue quand elle existe, avec le titre, le chapo et un lien vers la page.",
  choisirArticle: "Article à envoyer",
  aucunArticleChoisi: "Choisissez un article",
  aucunArticle: "Aucun article publié pour l'instant : publiez-en un, puis revenez ici.",
  aucunAbonne: "Personne n'est encore abonné : le bouton d'envoi apparaîtra avec le premier abonné confirmé.",
  bouton: (n: number) => `Envoyer à ${abonnes(n)}`,
  confirmerTitre: "Envoyer cet article ?",
  confirmerTexte: (titre: string, n: number) => `« ${titre} » part maintenant vers ${abonnes(n)}. Un envoi ne se rattrape pas.`,
  confirmerDeja: (titre: string, quand: string, n: number) => `« ${titre} » a déjà été envoyé le ${quand}. Il repartira vers ${abonnes(n)}. Un envoi ne se rattrape pas.`,
  confirmerOui: "Envoyer",
  confirmerNon: "Annuler",
  dejaEnvoye: (quand: string) => `Déjà envoyé le ${quand}.`,
  envoye: (n: number) => `L'article est parti vers ${abonnes(n)}.`,
  envoyePartiel: (n: number, refuses: number) => `L'article est parti vers ${abonnes(n)} ; ${nombre(refuses)} envoi${refuses > 1 ? "s" : ""} n'${refuses > 1 ? "ont" : "a"} pas pu partir : la raison est dans le Journal des courriels, avec un bouton « Renvoyer ».`,
  forfait: (n: number, reste: number) => `Envoyer à ${abonnes(n)} dépasserait le plafond du mois (il reste ${nombre(reste)} envoi${reste > 1 ? "s" : ""}). Relevez « Envois au plus sur le mois » dans Réglages des courriels, ou attendez le prochain mois.`,
  introuvable: "Cet article n'est plus publié : choisissez-en un autre.",
  liste: "Les abonnés",
  colonnes: { adresse: "Adresse", langue: "Langue", etat: "État", depuis: "Depuis" },
  langues: { fr: "Français", en: "Anglais" },
  etats: { inscrit: "Abonné", attente: "À confirmer", desinscrit: "Désinscrit" },
  gererAilleurs: "Pour chercher une adresse, en désinscrire, réinscrire ou supprimer plusieurs à la fois, ou exporter la liste : ouvrez « Abonnés de la lettre » dans le menu.",
  vide: "Aucune inscription pour l'instant. Elles apparaîtront ici dès qu'une personne remplira le formulaire du site.",
  retirer: "Retirer une adresse",
  retirerAide: "À la demande d'une personne, par exemple : l'adresse est effacée de la liste, sans courriel.",
  choisirAbonne: "Adresse à retirer",
  aucuneAdresseChoisie: "Choisissez une adresse",
  boutonRetirer: "Retirer cette adresse",
  retirerTitre: "Retirer cette adresse ?",
  retirerTexte: (adresse: string) => `${adresse} ne recevra plus la lettre. Elle pourra se réinscrire depuis le site.`,
  retire: (adresse: string) => `${adresse} a été retirée de la liste.`,
  parutions: "Derniers envois de la lettre",
  colonnesParutions: { quand: "Quand", article: "Article", envoyes: "Partis", refuses: "Pas partis" },
  aucuneParution: "Aucun article envoyé pour l'instant.",
  /* La page de confirmation de la desinscription (lien du pied d'un courriel). */
  desinscription: {
    titre: "Se désinscrire de la lettre",
    phrase: (site: string, adresse: string) => `L'adresse ${adresse} ne recevra plus la lettre de ${site}. Vous pourrez vous réinscrire à tout moment depuis le site.`,
    bouton: "Me désinscrire",
    garder: "Garder mon abonnement",
  },
  /* Ce que lit le visiteur en revenant sur le site. */
  visiteur: {
    attente: "Presque fini : un courriel vient de partir vers votre adresse. Cliquez sur le lien qu'il contient pour confirmer votre inscription.",
    invalide: "Cette adresse ne semble pas valide : vérifiez-la, puis inscrivez-vous à nouveau.",
    garde: "L'inscription n'a pas pu aboutir tout de suite. Réessayez dans quelques minutes.",
    confirme: "C'est confirmé : vous recevrez les prochains articles. Chaque courriel contient un lien pour vous désinscrire.",
    desinscrit: "Vous êtes désinscrit : vous ne recevrez plus la lettre. Vous pouvez vous réinscrire à tout moment.",
    inconnu: "Ce lien n'est plus valable : il a peut-être déjà servi, ou l'inscription a expiré. Inscrivez-vous à nouveau si vous le souhaitez.",
  },
  /* Les courriels. */
  courriels: {
    confirmationSujet: (site: string) => `Confirmez votre inscription à la lettre de ${site}`,
    confirmation: (site: string, lien: string) =>
      `Bonjour,\n\nQuelqu'un, sans doute vous, a demandé à recevoir la lettre de ${site} à cette adresse.\n\nPour confirmer, ouvrez ce lien :\n${lien}\n\nSi ce n'est pas vous, ignorez ce courriel : sans confirmation, l'adresse est effacée au bout de 7 jours et vous ne recevrez rien.\n\n${site}`,
    lire: "Lire l'article",
    pied: (site: string) => `Vous recevez ce courriel parce que vous êtes abonné à la lettre de ${site}.`,
    desinscrire: "Se désinscrire",
  },
};

export type TextesDeLaLettre = typeof LETTRE_FR;
