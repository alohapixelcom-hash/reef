// src/moteur/deployer/textes.en.ts - everything the "Deploy everything" page displays, in English. Same shape as textes.fr.ts, checked by the compiler.
import type { Textes } from "./textes";

export const EN: Textes = {
  titre: "Deploy everything",
  intro:
    "Publishing a post already shows on the site, with nothing to do: managed pages are rendered from the database. This button is for the end of an editing session. It empties the content caches, then restarts the build of the prerendered pages (contact, legal pages, and everything that only changes at build time).",
  bouton: "Deploy everything",
  actualiser: "Refresh",
  inconnu: "unknown",
  jamais: "Never",
  aucune: "None",

  etat: {
    version: "Version served",
    construit: "Build served, built on",
    dernier: "Last trigger",
    reponse: "Hook response",
    objets: "Object cache",
    routes: "Route cache",
    configure: (nom: string) => `Configured (${nom})`,
    nonConfigure: "None configured",
    http: (code: number) => `HTTP ${code}`,
    sansReponse: "No response",
  },

  caches: {
    aucun: "No cache configured, nothing to empty.",
    nonTouches: "Not touched.",
    objetsVides: (espaces: number) => `Object cache emptied (${espaces} namespaces).`,
    objetsAucun: "No object cache.",
    routesVides: "Route cache emptied.",
    routesAucun: "No route cache.",
    routesInconnu: (nom: string) => `Route cache "${nom}": this button cannot empty it as a whole.`,
    routesEchec: (detail: string) => `Route cache NOT emptied: ${detail}.`,
  },

  build: {
    declenche: "Triggered",
    rejete: "Rejected by the hook",
    injoignable: "Hook unreachable",
    refuse: "Refused (less than a minute)",
    "sans-hook": "Not started (variable missing)",
    "hook-invalide": "Not started (variable invalid)",
  },

  resultat: {
    declenche: (code: number) => `Build requested: the hook answered HTTP ${code}.`,
    rejete: (code: number) =>
      `The hook answered HTTP ${code}: the build was NOT started. Check the Deploy Hook address in Cloudflare.`,
    injoignable:
      "The hook did not answer (unreachable address, or more than ten seconds): the build was NOT started. You can try again right away.",
    refuse: (depuis: string, reste: string) =>
      `Already triggered ${depuis} ago. One trigger per minute: try again in ${reste}. Nothing was done.`,
    sansBuild: "The build of the prerendered pages was NOT restarted: see below.",
  },

  hook: {
    absentTitre: "The build cannot be restarted from here",
    absent:
      "The secret variable ALOHA_DEPLOY_HOOK is not set. Create a Deploy Hook in Cloudflare (Workers Builds, in the Worker settings), then set its address with the command below. The caches are handled on every click.",
    invalideTitre: "ALOHA_DEPLOY_HOOK cannot be read",
    invalide: "The value that was set is not an https address. Set it again with the command below.",
  },

  preuve: {
    prouveTitre: "Redeployment proven",
    prouve: (construit: string, demande: string) =>
      `The site serves a build from ${construit}, later than the trigger of ${demande}.`,
    attenteTitre: "Build requested, not online yet",
    attente: (construit: string, demande: string) =>
      `Triggered on ${demande}. The site still serves the build from ${construit}. A build usually takes one to three minutes: click Refresh. If it does not arrive, the Workers Builds log, in Cloudflare, says why.`,
  },

  journal: {
    titre: "Last five clicks",
    vide: "No click yet.",
    quand: "When",
    qui: "Who",
    caches: "Caches",
    build: "Build",
    code: "HTTP",
    note: (adresse: string, fuseau: string) =>
      `One trigger per minute at most. Times in the ${fuseau} time zone. The public proof of the build served: ${adresse}`,
  },

  toast: {
    fait: "Build requested",
    sansBuild: "Build not restarted",
    refuse: "Refused: one trigger per minute",
    echec: "The build was not started",
  },
};
