// src/moteur/deployer/site.ts - la phrase de la page "Tout deployer" propre a ce site : ce qu'on publie, et ce que le build refige.
//
// Fichier du SITE : le socle ne le reecrit jamais (voir socle.adaptateur.json).
// Le reste de la page, textes compris, vient de l'extension du socle.
export const INTRODUCTION = {
  fr: "Publier un billet se voit déjà sur le site, sans rien faire : les pages gérées se rendent depuis la base. Ce bouton sert à la fin d'une séance de modifications. Il vide les caches du contenu, puis relance le build des pages figées (contact, pages légales, et tout ce qui ne change qu'au build).",
  en: "Publishing a post already shows on the site, with nothing to do: managed pages are rendered from the database. This button is for the end of an editing session. It empties the content caches, then restarts the build of the prerendered pages (contact, legal pages, and everything that only changes at build time).",
};
