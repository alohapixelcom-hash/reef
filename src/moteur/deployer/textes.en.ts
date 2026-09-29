// src/moteur/deployer/textes.en.ts - everything the "Update the site" page displays, in English. Same shape as textes.fr.ts, checked by the compiler.
import { INTRODUCTION } from "./site";
import type { Textes } from "./textes";

export const EN: Textes = {
  titre: "Update the site",
  intro:
    "Your published changes are already online: after a text, a photo, a menu or a price, there is nothing to do here. This button is only needed after a change of logo, site name or brand colour: it rebuilds the few pages that do not update on their own. Allow one to three minutes.",
  bouton: "Update the site",
  actualiser: "Check",
  inconnu: "unknown",
  jamais: "Never",
  aucun: "None",

  etat: {
    pages: "Pages rebuilt on",
    version: (version: string) => `Theme version ${version}.`,
    demande: "Last request",
    aucuneDemande: "No request yet.",
  },

  resultats: {
    fait: "Started",
    echec: "Not started",
    refuse: "Too soon",
    nonRelie: "Button not connected yet",
  },

  clic: {
    lance: "Done: the site is updating. Come back in two minutes and click “Check”.",
    echec: "The update could not be started. Try again in a minute; if it happens again, tell the person who installed your site.",
    refuse: (depuis: string, reste: string) => `An update was already requested ${depuis} ago. Try again in ${reste}: nothing was done.`,
    nonRelie:
      "Nothing was restarted: this button is not connected to the site yet. Your published changes are online. Tell the person who installed your site.",
  },

  nonRelie: {
    titre: "This button is not connected yet",
    texte:
      "Your published changes are online. Only the pages rebuilt after a change of logo, name or colour are waiting: tell the person who installed your site, the details for them are at the very bottom of this page.",
  },

  preuve: {
    faitTitre: "The site is up to date",
    fait: (refaites: string, demande: string) => `The pages were rebuilt on ${refaites}, after your request of ${demande}.`,
    attenteTitre: "Update in progress",
    attente: (demande: string) =>
      `Requested on ${demande}. It usually takes one to three minutes: click “Check”. If nothing changes after ten minutes, tell the person who installed your site.`,
  },

  journal: {
    titre: "Last requests",
    vide: "No request yet.",
    quand: "When",
    qui: "Who",
    resultat: "Result",
  },

  toast: {
    fait: "Update started",
    nonRelie: "Nothing was restarted",
    refuse: "An update was just requested",
    echec: "The update was not started",
  },

  technique: {
    titre: "For the person who installed the site",
    intro: INTRODUCTION.en,
    version: "Version served",
    construit: (quand: string) => `Built on ${quand}.`,
    dernier: "Last trigger",
    aucunDeclenchement: "No build requested from this back office yet.",
    caches: "Content caches",
    detailDesCaches: (objets: string, routes: string) => `Objects: ${objets}. Routes: ${routes}.`,
    nonConfigure: "none",
    http: (code: number) => `HTTP ${code}`,
    sansReponse: "No response",
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
      rejete: (code: number) => `The hook answered HTTP ${code}: the build was NOT started. Check the Deploy Hook address in Cloudflare.`,
      injoignable: "The hook did not answer (unreachable address, or more than ten seconds): the build was NOT started.",
    },
    hook: {
      absentTitre: "The build cannot be restarted from here",
      absent:
        "The secret variable ALOHA_DEPLOY_HOOK is not set. Create a Deploy Hook in Cloudflare (Workers Builds, in the Worker settings), then set its address with the command below. The caches are handled on every click.",
      invalideTitre: "ALOHA_DEPLOY_HOOK cannot be read",
      invalide: "The value that was set is not an https address. Set it again with the command below.",
    },
    attente: (construit: string) => `The site still serves the build from ${construit}. If it does not arrive, the Workers Builds log, in Cloudflare, says why.`,
    journal: {
      titre: "Details of the last five clicks",
      caches: "Caches",
      build: "Build",
      code: "HTTP",
      note: (adresse: string, fuseau: string) =>
        `One trigger per minute at most. Times in the ${fuseau} time zone. The public proof of the build served: ${adresse}`,
    },
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
};
