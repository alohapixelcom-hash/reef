// src/moteur/deployer/textes.fr.ts - tout ce que la page "Tout deployer" affiche, en francais. Sa forme est le contrat du dictionnaire anglais.
//
// La seule phrase propre au site, l'introduction (ce qu'on publie et ce que
// le build refige), vit dans site.ts, que le site possede. Le reste est le
// meme dans tous les depots.
import type { Build } from "./journal";
import { INTRODUCTION } from "./site";

export const FR = {
  titre: "Tout déployer",
  intro: INTRODUCTION.fr,
  bouton: "Tout déployer",
  actualiser: "Actualiser",
  inconnu: "inconnu",
  jamais: "Jamais",
  aucun: "Aucun",

  etat: {
    version: "Version servie",
    construit: (quand: string) => `Build du ${quand}.`,
    dernier: "Dernier déclenchement",
    aucunDeclenchement: "Aucun build demandé depuis ce back office.",
    caches: "Caches du contenu",
    detailDesCaches: (objets: string, routes: string) => `Objets : ${objets}. Routes : ${routes}.`,
    nonConfigure: "aucun",
    http: (code: number) => `HTTP ${code}`,
    sansReponse: "Aucune réponse",
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
    rejete: (code: number) =>
      `Le hook a répondu HTTP ${code} : le build n'a PAS été lancé. Vérifiez l'adresse du Deploy Hook dans Cloudflare.`,
    injoignable:
      "Le hook n'a pas répondu (adresse injoignable, ou dix secondes dépassées) : le build n'a PAS été lancé. Vous pouvez réessayer tout de suite.",
    refuse: (depuis: string, reste: string) =>
      `Déjà déclenché il y a ${depuis}. Un seul déclenchement par minute : réessayez dans ${reste}. Rien n'a été fait.`,
    // Le pourquoi est dit juste en dessous, par l'avertissement permanent : on ne le repete pas.
    sansBuild: "Le build des pages figées n'a PAS été relancé : voir ci-dessous.",
  },

  hook: {
    absentTitre: "Le build ne peut pas être relancé d'ici",
    absent:
      "La variable secrète ALOHA_DEPLOY_HOOK n'est pas posée. Créez un Deploy Hook dans Cloudflare (Workers Builds, réglages du Worker), puis posez son adresse avec la commande ci-dessous. Les caches, eux, sont traités à chaque clic.",
    invalideTitre: "ALOHA_DEPLOY_HOOK est illisible",
    invalide: "La valeur posée n'est pas une adresse https. Reposez-la avec la commande ci-dessous.",
  },

  preuve: {
    prouveTitre: "Redéploiement prouvé",
    prouve: (construit: string, demande: string) =>
      `Le site sert un build du ${construit}, postérieur au déclenchement du ${demande}.`,
    attenteTitre: "Build demandé, pas encore en ligne",
    attente: (construit: string, demande: string) =>
      `Déclenché le ${demande}. Le site sert encore le build du ${construit}. Un build prend d'ordinaire une à trois minutes : cliquez sur Actualiser. S'il n'arrive pas, le journal de Workers Builds, dans Cloudflare, dit pourquoi.`,
  },

  journal: {
    titre: "Cinq derniers clics",
    vide: "Aucun clic pour l'instant.",
    quand: "Quand",
    qui: "Qui",
    caches: "Caches",
    build: "Build",
    code: "HTTP",
    note: (adresse: string, fuseau: string) =>
      `Un déclenchement par minute au plus. Heures du fuseau ${fuseau}. La preuve publique du build servi : ${adresse}`,
  },

  toast: {
    fait: "Build demandé",
    sansBuild: "Build non relancé",
    refuse: "Refusé : un déclenchement par minute",
    echec: "Le build n'a pas été lancé",
  },
};
