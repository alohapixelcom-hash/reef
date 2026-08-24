// src/i18n/ui/fr/pages.ts - dictionnaire francais, tranche "pages" : la copie propre a chaque page du site.
//
// Ce n'est pas une traduction mot a mot de l'anglais : c'est la meme intention,
// ecrite comme un francophone l'ecrirait. Un theme de blog dont la copie sent
// la traduction automatique se disqualifie en trois lignes, puisque tout ce
// qu'il vend est justement la qualite de la lecture.

import type { Dictionary } from "../types";

export const frPages: Pick<
  Dictionary,
  "home" | "about" | "contact" | "topics" | "authors" | "search" | "notFound" | "legal"
> = {
  // --- Accueil -------------------------------------------------------------
  home: {
    metaTitle: "Reef Notes, le carnet de bord d'un studio web indépendant",
    metaDescription:
      "Journaux de chantier, temps de chargement, typographie et gestion d'un petit studio web. En français et en anglais, quelques notes par mois, écrites par les deux personnes qui font le travail.",
    eyebrow: "Reef Notes",
    heroTitle: "Notes d'un petit studio web",
    heroAccent: "petit",
    heroLede:
      "Ce qu'on apprend en construisant des sites, noté au fur et à mesure. Le carnet, pas le portfolio.",
    heroPrimary: "Commencer à lire",
    heroSecondary: "À propos du studio",
    heroRecent: "Dernières notes",
    heroLedger: ["notes publiées", "fils", "langues"],
    featuredEyebrow: "La note du mois",
    featuredLabel: "À la une",
    latestTitle: "Dernières notes",
    latestAccent: "Dernières",
    latestLede: "Les entrées les plus récentes, de la plus fraîche à la plus ancienne. Le reste attend dans les archives.",
    latestCta: "Voir tous les articles",
    topicsTitle: "Cinq fils que nous tirons sans cesse",
    topicsAccent: "fils",
    topicsLede:
      "Chaque article appartient à un seul sujet : un fil se lit donc d'un bout à l'autre, sans traverser tout le reste.",
    topicsCta: "Voir tous les sujets",
    authorsTitle: "Qui écrit ici",
    authorsAccent: "écrit",
    authorsLede:
      "Ici, tout le monde livre encore des projets clients. Chaque signature mène à tout ce que son auteur a publié, première note comprise.",
    authorsCta: "Voir les auteurs",
    aboutTitle: "Le studio derrière les notes",
    aboutAccent: "studio",
    aboutLede:
      "L'un construit, l'autre dessine, les deux écrivent. Trois ou quatre projets par an, et tout ce qu'ils nous apprennent finit ici.",
    aboutCta: "Notre façon de travailler",
  },

  // --- A propos ------------------------------------------------------------
  about: {
    metaTitle: "À propos du studio",
    metaDescription:
      "Qui tient Reef Notes, comment le studio travaille, ce que nous acceptons et ce que nous refusons, et pourquoi les notes de chantier sont publiées plutôt que classées.",
    eyebrow: "À propos",
    title: "Un studio à deux qui note tout",
    accent: "note",
    lede:
      "Nous dessinons et construisons des sites pour de petites équipes. Reef Notes est l'endroit où atterrissent les notes de travail, parce que la partie utile d'un projet n'est presque jamais la capture d'écran.",
    storyTitle: "Comment le carnet a commencé",
    storyAccent: "carnet",
    storyParagraphs: [
      "Le studio a ouvert en 2019 avec un portable et un tableur de prospects. La première année nous a appris qu'un site est rarement un problème de design : c'est un problème de décisions, avec un design posé par-dessus. Quelle police charge en premier, quelle section saute, ce qui se passe sur un Android de quatre ans connecté au wifi d'un hôtel.",
      "Pendant trois ans, les réponses sont restées dans un dépôt privé. Chaque fois qu'un client demandait pourquoi une page semblait lente, ou pourquoi nous refusions une cinquième police, le raisonnement était déjà écrit quelque part. Publier ces notes ne nous a rien coûté et nous a évité la même explication deux fois par mois.",
      "Reef Notes, c'est ce dépôt remis au propre. Certaines entrées sont des journaux de chantier avec des chiffres dedans, d'autres des prises de position sur la typographie, d'autres encore la moitié ingrate du métier : cadrer, chiffrer, être payé à l'heure. Toutes sortent de travaux réels.",
    ],
    valuesTitle: "Notre façon de travailler",
    valuesAccent: "façon",
    valuesLede: "Trois règles auxquelles nous n'avons pas encore trouvé de bonne raison de déroger.",
    values: [
      {
        title: "Mesurer avant de discuter",
        text: "Le goût ne tranche rien en matière de performance. Nous publions les chiffres avant et après, y compris les fois où le changement a tout empiré.",
      },
      {
        title: "Livrer la version ennuyeuse",
        text: "La version ennuyeuse sort dans les temps, survit à une refonte et fonctionne encore sans JavaScript. L'astuce vient ensuite, une fois la version ennuyeuse en ligne.",
      },
      {
        title: "L'écrire une seule fois",
        text: "Si une réponse demande plus de cinq minutes d'explication, elle devient un article. Le client reçoit le lien, nous récupérons notre après-midi.",
      },
    ],
    writersTitle: "Nous deux",
    writersAccent: "deux",
    writersLede: "Deux biographies courtes, des intitulés honnêtes, et tous les articles que chacun a signés.",
    writersCta: "Tous les auteurs",
    contactTitle: "Travailler ensemble",
    contactLede:
      "Nous prenons trois ou quatre projets par an, surtout des refontes pour des équipes de moins de vingt personnes. Si le calendrier s'y prête, dites-nous ce qui vous bloque.",
    contactCta: "Nous écrire",
  },

  // --- Contact -------------------------------------------------------------
  contact: {
    metaTitle: "Contact",
    metaDescription:
      "Une demande de projet, une correction sur un article, une question sur ce que nous avons publié. Une seule boîte, lue par une personne, réponse sous deux jours ouvrés.",
    eyebrow: "Contact",
    title: "Écrivez-nous, nous lisons tout",
    accent: "tout",
    lede:
      "Un projet, une correction, une question sur un chantier : tout arrive dans la même boîte et une personne y répond. Pas de numéro de ticket, pas de réponse automatique.",
    formTitle: "Envoyer un message",
    nameLabel: "Votre nom",
    namePlaceholder: "Ada Lovelace",
    emailLabel: "Email",
    emailPlaceholder: "vous@example.com",
    subjectLabel: "Objet",
    subjectPlaceholder: "Une ligne suffit",
    messageLabel: "Message",
    messagePlaceholder: "Sur quoi travaillez-vous, et qu'est-ce qui vous bloque ?",
    submit: "Envoyer le message",
    formNote:
      "Aucune inscription à la newsletter cachée dans ce formulaire. Votre adresse sert à vous répondre, et à rien d'autre.",
    success: "Message envoyé. Vous aurez une réponse sous deux jours ouvrés.",
    error: "L'envoi n'a pas abouti. Écrivez-nous directement, nous le reprendrons là-bas.",
    directTitle: "Ou passez-vous du formulaire",
    directLede: "Un simple email fait aussi bien l'affaire, et un fil de discussion se conserve mieux qu'un formulaire.",
    directCta: "Écrire au studio",
    nextTitle: "Ce qui se passe ensuite",
    nextSteps: [
      "Une réponse courte sous deux jours ouvrés, écrite par l'un de nous deux.",
      "S'il s'agit d'un projet, vous recevez trois questions avant le moindre chiffre.",
      "S'il s'agit d'une correction, l'article est repris et crédité dans la semaine.",
    ],
  },

  // --- Sujets --------------------------------------------------------------
  topics: {
    metaTitle: "Sujets",
    metaDescription:
      "Tous les sujets couverts par Reef Notes : artisanat du front-end, performance, typographie et gestion d'un petit studio.",
    eyebrow: "Sujets",
    title: "Cinq fils que nous tirons sans cesse",
    accent: "fils",
    lede:
      "Chaque article appartient à un seul sujet. Choisissez un fil et lisez-le d'un bout à l'autre, du plus ancien au plus récent si vous voulez l'argument dans l'ordre.",
    countLabel: "{count} articles",
    countOne: "1 article",
    readTopic: "Lire ce sujet",
    allTopics: "Tous les sujets",
    emptyTitle: "Rien de classé ici pour l'instant",
    emptyLede: "Le sujet est ouvert et le premier article est encore un brouillon. Le flux RSS préviendra quand il sortira.",
  },

  // --- Auteurs -------------------------------------------------------------
  authors: {
    metaTitle: "Auteurs",
    metaDescription:
      "Les personnes qui écrivent Reef Notes : ce qu'elles font au quotidien, où les retrouver ailleurs, et tout ce qu'elles ont publié ici.",
    eyebrow: "Auteurs",
    title: "Qui écrit ici",
    accent: "écrit",
    lede:
      "Deux personnes partagent ce carnet. Chaque article porte une signature, et chaque signature mène à tout ce que son auteur a écrit.",
    roleLabel: "Rôle",
    linksLabel: "Ailleurs",
    postsBy: "Articles de {name}",
    readAll: "Lire tout ce qu'a écrit {name}",
    countLabel: "{count} articles",
    countOne: "1 article",
    emptyTitle: "Aucun article sous cette signature",
    emptyLede: "Une page d'auteur vide veut dire qu'un premier brouillon est ouvert quelque part. Cela arrive.",
  },

  // --- Recherche -----------------------------------------------------------
  search: {
    metaTitle: "Recherche",
    metaDescription:
      "Cherchez dans tous les articles de Reef Notes par titre, résumé, sujet ou étiquette. La recherche tourne dans votre navigateur : rien n'est envoyé à un serveur, rien n'est enregistré.",
    eyebrow: "Recherche",
    title: "Retrouver un article",
    accent: "Retrouver",
    lede:
      "La recherche couvre les titres, les résumés, les sujets et les étiquettes. Elle tourne dans votre navigateur : rien ne quitte la page, et elle fonctionne encore hors ligne une fois chargée.",
    placeholder: "Chercher un article, un sujet, une étiquette",
    label: "Rechercher dans le blog",
    shortcut: "Appuyez sur / pour chercher",
    clear: "Effacer la recherche",
    prompt: "Commencez à taper pour chercher parmi {count} articles.",
    resultsLabel: "Résultats de recherche",
    countLabel: "{count} résultats",
    countOne: "1 résultat",
    inTopic: "dans {topic}",
    noResultsTitle: "Rien ne correspond à {query}",
    noResultsLede: "Essayez un mot plus court, ou prenez le chemin long et parcourez les sujets.",
    noResultsCta: "Parcourir les sujets",
  },

  // --- 404 -----------------------------------------------------------------
  notFound: {
    metaTitle: "Page introuvable",
    metaDescription: "Il n'y a rien à cette adresse. Les archives et la recherche fonctionnent toujours.",
    code: "404",
    title: "Rien à cette adresse",
    accent: "Rien",
    lede:
      "Le lien est faux, ou l'article a déménagé sans que nous ayons laissé de redirection. Ni l'un ni l'autre n'est votre problème. Deux chemins de retour, ci-dessous.",
    homeCta: "Retour à l'accueil",
    postsCta: "Voir tous les articles",
    searchCta: "Rechercher dans le blog",
  },

  // --- Mentions legales ----------------------------------------------------
  // Les passages entre crochets sont a completer par l'acheteur. Ce texte ne
  // vaut pas un avis juridique, et sa version anglaise pas davantage : les deux
  // disent la meme chose, aucune ne fait foi sur l'autre.
  legal: {
    eyebrow: "Légal",
    title: "Mentions légales",
    description: "Qui publie ce site, qui l'héberge, et comment joindre l'éditeur.",
    lastUpdated: "Mise à jour le {date}",
    toc: "Sur cette page",
    backToTop: "Revenir en haut",
    sections: [
      {
        title: "Éditeur",
        body: "Ce site est édité par [nom du studio], [forme juridique] immatriculée à [adresse complète] sous le numéro [numéro d'immatriculation]. Directeur de la publication : [nom]. Toute question sur les contenus publiés ici peut nous être adressée depuis la page de contact.",
      },
      {
        title: "Hébergement",
        body: "Le site est un ensemble de fichiers statiques servis par [nom de l'hébergeur], [adresse de l'hébergeur], joignable au [contact de l'hébergeur]. Il n'y a ni base de données, ni session serveur, ni compte : rien n'est conservé de notre côté lorsque vous lisez une page.",
      },
      {
        title: "Contenus et réutilisation",
        body: "Les articles, les illustrations et les extraits de code publiés ici appartiennent à leurs auteurs. Citer un passage avec un lien de retour est bienvenu et ne demande aucune autorisation. Republier un article entier, traduit ou non, en demande une.",
      },
      {
        title: "Signaler un problème",
        body: "Une erreur factuelle, un lien mort, une question de droits : écrivez à l'adresse indiquée sur la page de contact. Les corrections sont faites sous deux jours ouvrés, et l'article porte alors la date de sa révision.",
      },
    ],
  },
};
