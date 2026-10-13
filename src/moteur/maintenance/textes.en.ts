// src/moteur/maintenance/textes.en.ts - tout ce que la page "Maintenance" du back office affiche, en anglais, sur la forme du dictionnaire francais.
import type { FR } from "./textes.fr.ts";

export const EN: typeof FR = {
  titre: "Maintenance",
  intro:
    "Maintenance mode closes the site to visitors while you fine-tune it. They see a holding page; you, signed in to the back office, keep seeing and editing the whole site.",
  ouvert: { titre: "The site is open", texte: "Everyone sees the site." },
  ferme: {
    titre: "The site is under maintenance",
    texte: "Visitors see the holding page. Search engines are asked to come back later: rankings are kept.",
  },
  formulaire: {
    actif: "Maintenance mode",
    actifAide: "On: visitors see the holding page as soon as you save.",
    titre: "Holding page title",
    titreExemple: "We will be back very soon",
    sousTitre: "Subtitle",
    sousTitreExemple: "The shop is getting a makeover. Thank you for your patience.",
    fond: "Page background",
    fonds: { aucun: "Plain colour", image: "A photo", video: "A video" },
    image: "Background photo",
    video: "Background video",
    retour: "Expected return date (optional)",
    enregistrer: "Save",
  },
  sansImage: "No photo in the media library: add one in Médias, then reload this page.",
  sansVideo: "No video in the media library: add one in Médias, then reload this page.",
  videoConseil: "A short, light video (under 10 MB, no sound) loads fast on a phone. It is not shown to visitors who asked for less animation.",
  sansTitre:
    "Without a title here, visitors see the holding page your site provides (edited in \"Textes des pages\", line \"Page de maintenance\"), or a plain \"Site en maintenance\" page.",
  recap: { titre: "Title", fond: "Background", retour: "Announced return", aucun: "None" },
  actualiser: "Check",
  toastFerme: "The site is under maintenance.",
  toastOuvert: "The site is open again.",
  toastEnregistre: "Settings saved.",
  erreurs: {
    titreLong: "The title is longer than 120 characters: shorten it.",
    sousTitreLong: "The subtitle is longer than 400 characters: shorten it.",
    dateIllisible: "The return date cannot be read: pick it in the calendar.",
    mediaInconnu: "This media is no longer in the media library: choose another one.",
  },
  delai: "A change reaches visitors in less than a minute.",
};
