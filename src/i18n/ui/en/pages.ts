// src/i18n/ui/en/pages.ts - dictionnaire anglais, tranche "pages" : la copie propre a chaque page du site.
//
// Une page est un assemblage de sections, jamais un endroit ou l'on ecrit des
// phrases : les titres de hero, les descriptions meta et les libelles de
// formulaire vivent ici, et les composants n'affichent que ce qu'on leur passe.
//
// Le blog de demonstration s'appelle Reef Notes : le carnet d'un studio web
// independant. Le registre est celui d'un artisan qui montre son etabli, pas
// celui d'une page commerciale. Concret, chiffre quand c'est possible, jamais une
// promesse qu'un billet ne tient pas juste en dessous.

export const enPages = {
  // --- Accueil -------------------------------------------------------------
  home: {
    metaTitle: "Reef Notes, a working notebook from an independent web studio",
    metaDescription:
      "Build logs, load times, typography and the business of running a small web studio. Written in English and French, a few notes a month, by the three people doing the work.",
    eyebrow: "Reef Notes",
    heroTitle: "Notes from a small web studio",
    heroAccent: "small",
    heroLede:
      "What we learn building sites, written down as we go. The notebook, not the portfolio.",
    heroPrimary: "Start reading",
    heroSecondary: "About the studio",
    heroRecent: "Latest notes",
    // Les trois libelles du compteur du hero, dans l'ordre exact ou la page
    // fournit les nombres : notes publiees, sujets, langues servies.
    heroLedger: ["notes published", "threads", "languages"],
    featuredEyebrow: "Pick of the month",
    latestTitle: "Latest notes",
    latestAccent: "Latest",
    latestLede: "The most recent entries, newest first. Everything older waits in the archive.",
    latestCta: "Browse all posts",
    topicsTitle: "Five threads we keep pulling",
    topicsAccent: "threads",
    topicsLede:
      "Every post belongs to exactly one topic, so a thread can be read end to end without wading through the rest.",
    topicsCta: "See all topics",
    authorsTitle: "Who writes here",
    authorsAccent: "writes",
    authorsLede:
      "Everyone here still ships client work. Each byline leads to everything that person has published, oldest note included.",
    authorsCta: "Meet the writers",
    aboutTitle: "The studio behind the notes",
    aboutAccent: "studio",
    aboutLede:
      "One builds, one measures, one designs, and all three write. Three or four projects a year, and everything we learn on them ends up here.",
    aboutCta: "How we work",
  },

  // --- A propos ------------------------------------------------------------
  about: {
    metaTitle: "About the studio",
    metaDescription:
      "Who runs Reef Notes, how the studio works, what we take on and what we turn down, and why the working notes are published instead of filed away.",
    eyebrow: "About",
    title: "A three-person studio that writes things down",
    accent: "writes",
    lede:
      "We design and build websites for small teams. Reef Notes is where the working notes end up, because the useful part of a project is almost never the screenshot.",
    storyTitle: "How the notebook started",
    storyAccent: "notebook",
    storyParagraphs: [
      "The studio opened in 2019 with one laptop and a spreadsheet of leads. The first year taught us that a website is rarely a design problem: it is a decision problem with a design attached. Which font loads first, which section gets cut, what happens on a four-year-old Android phone on hotel wifi.",
      "For three years the answers lived in a private repository. Every time a client asked why a page felt slow, or why we refused to add a fifth typeface, the reasoning was already written down somewhere. Publishing those notes cost us nothing and saved the same explanation twice a month.",
      "Reef Notes is that repository, cleaned up. Some entries are build logs with numbers in them, some are arguments about type, some cover the unglamorous half of freelancing: scoping, quoting, being paid on time. All of them come out of work we actually did.",
    ],
    valuesTitle: "How we work",
    valuesAccent: "work",
    valuesLede: "Three rules we have not yet found a good reason to break.",
    values: [
      {
        title: "Measure before arguing",
        text: "Taste settles nothing about performance. We publish the before and after numbers, including the times a change made things worse.",
      },
      {
        title: "Ship the boring version",
        text: "The boring version launches on time, survives a redesign and still works with JavaScript off. Cleverness is what we add once the boring version is live.",
      },
      {
        title: "Write it down once",
        text: "If an answer takes more than five minutes to explain, it becomes a post. Clients get the link, we get our afternoon back.",
      },
    ],
    writersTitle: "The three of us",
    writersAccent: "three",
    writersLede: "Short bios, honest job titles, and every post each of us has signed.",
    writersCta: "All authors",
    contactTitle: "Working together",
    contactLede:
      "We take on three or four projects a year, mostly redesigns for teams of under twenty people. If the timing lines up, tell us what is in the way.",
    contactCta: "Get in touch",
  },

  // --- Contact -------------------------------------------------------------
  // Le formulaire est complet et non monte : le theme ne choisit pas de
  // prestataire d'envoi a la place de son utilisateur. La copie, elle, est prete.
  contact: {
    metaTitle: "Contact",
    metaDescription:
      "Project enquiries, a correction on a post, or a question about something we published. One inbox, read by a person, answered within two working days.",
    eyebrow: "Contact",
    title: "Write to us, we read all of it",
    accent: "all",
    lede:
      "A project, a correction, a question about a build: it lands in the same inbox and a person answers it. No ticket number, no autoresponder.",
    formTitle: "Send a message",
    nameLabel: "Your name",
    namePlaceholder: "Ada Lovelace",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    subjectLabel: "Subject",
    subjectPlaceholder: "One line is enough",
    messageLabel: "Message",
    messagePlaceholder: "What are you working on, and what is in the way?",
    submit: "Send message",
    formNote: "No newsletter signup hidden in this form. Your address is used to reply, and for nothing else.",
    success: "Message sent. You will hear back within two working days.",
    error: "That did not go through. Email us directly and we will pick it up there.",
    directTitle: "Or skip the form",
    directLede: "Plain email works just as well, and a thread is easier to keep than a form.",
    directCta: "Email the studio",
    nextTitle: "What happens next",
    nextSteps: [
      "A short reply within two working days, written by one of us.",
      "If it is a project, three questions come back before any number does.",
      "If it is a correction, the post is fixed and credited the same week.",
    ],
  },

  // --- Sujets --------------------------------------------------------------
  topics: {
    metaTitle: "Topics",
    metaDescription:
      "Every subject covered on Reef Notes: front-end craft, performance work, typography, and the business of running a small studio.",
    eyebrow: "Topics",
    title: "Five threads we keep pulling",
    accent: "threads",
    lede:
      "Every post belongs to exactly one topic. Pick a thread and read it end to end, oldest first if you want the argument in order.",
    /** {count} vient du nombre d'articles publies dans le sujet. */
    countLabel: "{count} posts",
    countOne: "1 post",
    readTopic: "Read this topic",
    allTopics: "All topics",
    emptyTitle: "Nothing filed here yet",
    emptyLede: "The topic is open and the first post is still a draft. The RSS feed will say when it lands.",
  },

  // --- Auteurs -------------------------------------------------------------
  authors: {
    metaTitle: "Authors",
    metaDescription:
      "The people who write Reef Notes: what they work on day to day, where to find them elsewhere, and everything they have published here.",
    eyebrow: "Authors",
    title: "Who writes here",
    accent: "writes",
    lede:
      "Three people share this notebook. Every post carries a byline, and every byline leads to everything that person has written.",
    roleLabel: "Role",
    linksLabel: "Elsewhere",
    postsBy: "Posts by {name}",
    readAll: "Read everything by {name}",
    countLabel: "{count} posts",
    countOne: "1 post",
    emptyTitle: "No posts under this byline yet",
    emptyLede: "An author page with nothing on it means a first draft is open somewhere. It happens.",
  },

  // --- Recherche -----------------------------------------------------------
  // La recherche tourne dans le navigateur sur un index construit au build :
  // zero requete, zero service tiers, et le theme reste 100% statique.
  search: {
    metaTitle: "Search",
    metaDescription:
      "Search every post on Reef Notes by title, summary, topic or tag. It runs in your browser: nothing is sent to a server and nothing is logged.",
    eyebrow: "Search",
    title: "Find it again",
    accent: "again",
    lede:
      "Search covers titles, summaries, topics and tags. It runs in your browser, so nothing leaves the page and it keeps working offline once loaded.",
    placeholder: "Search posts, topics and tags",
    label: "Search the blog",
    shortcut: "Press / to search",
    clear: "Clear search",
    /** Affiche avant la premiere frappe. {count} est la taille de l'index. */
    prompt: "Start typing to search {count} posts.",
    resultsLabel: "Search results",
    countLabel: "{count} results",
    countOne: "1 result",
    inTopic: "in {topic}",
    noResultsTitle: "Nothing matches {query}",
    noResultsLede: "Try a shorter word, or take the long way round and browse by topic.",
    noResultsCta: "Browse topics",
  },

  // --- 404 -----------------------------------------------------------------
  notFound: {
    metaTitle: "Page not found",
    metaDescription: "There is nothing at this address. The archive and the search box both still work.",
    code: "404",
    title: "Nothing at this address",
    accent: "Nothing",
    lede:
      "The link is wrong, or the post moved and we failed to leave a redirect. Neither is your problem. Two ways back, below.",
    homeCta: "Back to the home page",
    postsCta: "Browse all posts",
    searchCta: "Search the blog",
  },

  // --- Mentions legales ----------------------------------------------------
  // La page /legal/ porte SON propre texte ici, parce qu'elle n'en a pas
  // ailleurs : src/config/legalData.json.ts ne couvre que la confidentialite et
  // les conditions. Les passages entre crochets sont a completer par l'utilisateur,
  // et ce texte ne vaut pas un avis juridique.
  legal: {
    eyebrow: "Legal",
    title: "Legal notice",
    description: "Who publishes this site, who hosts it, and how to reach the publisher.",
    /** {date} est formatee par formatDate() dans la langue de la page. */
    lastUpdated: "Last updated on {date}",
    toc: "On this page",
    backToTop: "Back to top",
    sections: [
      {
        title: "Publisher",
        body: "This site is published by [studio name], [legal form] registered at [full address], under number [registration number]. Publication director: [name]. Any question about the content published here can be sent through the contact page.",
      },
      {
        title: "Hosting",
        body: "The site is a set of static files served by [host name], [host address], reachable at [host contact]. There is no database, no server-side session and no account: nothing is stored on our side when you read a page.",
      },
      {
        title: "Content and reuse",
        body: "The posts, illustrations and code samples published here belong to their authors. Quoting a passage with a link back is welcome and needs no permission. Republishing a whole post, translated or not, does.",
      },
      {
        title: "Reporting a problem",
        body: "A factual error, a broken link, a copyright concern: write to the address on the contact page. Corrections are made within two working days and the post carries the date of its revision.",
      },
    ],
  },
} as const;
