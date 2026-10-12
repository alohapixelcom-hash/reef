// src/moteur/medias/textes.fr.ts - les phrases francaises de la carte "Photos" du tableau de bord.
//
// Ecrites pour le client : aucun mot technique (liaison, R2, AVIF dans une
// consigne...) hors du nom des formats, qu'il voit deja dans la Mediatheque.
export const FR = {
  carte: "Photos",
  stats: {
    faites: "Photos optimisées",
    gagne: "Place gagnée",
    restantes: "À examiner",
  },
  bouton: "Optimiser les photos existantes",
  consigne: (lot: number) =>
    `Par lots de ${lot} photos : recliquez jusqu'à ce que le compteur « À examiner » tombe à zéro. L'adresse des photos ne change pas, et l'original est gardé de côté.`,
  reserve: "Une personne au rôle Éditeur ou Administrateur peut lancer l'optimisation.",
  toutFait: "Toutes les photos ont été examinées. Celles que vous ajoutez sont optimisées dès l'envoi, sans rien faire.",
  nonRelie: {
    titre: "Conversion non reliée",
    texte: "Les photos sont gardées telles quelles. Prévenez la personne qui a installé le site.",
  },
  lotIndisponible: "Les nouvelles photos sont optimisées dès l'envoi. L'optimisation des photos déjà en ligne n'est pas branchée sur ce site : prévenez la personne qui l'a installé.",
  lot: (faites: number, gardees: number, echecs: number) =>
    `${faites} photo${faites > 1 ? "s" : ""} optimisée${faites > 1 ? "s" : ""}, ${gardees} gardée${gardees > 1 ? "s" : ""} telle${gardees > 1 ? "s" : ""} quelle${gardees > 1 ? "s" : ""}${echecs ? `, ${echecs} en échec (original gardé)` : ""}.`,
  toast: "Lot terminé",
  refuse: "L'optimisation est réservée aux rôles Éditeur et Administrateur.",
  journal: {
    titre: "Dernières photos",
    photo: "Photo",
    resultat: "Résultat",
    poids: "Poids",
    vide: "Aucune photo traitée pour l'instant.",
  },
  resultat: {
    fait: (format: string) => `Convertie en ${format.toUpperCase()}`,
    garde: "Gardée telle quelle",
    echec: "Échec, original gardé",
  },
  raisons: {
    vide: "fichier vide",
    "pas-une-image": "pas une photo",
    gif: "GIF",
    svg: "SVG",
    anime: "image animée",
    avif: "déjà en AVIF",
    "webp-leger": "déjà légère",
    "trop-lourd": "plus de 20 Mo",
    "sans-liaison": "conversion non reliée",
    "plus-lourd": "la conversion pesait plus",
    echec: "conversion impossible",
    "fichier-absent": "fichier introuvable",
    "fiche-changee": "photo modifiée pendant le traitement",
    "champ-refuse": "ce champ n'accepte que l'original",
    "deja-en-base": "déjà dans la médiathèque",
  } as Record<string, string>,
};
