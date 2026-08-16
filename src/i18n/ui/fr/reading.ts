// src/i18n/ui/fr/reading.ts - dictionnaire francais, tranche "reading" : tout ce qui entoure la lecture d'un article.
//
// Ces libelles bordent le texte a chaque visite : ce sont les plus lus du site
// et les premiers a trahir une traduction faite a la va-vite. "Publie le",
// "Mis a jour le" et "Ecrit par" se lisent tels quels sous un titre, sans
// preposition rapportee et sans majuscule parasite.

import type { Dictionary } from "../types";

export const frReading: Pick<Dictionary, "post" | "archive" | "newsletter"> = {
  // --- Page d'article ------------------------------------------------------
  post: {
    minRead: "{n} min de lecture",
    minReadOne: "1 min de lecture",
    published: "Publié le",
    updated: "Mis à jour le",
    updatedNote: "Revu après publication.",
    writtenBy: "Écrit par",
    toc: "Sur cette page",
    tocLabel: "Sommaire",
    topicLabel: "Sujet",
    tagsLabel: "Étiquettes",
    share: "Partager",
    shareOn: "Partager sur {network}",
    networkEmail: "Email",
    networkX: "X",
    copyLink: "Copier le lien",
    linkCopied: "Lien copié",
    previousPost: "Article précédent",
    nextPost: "Article suivant",
    navLabel: "Navigation entre les articles",
    keepReading: "Lecture suivante",
    keepReadingAccent: "suivante",
    keepReadingLede: "Trois autres notes du même carnet, choisies par sujet et non par un algorithme.",
    keepReadingCta: "Tous les articles",
    aboutAuthor: "À propos de l'auteur",
    moreFromAuthor: "Autres articles de {name}",
    backToPosts: "Retour aux articles",
    coverCredit: "Couverture : {credit}",
    draft: "Brouillon",
    draftNote:
      "Cet article n'est pas publié. Il se construit en local pour la relecture et reste hors des listes, du flux RSS, du plan du site et de la recherche.",
  },

  // --- Archives et listes --------------------------------------------------
  archive: {
    metaTitle: "Tous les articles",
    metaDescription:
      "Tous les articles publiés sur Reef Notes, du plus récent au plus ancien : journaux de chantier, performance, typographie et gestion d'un petit studio.",
    eyebrow: "Archives",
    title: "Tout ce que nous avons écrit",
    accent: "Tout",
    lede:
      "Les archives complètes, du plus récent au plus ancien. Trente secondes de défilement valent mieux qu'un champ de recherche quand on ne sait pas encore ce que l'on cherche.",
    pageSuffix: "page {n}",
    listLabel: "Liste des articles",
    paginationLabel: "Pagination des articles",
    topicTitle: "Articles classés dans {topic}",
    authorTitle: "Articles de {name}",
    tagTitle: "Articles étiquetés {tag}",
    countLabel: "{count} articles",
    countOne: "1 article",
    emptyTitle: "Rien ici pour l'instant",
    emptyLede:
      "Aucun article ne correspond à cette page. Les archives se remplissent toutes les deux semaines environ, et le flux RSS vous préviendra.",
    emptyCta: "Retour aux articles",
  },

  // --- Newsletter ----------------------------------------------------------
  newsletter: {
    title: "Un email, une fois par mois",
    accent: "mois",
    lede:
      "Un court résumé de ce que nous avons publié et de ce que nous avons raté. Pas de pixel espion, pas de séquence automatique, un clic pour partir définitivement.",
    emailLabel: "Votre email",
    placeholder: "vous@exemple.com",
    submit: "S'abonner",
    note: "Un email par mois. Désinscription depuis n'importe lequel.",
    success: "Presque fini. Confirmez l'inscription depuis l'email que nous venons d'envoyer.",
    error: "Cette adresse n'est pas passée. Vérifiez-la et réessayez.",
    rssTitle: "Vous préférez un flux ?",
    rssLede: "Tout le blog tient dans le flux RSS, en texte intégral, sans inscription.",
    rssCta: "Flux RSS",
  },
};
