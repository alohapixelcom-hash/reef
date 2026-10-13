// src/moteur/maintenance/textes.fr.ts - tout ce que la page "Maintenance" du back office affiche, en francais. Sa forme est le contrat du dictionnaire anglais.
//
// Un seul lecteur : le client. Aucun mot technique, aucune commande. Les noms
// cites ("Médias", "Textes des pages") sont ceux que le back office affiche.
export const FR = {
  titre: "Maintenance",
  intro:
    "Le mode maintenance ferme le site aux visiteurs le temps d'une mise au point. Ils voient une page d'attente ; vous, connecté au back office, continuez de voir et de modifier tout le site.",
  ouvert: { titre: "Le site est ouvert", texte: "Tout le monde voit le site." },
  ferme: {
    titre: "Le site est en maintenance",
    texte:
      "Les visiteurs voient la page d'attente. Les moteurs de recherche sont priés de repasser plus tard : le référencement est préservé.",
  },
  formulaire: {
    actif: "Mise en maintenance",
    actifAide: "Activé : les visiteurs voient la page d'attente dès l'enregistrement.",
    titre: "Titre de la page d'attente",
    titreExemple: "Nous revenons très vite",
    sousTitre: "Sous-titre",
    sousTitreExemple: "La boutique fait peau neuve. Merci de votre patience.",
    fond: "Fond de la page",
    fonds: { aucun: "Couleur unie", image: "Une photo", video: "Une vidéo" },
    image: "Photo de fond",
    video: "Vidéo de fond",
    retour: "Date de retour (facultatif)",
    enregistrer: "Enregistrer",
  },
  sansImage: "Aucune photo dans la médiathèque : ajoutez-en une dans Médias, puis rechargez cette page.",
  sansVideo: "Aucune vidéo dans la médiathèque : ajoutez-en une dans Médias, puis rechargez cette page.",
  videoConseil: "Une vidéo courte et légère (moins de 10 Mo, sans son) se charge vite sur un téléphone. Elle ne s'affiche pas pour les visiteurs qui ont demandé moins d'animations.",
  sansTitre:
    "Sans titre saisi ici, les visiteurs voient la page d'attente prévue par votre site (à modifier dans Textes des pages, ligne « Page de maintenance »), ou une page sobre « Site en maintenance ».",
  recap: { titre: "Titre", fond: "Fond", retour: "Retour annoncé", aucun: "Aucun" },
  actualiser: "Vérifier",
  toastFerme: "Le site est en maintenance.",
  toastOuvert: "Le site est rouvert.",
  toastEnregistre: "Réglages enregistrés.",
  erreurs: {
    titreLong: "Le titre dépasse 120 caractères : raccourcissez-le.",
    sousTitreLong: "Le sous-titre dépasse 400 caractères : raccourcissez-le.",
    dateIllisible: "La date de retour est illisible : choisissez-la dans le calendrier.",
    mediaInconnu: "Ce média n'est plus dans la médiathèque : choisissez-en un autre.",
  },
  delai: "Un changement se voit chez les visiteurs en moins d'une minute.",
};
