// src/moteur/deployer/textes.fr.ts - tout ce que la page "Tout deployer" affiche, en francais. Sa forme est le contrat du dictionnaire anglais.
import type { Build } from "./journal";

export const FR = {
  titre: "Tout déployer",
  intro:
    "Publier un billet se voit déjà sur le site, sans rien faire : les pages gérées se rendent depuis la base. Ce bouton sert à la fin d'une séance de modifications. Il vide les caches du contenu, puis relance le build des pages figées (contact, pages légales, et tout ce qui ne change qu'au build).",
  bouton: "Tout déployer",
  actualiser: "Actualiser",
  inconnu: "inconnu",
  jamais: "Jamais",
  aucune: "Aucune",

  etat: {
    version: "Version servie",
    construit: "Build servi, construit le",
    dernier: "Dernier déclenchement",
    reponse: "Réponse du hook",
    objets: "Cache d'objets",
    routes: "Cache de routes",
    configure: (nom: string) => `Configuré (${nom})`,
    nonConfigure: "Aucun configuré",
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
