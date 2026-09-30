// src/moteur/deployer/textes.fr.ts - tout ce que la page "Mettre le site a jour" affiche, en francais. Sa forme est le contrat du dictionnaire anglais.
//
// DEUX LECTEURS, DEUX PARTIES. Le haut de la page parle au
// client : aucun mot technique, aucune variable, aucune commande ; il dit
// quand le bouton sert et quoi faire si quelque chose manque. Le detail
// technique (build, caches, hook, commande du secret) est replie dans
// "Pour la personne qui a installe le site" : `technique`. Le self-check
// textes.selfcheck.ts refuse un mot technique dans la partie du client.
//
// La seule phrase propre au site, l'introduction technique (ce qu'on publie
// et ce que le build refige), vit dans site.ts, que le site possede.
import type { Build } from "./journal";
import { INTRODUCTION } from "./site";

export const FR = {
  titre: "Mettre le site à jour",
  intro:
    "Vos modifications publiées sont déjà en ligne : après un texte, une photo, un menu ou un prix, vous n'avez rien à faire ici. Ce bouton ne sert qu'après un changement de logo, de nom du site ou de couleur de la marque : il refait les quelques pages qui ne se mettent pas à jour seules. Comptez une à trois minutes.",
  bouton: "Mettre le site à jour",
  actualiser: "Vérifier",
  inconnu: "inconnu",
  jamais: "Jamais",
  aucun: "Aucun",

  etat: {
    pages: "Pages refaites le",
    version: (version: string) => `Version ${version} du thème.`,
    demande: "Dernière demande",
    aucuneDemande: "Aucune demande pour l'instant.",
  },

  resultats: {
    fait: "Lancée",
    echec: "Pas lancée",
    refuse: "Trop rapprochée",
    nonRelie: "Bouton pas encore relié",
  },

  clic: {
    lance: "C'est parti : le site se met à jour. Revenez dans deux minutes et cliquez sur « Vérifier ».",
    echec: "La mise à jour n'a pas pu être lancée. Réessayez dans une minute ; si cela recommence, prévenez la personne qui a installé votre site.",
    refuse: (depuis: string, reste: string) =>
      `Une mise à jour a déjà été demandée il y a ${depuis}. Réessayez dans ${reste} : rien n'a été fait.`,
    nonRelie:
      "Rien n'a été relancé : ce bouton n'est pas encore relié au site. Vos modifications publiées, elles, sont bien en ligne. Prévenez la personne qui a installé votre site.",
  },

  nonRelie: {
    titre: "Ce bouton n'est pas encore relié",
    texte:
      "Vos modifications publiées sont en ligne. Seules les pages refaites après un changement de logo, de nom ou de couleur attendent : prévenez la personne qui a installé votre site, le détail pour elle est tout en bas de cette page.",
  },

  preuve: {
    faitTitre: "Le site est à jour",
    fait: (refaites: string, demande: string) => `Les pages ont été refaites le ${refaites}, après votre demande du ${demande}.`,
    attenteTitre: "Mise à jour en cours",
    attente: (demande: string) =>
      `Demandée le ${demande}. Cela prend d'ordinaire une à trois minutes : cliquez sur « Vérifier ». Si rien ne change après dix minutes, prévenez la personne qui a installé votre site.`,
  },

  journal: {
    titre: "Dernières demandes",
    vide: "Aucune demande pour l'instant.",
    quand: "Quand",
    qui: "Qui",
    resultat: "Résultat",
  },

  toast: {
    fait: "Mise à jour lancée",
    nonRelie: "Rien n'a été relancé",
    refuse: "Une mise à jour vient d'être demandée",
    echec: "La mise à jour n'a pas été lancée",
  },

  // Tout ce qui suit est replie sous "Pour la personne qui a installe le site".
  technique: {
    titre: "Pour la personne qui a installé le site",
    intro: INTRODUCTION.fr,
    version: "Version servie",
    construit: (quand: string) => `Build du ${quand}.`,
    dernier: "Dernier déclenchement",
    aucunDeclenchement: "Aucun build demandé depuis ce back office.",
    caches: "Caches du contenu",
    detailDesCaches: (objets: string, routes: string) => `Objets : ${objets}. Routes : ${routes}.`,
    nonConfigure: "aucun",
    http: (code: number) => `HTTP ${code}`,
    sansReponse: "Aucune réponse",
    build: {
      declenche: "Déclenché",
      rejete: "Rejeté par le hook",
      injoignable: "Hook injoignable",
      refuse: "Refusé (moins d'une minute)",
      "sans-hook": "Non lancé (variable absente)",
      "hook-invalide": "Non lancé (variable invalide)",
    } satisfies Record<Build | "rejete", string>,
    resultat: {
      declenche: (code: number) => `Build demandé : le hook a répondu HTTP ${code}.`,
      rejete: (code: number) => `Le hook a répondu HTTP ${code} : le build n'a PAS été lancé. Vérifiez l'adresse du Deploy Hook dans Cloudflare.`,
      injoignable: "Le hook n'a pas répondu (adresse injoignable, ou dix secondes dépassées) : le build n'a PAS été lancé.",
    },
    hook: {
      absentTitre: "Le build ne peut pas être relancé d'ici",
      absent:
        "La variable secrète ALOHA_DEPLOY_HOOK n'est pas posée. Créez un Deploy Hook dans Cloudflare (Workers Builds, réglages du Worker), puis posez son adresse avec la commande ci-dessous. Les caches, eux, sont traités à chaque clic.",
      invalideTitre: "ALOHA_DEPLOY_HOOK est illisible",
      invalide: "La valeur posée n'est pas une adresse https. Reposez-la avec la commande ci-dessous.",
    },
    attente: (construit: string) =>
      `Le site sert encore le build du ${construit}. S'il n'arrive pas, le journal de Workers Builds, dans Cloudflare, dit pourquoi.`,
    journal: {
      titre: "Détail des cinq derniers clics",
      caches: "Caches",
      build: "Build",
      code: "HTTP",
      note: (adresse: string, fuseau: string) =>
        `Un déclenchement par minute au plus. Heures du fuseau ${fuseau}. La preuve publique du build servi : ${adresse}`,
    },
  },

  caches: {
    aucun: "Aucun cache configuré, rien à vider.",
    nonTouches: "Non touchés.",
    objetsVides: (espaces: number) => `Cache d'objets vidé (${espaces} espaces).`,
    objetsAucun: "Pas de cache d'objets.",
    routesVides: "Cache de routes vidé.",
    routesAucun: "Pas de cache de routes.",
    routesInconnu: (nom: string) => `Cache de routes « ${nom} » : ce bouton ne sait pas le vider en entier.`,
    routesEchec: (detail: string) => `Cache de routes NON vidé : ${detail}.`,
  },
};

/** Les parties que lit le client : le self-check y refuse tout mot technique. */
export const PARTIES_DU_CLIENT = ["titre", "intro", "bouton", "actualiser", "etat", "resultats", "clic", "nonRelie", "preuve", "journal", "toast"] as const;
