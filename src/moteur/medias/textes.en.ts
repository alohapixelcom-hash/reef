// src/moteur/medias/textes.en.ts - the English phrases of the "Photos" dashboard card (same keys as textes.fr.ts).
import type { FR } from "./textes.fr";

export const EN: typeof FR = {
  carte: "Photos",
  stats: {
    faites: "Photos optimized",
    gagne: "Space saved",
    restantes: "To review",
  },
  bouton: "Optimize existing photos",
  consigne: (lot: number) =>
    `${lot} photos at a time: click again until "To review" reaches zero. Photo addresses do not change, and the original is kept aside.`,
  reserve: "An Editor or Administrator can start the optimization.",
  toutFait: "All photos have been reviewed. The ones you add are optimized on upload, with nothing to do.",
  nonRelie: {
    titre: "Conversion not connected",
    texte: "Photos are kept as they are. Let the person who set up the site know.",
  },
  lotIndisponible: "New photos are optimised as soon as they are uploaded. Optimising the photos already online is not connected on this site: let the person who set it up know.",
  lot: (faites: number, gardees: number, echecs: number) =>
    `${faites} photo${faites === 1 ? "" : "s"} optimized, ${gardees} kept as is${echecs ? `, ${echecs} failed (original kept)` : ""}.`,
  toast: "Batch done",
  refuse: "Optimization is reserved for Editors and Administrators.",
  journal: {
    titre: "Latest photos",
    photo: "Photo",
    resultat: "Result",
    poids: "Size",
    vide: "No photo processed yet.",
  },
  resultat: {
    fait: (format: string) => `Converted to ${format.toUpperCase()}`,
    garde: "Kept as is",
    echec: "Failed, original kept",
  },
  raisons: {
    vide: "empty file",
    "pas-une-image": "not a photo",
    gif: "GIF",
    svg: "SVG",
    anime: "animated image",
    avif: "already AVIF",
    "webp-leger": "already light",
    "trop-lourd": "over 20 MB",
    "sans-liaison": "conversion not connected",
    "plus-lourd": "conversion was heavier",
    echec: "conversion failed",
    "fichier-absent": "file not found",
    "fiche-changee": "photo changed during processing",
    "champ-refuse": "this field only accepts the original",
    "deja-en-base": "already in the library",
  },
};
