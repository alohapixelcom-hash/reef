// src/moteur/extensions/courriels/configuration.ts - LE SEUL FICHIER PROPRE AU SITE dans l'extension Courriels : ses formulaires, ses liaisons, sa commande de deploiement.
//
// Pour poser l'extension dans un autre depot, on copie le dossier entier et on
// ne reecrit que ce fichier (mode d'emploi en tete de ./adaptateur.ts). Aucune
// adresse ici : les adresses se reglent dans le back office, jamais dans le code.
import siteData from "../../../config/siteData.json.ts";
import type { OptionsDeLaLettre } from "./noyau/lettre.ts";
import type { Formulaire, Langue } from "./noyau/regles.ts";

export interface Configuration {
  /** Les formulaires que ce site affiche : l'ecran des reglages ne demande un destinataire que pour eux. */
  formulaires: readonly Formulaire[];
  /** Les autres extensions du site qui envoient par le canal, et le formulaire sous lequel le journal range leurs courriels. */
  sources: Readonly<Record<string, Formulaire>>;
  /** Le nom de la liaison `send_email` dans la configuration du Worker. */
  liaison: string;
  /** Le nom de la liaison D1 de la base du site (celle d'EmDash). */
  base: string;
  /** Le fichier qui decrit le Worker, tel que l'ecran "Brancher" le nomme. */
  fichierWrangler: string;
  /** Les commandes qui redeploient le Worker, depuis le dossier du site. */
  deploiement: string;
  /** Le nom du site quand les reglages d'EmDash n'en ont pas. */
  nomDuSite: string;
  /** La langue des notifications (celles que recoit le proprietaire) : celle du back office. */
  langue: Langue;
  /** La langue par defaut du back office (ALOHA_BO_LANGUE) ; null quand le navigateur decide. */
  langueDuBackOffice: string | null;
  /**
   * La lettre d'information : la collection des articles, leur
   * adresse par langue, l'accueil de chaque langue. Absente : pas de lettre,
   * ni page au back office ni formulaire branche.
   */
  lettre?: OptionsDeLaLettre;
}

// Figee au build par moteur.config.mjs ; absente hors build (tests) : le francais.
const langueDuBackOffice: string | null = typeof __ALOHA_BO_LANGUE__ === "undefined" ? "fr" : __ALOHA_BO_LANGUE__;

export const CONFIGURATION: Configuration = {
  formulaires: ["contact"],
  sources: {},
  liaison: "EMAIL",
  base: "DB",
  fichierWrangler: "wrangler.moteur.jsonc",
  deploiement: "pnpm build:moteur\nnpx wrangler deploy",
  nomDuSite: siteData.name,
  langue: (langueDuBackOffice ?? "fr").startsWith("en") ? "en" : "fr",
  langueDuBackOffice,
  lettre: {
    collection: "posts",
    adresse: { en: "/blog/{slug}/", fr: "/fr/blog/{slug}/" },
    accueil: { en: "/", fr: "/fr/" },
  },
};
