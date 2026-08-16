// src/i18n/ui/en/reading.ts - dictionnaire anglais, tranche "reading" : tout ce qui entoure la lecture d'un article.
//
// C'est la tranche la plus importante du theme. Reef ne vend ni un tunnel de
// conversion ni un tableau de bord : il vend huit minutes de lecture propre.
// Les libelles qui bordent le texte (dates, temps de lecture, sommaire, partage,
// article suivant) sont lus a chaque visite, donc ils meritent d'etre ecrits.
//
// Trois sections : `post` (la page d'article), `archive` (les listes et leurs
// etats vides), `newsletter` (le bloc d'inscription, reutilise ailleurs).

export const enReading = {
  // --- Page d'article ------------------------------------------------------
  post: {
    /** {n} vient du temps de lecture calcule sur le corps du billet. */
    minRead: "{n} min read",
    minReadOne: "1 min read",
    published: "Published on",
    updated: "Updated on",
    /** Affiche a cote de la seconde date : montrer les deux est plus honnete
     *  que de remplacer silencieusement la premiere. */
    updatedNote: "Revised after publication.",
    writtenBy: "Written by",
    toc: "On this page",
    tocLabel: "Table of contents",
    topicLabel: "Topic",
    tagsLabel: "Tags",
    share: "Share",
    shareOn: "Share on {network}",
    /** Les deux seules destinations de partage du theme : une ancre mailto: et
     *  une ancre d'intention. Aucun bouton officiel, donc aucun script tiers et
     *  aucun cookie pose a des lecteurs qui ne partagent rien. */
    networkEmail: "Email",
    networkX: "X",
    copyLink: "Copy link",
    linkCopied: "Link copied",
    previousPost: "Previous post",
    nextPost: "Next post",
    /** Nom accessible du bloc precedent/suivant, en pied d'article : sans lui,
     *  un lecteur d'ecran annonce une navigation de plus sans dire laquelle. */
    navLabel: "Post navigation",
    keepReading: "Keep reading",
    keepReadingAccent: "reading",
    keepReadingLede: "Three more notes from the same notebook, picked by topic and not by an algorithm.",
    keepReadingCta: "All posts",
    aboutAuthor: "About the author",
    moreFromAuthor: "More from {name}",
    backToPosts: "Back to all posts",
    /** Credit optionnel sous l'image de couverture. */
    coverCredit: "Cover: {credit}",
    draft: "Draft",
    draftNote:
      "This post is unpublished. It builds locally for preview and stays out of the lists, the RSS feed, the sitemap and search.",
    /** Libelle du curseur contextuel au survol d'une carte de billet. */
  },

  // --- Archives et listes --------------------------------------------------
  archive: {
    metaTitle: "All posts",
    metaDescription:
      "Every post published on Reef Notes, newest first: build logs, performance work, typography, and the business of a small studio.",
    eyebrow: "Archive",
    title: "Everything we have written",
    accent: "Everything",
    lede:
      "The full archive, newest first. Thirty seconds of scrolling beats a search box when you do not yet know what you are looking for.",
    /** Suffixe de titre des pages 2 et suivantes. */
    pageSuffix: "page {n}",
    /** Libelle accessible de la grille : elle n'a pas de titre visible propre. */
    listLabel: "Post list",
    paginationLabel: "Post pagination",
    topicTitle: "Posts filed under {topic}",
    authorTitle: "Posts by {name}",
    tagTitle: "Posts tagged {tag}",
    countLabel: "{count} posts",
    countOne: "1 post",
    emptyTitle: "Nothing here yet",
    emptyLede:
      "No post matches this page. The archive fills up every couple of weeks, and the RSS feed will tell you when it does.",
    emptyCta: "Back to all posts",
  },

  // --- Newsletter ----------------------------------------------------------
  // Le bloc vit dans le pied de page et en fin d'article. Il n'appelle aucun
  // prestataire : l'acheteur branche le sien sur le formulaire deja ecrit.
  newsletter: {
    title: "One email, once a month",
    accent: "once",
    lede:
      "A short digest of what we published and what we got wrong. No tracking pixel, no drip sequence, one click to leave for good.",
    emailLabel: "Your email",
    placeholder: "you@example.com",
    submit: "Subscribe",
    note: "One email a month. Unsubscribe from any of them.",
    success: "Almost there. Confirm the subscription from the email we just sent.",
    error: "That address did not go through. Check it and try once more.",
    rssTitle: "Prefer a feed?",
    rssLede: "The whole blog is in the RSS feed, full text, no signup.",
    rssCta: "RSS feed",
  },
} as const;
