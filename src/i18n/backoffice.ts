// src/i18n/backoffice.ts - copie bilingue du back office Aloha adapte a Reef.
const en = {
  space: "Editorial workspace", articles: "Articles", back: "View website", logout: "Sign out", email: "Email",
  title: "Title", description: "Description", date: "Publication date", author: "Author", topic: "Topic", tags: "Tags (comma separated)",
  cover: "Cover image", coverAlt: "Image description", body: "Article (Markdown)", draft: "Draft", featured: "Featured article",
  slug: "Article address", newArticle: "New article", save: "Save changes", preview: "Reading preview", loading: "Loading articles…",
  saved: "Saved to GitHub. The website build is pending; publication is not confirmed yet.", saving: "Saving…",
  failed: "The request failed. Your text remains in the form. Try again.", conflict: "This article changed since you opened it. Copy your text before reloading the latest version.",
  invalid: "Check these fields: ", discard: "Discard your unsaved changes?", empty: "No articles yet.", select: "Select an article or create a draft.",
  signIn: "Sign in", sendCode: "Send a sign-in code", code: "Six-digit code", verify: "Continue", codeSent: "If this email is authorised, a code has been sent.",
  loginHelp: "Use the administrator email configured for this website.", loginFailed: "Sign-in failed. Check your code or try again later.",
  unavailable: "Sign-in is not configured or is temporarily unavailable.", contentLanguage: "Content language", noCover: "No cover image",
  published: "The website now serves this version of the article.", draftBuilt: "The website build includes this draft. It remains excluded from article lists.",
  publicationPending: "Saved. Publication is still unconfirmed. You can check again without saving a second time.", checkPublication: "Check publication",
};
type Copy = { [K in keyof typeof en]: string };
const fr: Copy = {
  space: "Espace éditorial", articles: "Articles", back: "Voir le site", logout: "Se déconnecter", email: "Adresse e-mail",
  title: "Titre", description: "Description", date: "Date de publication", author: "Auteur", topic: "Rubrique", tags: "Étiquettes (séparées par des virgules)",
  cover: "Image de couverture", coverAlt: "Description de l’image", body: "Article (Markdown)", draft: "Brouillon", featured: "Article à la une",
  slug: "Adresse de l’article", newArticle: "Nouvel article", save: "Enregistrer", preview: "Aperçu de lecture", loading: "Chargement des articles…",
  saved: "Enregistré sur GitHub. La construction du site est en attente ; la publication n’est pas encore confirmée.", saving: "Enregistrement…",
  failed: "La demande a échoué. Votre texte reste dans le formulaire. Réessayez.", conflict: "Cet article a changé depuis son ouverture. Copiez votre texte avant de recharger sa dernière version.",
  invalid: "Vérifiez ces champs : ", discard: "Abandonner vos modifications non enregistrées ?", empty: "Aucun article pour le moment.", select: "Sélectionnez un article ou créez un brouillon.",
  signIn: "Connexion", sendCode: "Recevoir un code de connexion", code: "Code à six chiffres", verify: "Continuer", codeSent: "Si cette adresse est autorisée, un code vient d’être envoyé.",
  loginHelp: "Utilisez l’adresse administrateur configurée pour ce site.", loginFailed: "La connexion a échoué. Vérifiez le code ou réessayez plus tard.",
  unavailable: "La connexion n’est pas configurée ou est momentanément indisponible.", contentLanguage: "Langue des articles", noCover: "Sans image de couverture",
  published: "Le site sert maintenant cette version de l’article.", draftBuilt: "La construction du site inclut ce brouillon. Il reste exclu des listes d’articles.",
  publicationPending: "Enregistré. La publication reste à confirmer. Vous pouvez revérifier sans enregistrer une seconde fois.", checkPublication: "Vérifier la publication",
};
export const backofficeCopy = { en, fr };
