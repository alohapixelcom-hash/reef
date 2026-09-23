// src/moteur/deployer/page.ts - compose la page "Tout deployer" en Block Kit : l'etat, le bouton, la preuve, le journal.
//
// POURQUOI BLOCK KIT ET PAS REACT : la page est une liste de faits et deux
// boutons. Block Kit la decrit en JSON, le back office la rend avec SES
// composants : elle herite donc de l'habillage du theme (back-office.css) sans
// une ligne de style ici, et aucun script de plus ne part au navigateur. Le
// theme ne gagne ni composant React ni dependance.
//
// Les types ci-dessous sont le sous-ensemble de @emdash-cms/blocks que cette
// page emploie : le paquet n'est pas une dependance directe du theme, et le
// moteur valide de toute facon chaque reponse avant de la rendre.
import { versionServie } from "../version";
import type { Resultat } from "./action";
import type { Passage } from "./journal";
import { DELAI_MS, heure as heureDuSite, type Hook, secondes } from "./regles";
import { COMMANDE_DU_SECRET, type LangueDesTextes, type Textes, textesPour } from "./textes";

type Bouton = { type: "button"; action_id: string; label: string; style?: "primary" | "secondary" };
type Bloc =
  | { type: "header"; text: string }
  | { type: "section"; text: string }
  | { type: "context"; text: string }
  | { type: "divider" }
  | { type: "fields"; fields: { label: string; value: string }[] }
  | { type: "banner"; title?: string; description: string; variant: "default" | "alert" | "error" }
  | { type: "code"; code: string; language: "bash" }
  | { type: "actions"; elements: Bouton[] }
  | {
      type: "table";
      columns: { key: string; label: string }[];
      rows: Record<string, string>[];
      page_action_id: string;
      empty_text: string;
    };

export interface Reponse {
  blocks: Bloc[];
  toast?: { message: string; type: "success" | "error" | "info" };
}

export const ACTION_DEPLOYER = "tout-deployer";
const ACTION_ACTUALISER = "actualiser";

export interface Etat {
  /** La langue du back office pour cette personne : elle choisit le dictionnaire et la forme des dates. */
  langue: LangueDesTextes;
  hook: Hook;
  dernier: Passage | null;
  passages: Passage[];
  /** L'adresse absolue de /version.json : la preuve publique, ecrite en clair (Block Kit 0.38 n'a pas d'element lien). */
  adresseVersion: string;
}

const reussi = (code: number | null): code is number => code !== null && code >= 200 && code < 300;

function libelleDuBuild(TEXTES: Textes, passage: Passage): string {
  if (passage.build === "declenche" && !reussi(passage.code)) return TEXTES.build.rejete;
  return TEXTES.build[passage.build];
}

/** Ce que le clic vient de faire, dit sans adoucir : un build non lance s'ecrit "PAS lance". */
function bandeauDuClic(TEXTES: Textes, { passage, attente }: Resultat): { bloc: Bloc; toast: Reponse["toast"] } {
  const avec = (phrase: string): string => `${passage.caches} ${phrase}`;
  switch (passage.build) {
    case "declenche":
      return reussi(passage.code)
        ? {
            bloc: { type: "banner", variant: "default", description: avec(TEXTES.resultat.declenche(passage.code)) },
            toast: { message: TEXTES.toast.fait, type: "success" },
          }
        : {
            bloc: { type: "banner", variant: "error", description: avec(TEXTES.resultat.rejete(passage.code ?? 0)) },
            toast: { message: TEXTES.toast.echec, type: "error" },
          };
    case "injoignable":
      return {
        bloc: { type: "banner", variant: "error", description: avec(TEXTES.resultat.injoignable) },
        toast: { message: TEXTES.toast.echec, type: "error" },
      };
    case "refuse":
      return {
        bloc: {
          type: "banner",
          variant: "alert",
          description: TEXTES.resultat.refuse(secondes(DELAI_MS - attente, "bas"), secondes(attente)),
        },
        toast: { message: TEXTES.toast.refuse, type: "info" },
      };
    case "sans-hook":
    case "hook-invalide":
      return {
        bloc: {
          type: "banner",
          variant: "alert",
          description: avec(TEXTES.resultat.sansBuild),
        },
        toast: { message: TEXTES.toast.sansBuild, type: "info" },
      };
  }
}

/** La preuve : le build servi est-il posterieur au dernier declenchement reussi ? */
function preuve(TEXTES: Textes, heure: (iso: string) => string, dernier: Passage | null): Bloc[] {
  if (!dernier || dernier.build !== "declenche" || !reussi(dernier.code)) return [];
  const construit = heure(versionServie.construit);
  const demande = heure(dernier.quand);
  return Date.parse(versionServie.construit) > Date.parse(dernier.quand)
    ? [{ type: "banner", variant: "default", title: TEXTES.preuve.prouveTitre, description: TEXTES.preuve.prouve(construit, demande) }]
    : [{ type: "banner", variant: "alert", title: TEXTES.preuve.attenteTitre, description: TEXTES.preuve.attente(construit, demande) }];
}

function avertissementDuHook(TEXTES: Textes, hook: Hook): Bloc[] {
  if (hook.etat === "pret") return [];
  const absent = hook.etat === "absent";
  return [
    {
      type: "banner",
      variant: "alert",
      title: absent ? TEXTES.hook.absentTitre : TEXTES.hook.invalideTitre,
      description: absent ? TEXTES.hook.absent : TEXTES.hook.invalide,
    },
    { type: "code", language: "bash", code: COMMANDE_DU_SECRET },
  ];
}

function reponseDuHook(TEXTES: Textes, dernier: Passage | null): string {
  if (!dernier) return TEXTES.aucune;
  return dernier.code === null ? TEXTES.etat.sansReponse : TEXTES.etat.http(dernier.code);
}

export function composer(etat: Etat, clic?: Resultat): Reponse {
  const TEXTES = textesPour(etat.langue);
  const heure = (iso: string): string => heureDuSite(iso, etat.langue, __ALOHA_BO_FUSEAU__);
  const bandeau = clic ? bandeauDuClic(TEXTES, clic) : undefined;
  const caches = __ALOHA_CACHES__;
  const blocks: Bloc[] = [
    { type: "header", text: TEXTES.titre },
    { type: "section", text: TEXTES.intro },
    ...(bandeau ? [bandeau.bloc] : []),
    ...avertissementDuHook(TEXTES, etat.hook),
    {
      type: "actions",
      elements: [
        { type: "button", action_id: ACTION_DEPLOYER, label: TEXTES.bouton, style: "primary" },
        { type: "button", action_id: ACTION_ACTUALISER, label: TEXTES.actualiser, style: "secondary" },
      ],
    },
    { type: "divider" },
    {
      type: "fields",
      fields: [
        { label: TEXTES.etat.version, value: versionServie.version },
        { label: TEXTES.etat.construit, value: heure(versionServie.construit) },
        { label: TEXTES.etat.dernier, value: etat.dernier ? heure(etat.dernier.quand) : TEXTES.jamais },
        { label: TEXTES.etat.reponse, value: reponseDuHook(TEXTES, etat.dernier) },
        { label: TEXTES.etat.objets, value: caches.objets ? TEXTES.etat.configure(caches.objets) : TEXTES.etat.nonConfigure },
        { label: TEXTES.etat.routes, value: caches.routes ? TEXTES.etat.configure(caches.routes) : TEXTES.etat.nonConfigure },
      ],
    },
    ...preuve(TEXTES, heure, etat.dernier),
    { type: "divider" },
    { type: "header", text: TEXTES.journal.titre },
    {
      type: "table",
      page_action_id: "journal",
      empty_text: TEXTES.journal.vide,
      columns: [
        { key: "quand", label: TEXTES.journal.quand },
        { key: "qui", label: TEXTES.journal.qui },
        { key: "caches", label: TEXTES.journal.caches },
        { key: "build", label: TEXTES.journal.build },
        { key: "code", label: TEXTES.journal.code },
      ],
      rows: etat.passages.map((passage) => ({
        quand: heure(passage.quand),
        qui: passage.qui,
        caches: passage.caches,
        build: libelleDuBuild(TEXTES, passage),
        code: passage.code === null ? "-" : String(passage.code),
      })),
    },
    { type: "context", text: TEXTES.journal.note(etat.adresseVersion, __ALOHA_BO_FUSEAU__) },
  ];
  return { blocks, ...(bandeau ? { toast: bandeau.toast } : {}) };
}
