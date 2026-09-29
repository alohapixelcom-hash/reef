// src/moteur/extensions/courriels/ecrans/textes.fr.ts - chaque phrase de l'extension Courriels en francais : ecrans, erreurs traduites, messages au visiteur, courriels envoyes.
//
// Aucune phrase affichee ne vit dans la logique : une correction de wording ne
// touche que ce fichier et son jumeau anglais (textes.en.ts), dont le type est
// celui-ci. Regle de redaction (principe Apple de l'editeur) : chaque phrase
// dit ce que ca change et ou on le voit ; une erreur dit quoi faire ; aucun
// mot technique sans son explication a cote.
import type { CleDns, EtatDns } from "../noyau/dns.ts";
import type { Etat, Origine, Plafond } from "../noyau/regles.ts";

const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export const FR = {
  locale: "fr-FR",
  pages: { tableau: "Courriels", journal: "Journal des courriels", brancher: "Brancher les courriels", reglages: "Réglages des courriels" },

  origines: { contact: "Formulaire de contact", lettre: "Lettre d'information", commande: "Commande", accuse: "Accusé de réception", essai: "Essai", systeme: "Back office (connexion, invitation)", autre: "Autre extension" } satisfies Record<Origine, string>,
  etats: { envoye: "Envoyé", refuse: "Refusé", plafonne: "Bloqué par un plafond" } satisfies Record<Etat, string>,
  /** Les memes, en un mot, pour la liste "Voir un envoi" qui doit tenir sur un telephone. */
  originesCourtes: { contact: "Contact", lettre: "Lettre", commande: "Commande", accuse: "Accusé", essai: "Essai", systeme: "Back office", autre: "Autre" } satisfies Record<Origine, string>,
  etatsCourts: { envoye: "Envoyé", refuse: "Refusé", plafonne: "Bloqué" } satisfies Record<Etat, string>,
  jamais: "Jamais",
  sansBase: "La base du site est introuvable : les courriels ne peuvent être ni lus ni réglés. Le site tourne-t-il bien avec son moteur allumé ?",
  panne: (detail: string) => `Cet écran n'a pas pu se charger (${detail}). Rechargez la page ; si cela se répète, transmettez ce message à la personne qui gère le site.`,
  actualiser: "Actualiser",

  tableau: {
    intro: "Chaque courriel de votre site (formulaire de contact, accusé de réception, essai) part par Cloudflare et s'inscrit ici : ce qui part, ce qui échoue, et où vous en êtes du forfait du mois.",
    pret: (vers: string) => `Tout est branché : les messages du formulaire de contact arrivent à ${vers}.`,
    pretTitre: "Les courriels partent",
    incompletTitre: "Les courriels ne sont pas encore branchés",
    incomplet: (manques: string[]) => `Il manque : ${manques.join(" ; ")}. Tant que rien n'est branché, le formulaire de contact s'affiche comme avant et n'envoie rien. Ouvrez « Brancher les courriels » dans le menu : chaque étape y est expliquée.`,
    manques: {
      liaison: "le site relié au service d'envoi de Cloudflare (Brancher les courriels, étape 3)",
      fournisseur: "confier les courriels à Courriels (Brancher les courriels, étape 3, un clic)",
      expediteur: "l'adresse d'expédition (Réglages des courriels)",
      destinataire: "le destinataire du formulaire de contact (Réglages des courriels)",
    },
    envoyes: "Envoyés ce mois-ci",
    surInclus: (inclus: number) => `sur ${nombre(inclus)} inclus chez Cloudflare`,
    echecs: "Échecs ce mois-ci",
    echecsDetail: (n: number, plafonnes: number) =>
      n + plafonnes === 0 ? "aucun, tout est parti" : `${nombre(n)} refusé${n > 1 ? "s" : ""}, ${nombre(plafonnes)} bloqué${plafonnes > 1 ? "s" : ""} : à relire dans le Journal`,
    dernier: "Dernier envoi",
    branchement: "Branchement",
    branchementPret: "Prêt",
    branchementIncomplet: "Incomplet",
    branchementDetail: (liaison: boolean): string => (liaison ? "Service d'envoi relié" : "Service d'envoi pas encore relié"),
    jauge: (envoyes: number, inclus: number) => `Forfait du mois : ${nombre(envoyes)} envoi${envoyes > 1 ? "s" : ""} sur ${nombre(inclus)} inclus`,
    pourcent: (p: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(p)} %`,
    cycle: (fin: string) =>
      `Le compteur repart à zéro le ${fin}. 3 000 envois par mois sont compris dans votre abonnement d'hébergement (partagés entre vos sites s'il y en a plusieurs) ; au-delà, chaque millier d'envois coûte environ 0,35 dollar américain (tarif lu le 16 septembre 2026).`,
    depasse: (auDela: number, dollars: string) => `Ce site a dépassé de ${nombre(auDela)} les envois compris : environ ${dollars} dollars américains de plus ce mois-ci s'il est seul sur l'abonnement.`,
    plafonnesTitre: "Des envois ont été bloqués par vos plafonds",
    plafonnes: (n: number) => `${nombre(n)} envoi${n > 1 ? "s" : ""} bloqué${n > 1 ? "s" : ""} ce mois-ci. Rien n'est perdu : chaque message est gardé dans le Journal, avec un bouton « Renvoyer ». Si c'était un vrai visiteur, relevez le plafond dans Réglages des courriels.`,
    derniers: "Derniers envois",
    vide: "Aucun courriel envoyé pour l'instant. Le premier message du formulaire de contact apparaîtra ici.",
    carte: (quand: string, etat: string) => `Dernier envoi : ${quand}. ${etat}.`,
    echecsTitre: (n: number) => (n > 1 ? `${nombre(n)} courriels ne sont pas partis` : "Un courriel n'est pas parti"),
    echecCommande:
      "Le courriel d'une commande n'est pas parti : votre client n'a peut-être pas reçu sa confirmation. Ouvrez « Journal des courriels », lisez la raison en face de l'envoi, corrigez ce qu'elle dit, puis cliquez « Renvoyer ce courriel ».",
    echecAutre: "Ouvrez « Journal des courriels » : la raison est écrite en face de chaque envoi, avec ce qu'il faut faire, et un bouton « Renvoyer ce courriel ».",
  },

  colonnes: { quand: "Quand", formulaire: "Formulaire", destinataire: "Destinataire", sujet: "Sujet", etat: "État", motif: "Pourquoi" },

  journal: {
    intro: "Tous les envois, du plus récent au plus ancien. Les adresses sont masquées. Choisissez un envoi dans la liste « Voir un envoi » pour lire le détail, comprendre une erreur et le renvoyer.",
    filtreEtat: "État",
    filtreFormulaire: "Formulaire",
    tous: "Tous",
    plus: "Afficher 25 envois de plus",
    vide: "Aucun envoi ne correspond à ce filtre.",
    voir: "Voir un envoi",
    choisir: "Choisissez un envoi",
    detail: "Détail de l'envoi",
    fournisseur: (qui: string) => `Passé par ${qui}.`,
    identifiant: (numero: string) => `Numéro chez Cloudflare, à donner à leur assistance si besoin : ${numero}`,
    renvoiDe: (quand: string) => `Renvoi d'un envoi du ${quand}.`,
    quoiFaire: "Ce qu'il faut faire",
    contenu: "Contenu du courriel",
    renvoyer: "Renvoyer ce courriel",
    confirmerTitre: "Renvoyer ce courriel ?",
    confirmer: (vers: string) => `Le même courriel repart vers ${vers}. Le renvoi compte dans vos plafonds et dans le forfait du mois.`,
    oui: "Renvoyer",
    non: "Annuler",
    renvoye: "Le courriel est reparti.",
    renvoiEchec: "Le renvoi n'est pas parti : le détail dit pourquoi.",
    introuvable: "Cet envoi n'existe plus dans le journal (il est gardé un peu plus d'un an).",
    sansContenu: "Ce courriel n'a pas de contenu gardé : il ne peut pas être renvoyé.",
  },

  brancher: {
    intro: "Quatre étapes, à faire une seule fois. Chacune dit si elle est faite. Les étapes 2 et 3 reviennent à la personne qui a installé le site : si ce n'est pas vous, transmettez-lui cette page, tout ce qu'elle doit faire y est écrit.",
    fait: "Fait",
    domaineExemple: "votre-domaine.fr",
    aFaire: "À faire",
    etape1: "Étape 1 : l'adresse d'expédition",
    etape1Ok: (adresse: string, domaine: string) => `Vos courriels partent de ${adresse}. Le domaine d'envoi est donc ${domaine}.`,
    etape1Ko: "Aucune adresse d'expédition n'est réglée. Ouvrez « Réglages des courriels » et saisissez une adresse sur votre propre domaine (par exemple contact@votre-domaine.fr). Ce domaine doit être géré par Cloudflare.",
    etape2: "Étape 2 : le domaine inscrit chez Cloudflare",
    etape2Texte: (domaine: string) =>
      `Cloudflare n'envoie que depuis un nom de domaine qu'il connaît. ${domaine} s'inscrit une fois ; Cloudflare pose alors lui-même les quatre réglages techniques du tableau ci-dessous, et leur état est relu ici.`,
    etape2Consigne: "Tableau de bord Cloudflare, compte en offre Workers Paid : Compute, Email Service, Email Sending, puis « Onboard Domain ». Ou, dans un terminal :",
    dnsTitre: "Enregistrements DNS attendus",
    dnsColonnes: { type: "Type", nom: "Nom", attendu: "Valeur attendue", lu: "Relevé", etat: "État" },
    dnsEtats: { ok: "Bon", absent: "Absent", faux: "Différent", double: "En double", injoignable: "Non vérifié" } satisfies Record<EtatDns, string>,
    dnsNoms: { mx: "Retour des rebonds", spf: "SPF (autorise Cloudflare à envoyer)", dkim: "DKIM (signature des courriels)", dmarc: "DMARC (un seul par domaine)" } satisfies Record<CleDns, string>,
    dnsOk: "Les quatre enregistrements sont en place.",
    dnsKo: "Un ou plusieurs enregistrements manquent ou diffèrent. Juste après l'inscription, comptez 5 à 15 minutes, puis cliquez « Vérifier à nouveau ».",
    dnsDouble: "Attention : un nom porte deux enregistrements SPF ou le domaine porte deux DMARC. Supprimez le doublon dans Cloudflare, DNS, Records : deux enregistrements se contredisent et les messageries retiennent le pire.",
    dnsInjoignable: "La vérification n'a pas pu joindre le service DNS de Cloudflare. Réessayez dans un instant.",
    dnsVerifie: (heure: string) => `Vérifié par une requête DNS sur HTTPS à cloudflare-dns.com, le ${heure}.`,
    dnsSansDomaine: "Réglez d'abord l'adresse d'expédition (étape 1) : c'est son domaine qu'on vérifie.",
    verifier: "Vérifier à nouveau",
    etape3: "Étape 3 : le site relié au service d'envoi",
    etape3Ok: "Le site est relié au service d'envoi de Cloudflare : il peut lui confier ses courriels.",
    etape3Ko: "Le site n'est pas encore relié au service d'envoi de Cloudflare. C'est une ligne à ajouter par la personne qui a installé le site, puis une mise en ligne : transmettez-lui cette page. D'ici là, le formulaire de contact reste tel qu'il était et n'envoie rien.",
    installateur: "Pour la personne qui a installé le site",
    etape3Ligne: (nom: string, fichier: string) => `Liaison ${nom}, à ajouter dans ${fichier} :`,
    etape3Deployer: "Puis, depuis le dossier du site :",
    livreurOk: "Tous les courriels du site partent par ce chemin, ceux du back office compris.",
    livreurAutre: (qui: string) => `Les courriels du site sont confiés à ${qui}, pas à Cloudflare : ils ne partent pas vraiment. Cliquez ci-dessous pour les confier à Courriels.`,
    livreurAucun: "Aucun fournisseur de courriels n'est choisi : rien ne peut partir. Cliquez ci-dessous pour confier les courriels à Courriels.",
    livreurPourquoi:
      "Pourquoi ce choix : en ligne, Courriels est le seul fournisseur et se choisit tout seul. Sur l'ordinateur de la personne qui a installé le site, EmDash ajoute une console d'essai qui écrit les courriels dans son journal sans les envoyer : c'est entre les deux qu'il faut choisir, une seule fois.",
    choisir: "Confier les courriels à Courriels",
    choisiOk: "C'est fait : Courriels livre désormais tous les courriels du site.",
    choisiKo: "Le choix n'a pas pu être enregistré. Rechargez la page et réessayez.",
    console: "la console de développement",
    etape4: "Étape 4 : l'essai",
    etape4Texte: (vers: string) =>
      `Un courriel d'essai part vers ${vers}, l'adresse de votre compte. Il prend le même chemin que le formulaire de contact et s'inscrit au journal.`,
    etape4SansAdresse: "Votre compte n'a pas d'adresse : l'essai n'a personne à qui écrire.",
    essai: "M'envoyer un courriel d'essai",
    essaiOk: (vers: string) => `Le courriel d'essai est parti vers ${vers}. Regardez votre boîte de réception (et les indésirables, la première fois).`,
    essaiKo: "Le courriel d'essai n'est pas parti.",
  },

  reglages: {
    intro: "Ce que vous réglez ici s'applique tout de suite au formulaire de contact du site, sans rien republier. Chaque champ dit ce qu'il change.",
    expediteur: "Adresse d'expédition : celle que voient les personnes qui reçoivent vos courriels. Elle doit être sur votre propre domaine (exemple : contact@votre-domaine.fr).",
    nom: "Nom affiché à côté de l'adresse (le nom de votre société, par exemple)",
    reponse: "Adresse de réponse, facultative : là où arrive une réponse à un accusé de réception. Vide : l'adresse d'expédition.",
    destinataire: {
      contact: "Qui reçoit les messages du formulaire de contact (jusqu'à trois adresses, séparées par des virgules)",
      lettre: "Qui est prévenu d'une inscription à la lettre d'information",
      commande: "Qui est prévenu d'une nouvelle commande",
    } satisfies Record<"contact" | "lettre" | "commande", string>,
    accuse: "Envoyer un accusé de réception au visiteur",
    accuseAide: "Un court courriel de confirmation part vers la personne qui vous a écrit, dans sa langue. Il ne recopie pas son message : un robot ne peut pas s'en servir pour écrire à quelqu'un d'autre en votre nom.",
    accuseSujet: { fr: "Sujet de l'accusé en français", en: "Sujet de l'accusé en anglais" },
    accuseTexte: {
      fr: "Texte de l'accusé en français ({nom} devient le nom du visiteur, {site} votre nom affiché)",
      en: "Texte de l'accusé en anglais ({nom} devient le nom du visiteur, {site} votre nom affiché)",
    },
    heure: "Envois au plus par heure, tous formulaires confondus (0 : sans limite)",
    jour: "Envois au plus par jour (0 : sans limite)",
    parDestinataire: "Envois au plus vers une même adresse par jour : empêche un robot de noyer quelqu'un d'accusés de réception (0 : sans limite)",
    mois: "Envois au plus par mois : 3 000 sont compris dans l'hébergement, au-delà ils sont facturés (0 : sans limite)",
    cycle: "Jour du mois où le compteur repart à zéro : celui de votre facture Cloudflare (de 1 à 28)",
    enregistrer: "Enregistrer les réglages",
    annuler: "Annuler les modifications",
    enregistre: "Réglages enregistrés : ils s'appliquent dès maintenant.",
    refuse: "Rien n'a été enregistré. Corrigez ce qui suit, puis enregistrez à nouveau :",
    refuseBref: "Rien n'a été enregistré : le bandeau rouge dit quoi corriger.",
    erreurs: {
      expediteur: "l'adresse d'expédition n'est pas une adresse valable (exemple : contact@votre-domaine.fr)",
      messagerie:
        "l'adresse d'expédition est chez une messagerie (Gmail, Orange, Outlook...) : un site ne peut pas envoyer en son nom. Choisissez une adresse de votre domaine, par exemple contact@votre-domaine.fr (celle qui finit comme l'adresse de votre site).",
      reponse: "l'adresse de réponse n'est pas une adresse valable",
      adresse: (formulaire: string) => `une adresse de « ${formulaire} » n'est pas valable`,
      trop: (formulaire: string) => `« ${formulaire} » a plus de trois adresses`,
      plafonds: "un plafond n'est pas un nombre entier entre 0 et 100 000",
      cycle: "le jour du cycle doit être un nombre entre 1 et 28",
    },
    apercu: "Aperçu de l'accusé de réception (ce que lira un visiteur nommé Camille)",
    apercuVisiteur: "Camille",
    derniere: (quand: string, qui: string) => `Dernière modification le ${quand} par ${qui}.`,
  },

  erreurs: {
    SANS_LIAISON: "Le site n'est pas encore relié au service d'envoi de Cloudflare. Ouvrez « Brancher les courriels » et suivez l'étape 3.",
    SANS_EXPEDITEUR: "Aucune adresse d'expédition n'est réglée. Renseignez-la dans « Réglages des courriels ».",
    SANS_DESTINATAIRE: "Ce formulaire n'a pas de destinataire. Renseignez-le dans « Réglages des courriels ».",
    SANS_FOURNISSEUR: "Aucun fournisseur de courriels n'est choisi. Ouvrez « Brancher les courriels », étape 3, cliquez « Confier les courriels à Courriels », puis renvoyez.",
    CANAL: "Le courriel a été arrêté avant de partir. Renvoyez-le ; si cela se répète, ouvrez « Brancher les courriels ».",
    E_SENDER_NOT_VERIFIED: "Le domaine de l'adresse d'expédition n'est pas encore vérifié par Cloudflare. Ouvrez « Brancher les courriels » : un enregistrement DNS manque, ou il n'est pas encore propagé (comptez 5 à 15 minutes). Puis renvoyez.",
    E_SENDER_DOMAIN_NOT_AVAILABLE: "Le domaine d'expédition n'est pas inscrit à Cloudflare Email Sending. Suivez l'étape 2 de « Brancher les courriels », puis renvoyez.",
    E_RECIPIENT_NOT_ALLOWED: "Le service d'envoi du site n'accepte que certaines adresses, et celle-ci n'en fait pas partie. Transmettez ce message à la personne qui a installé le site, puis renvoyez.",
    E_RECIPIENT_SUPPRESSED: "Cette adresse est sur la liste de blocage de Cloudflare (un courriel précédent est revenu ou a été signalé). Vérifiez l'adresse ; pour la débloquer : tableau de bord Cloudflare, Email Service, Suppressions.",
    E_RATE_LIMIT_EXCEEDED: "Cloudflare demande de ralentir. Attendez une minute, puis renvoyez.",
    E_DAILY_LIMIT_EXCEEDED: "Le quota quotidien du compte Cloudflare est atteint (un compte neuf démarre bas, puis monte seul). Renvoyez demain, ou demandez une hausse à Cloudflare.",
    E_DELIVERY_FAILED: "Le serveur du destinataire a refusé le courriel. Vérifiez l'adresse, puis renvoyez.",
    E_VALIDATION_ERROR: "Cloudflare trouve le courriel mal formé : une adresse n'est sans doute pas valable. Vérifiez les adresses dans « Réglages des courriels ».",
    E_FIELD_MISSING: "Il manque un destinataire, un expéditeur ou un sujet. Vérifiez « Réglages des courriels ».",
    E_CONTENT_TOO_LARGE: "Le courriel dépasse la taille permise par Cloudflare (5 Mo).",
    E_INTERNAL_SERVER_ERROR: "Cloudflare est momentanément indisponible. Renvoyez dans quelques minutes.",
    plafond: (quel: Plafond, limite: number) => {
      const fenetre = { heure: "de l'heure", jour: "du jour", destinataire: "par destinataire", mois: "du mois" }[quel];
      return `Plafond ${fenetre} atteint (${nombre(limite)} envoi${limite > 1 ? "s" : ""}). Le message est gardé ici : renvoyez-le plus tard, ou relevez le plafond dans « Réglages des courriels ».`;
    },
    inconnue: (code: string, detail: string) => `Cloudflare a refusé l'envoi (${code}${detail ? ` : ${detail}` : ""}). Renvoyez plus tard ; si cela se répète, ouvrez « Brancher les courriels ».`,
  },

  visiteur: {
    envoye: "Merci, votre message est bien parti. Nous vous répondons au plus vite.",
    garde: "Votre message n'a pas pu partir tout de suite. Il est conservé de notre côté et nous le lirons dès que possible ; vous pouvez aussi nous écrire directement.",
    invalide: "Il manque une information : vérifiez votre nom, votre adresse et votre message, puis envoyez à nouveau.",
  },

  courriels: {
    notificationSujet: (sujet: string) => `Nouveau message du site : ${sujet}`,
    notification: (c: { site: string; nom: string; adresse: string; sujet: string; message: string }) =>
      `Nouveau message reçu par le formulaire de contact de ${c.site}.\n\nNom : ${c.nom}\nAdresse : ${c.adresse}\nSujet : ${c.sujet}\n\n${c.message}\n\nPour répondre, répondez simplement à ce courriel : la réponse part vers ${c.adresse}.`,
    sansSujet: "(sans sujet)",
    essaiSujet: (site: string) => `Courriel d'essai de ${site}`,
    essai: (site: string, quand: string) =>
      `Si vous lisez ceci, les courriels de ${site} partent bien par Cloudflare.\n\nEnvoyé depuis le back office le ${quand}. Cet essai est inscrit au journal des courriels.`,
  },
};

export type Textes = typeof FR;
