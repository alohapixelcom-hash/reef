// src/moteur/deployer/page.ts - compose la page "Mettre le site a jour" en Block Kit : pour le client le bouton, l'etat, la preuve et le journal en mots simples ; replie dessous, le detail technique.
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
import { DELAI_MS, FUSEAU_PAR_DEFAUT, heure as heureDuSite, type Hook, lireLeFuseau, secondes } from "./regles";
import { COMMANDE_DU_SECRET, type LangueDesTextes, type Textes, textesPour } from "./textes";

type Bouton = { type: "button"; action_id: string; label: string; style?: "primary" | "secondary" };
type Bloc =
  | { type: "header"; text: string }
  | { type: "section"; text: string }
  | { type: "context"; text: string }
  | { type: "divider" }
  | { type: "stats"; items: { label: string; value: string; description?: string }[] }
  | { type: "banner"; title?: string; description: string; variant: "default" | "alert" | "error" }
  | { type: "code"; code: string; language: "bash" }
  | { type: "actions"; elements: Bouton[] }
  | { type: "accordion"; label: string; blocks: Bloc[]; default_open?: boolean }
  | {
      type: "table";
      columns: { key: string; label: string; format?: "text" | "badge" | "code" }[];
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

/** Le resultat d'un clic en mots du client : lance, pas lance, trop rapproche, bouton pas relie. */
function resultatPourLeClient(TEXTES: Textes, passage: Passage): string {
  switch (passage.build) {
    case "declenche":
      return reussi(passage.code) ? TEXTES.resultats.fait : TEXTES.resultats.echec;
    case "injoignable":
      return TEXTES.resultats.echec;
    case "refuse":
      return TEXTES.resultats.refuse;
    case "sans-hook":
    case "hook-invalide":
      return TEXTES.resultats.nonRelie;
  }
}

/** Le meme resultat pour la personne qui a installe le site : le build et la reponse du hook. */
function libelleDuBuild(TEXTES: Textes, passage: Passage): string {
  if (passage.build === "declenche" && !reussi(passage.code)) return TEXTES.technique.build.rejete;
  return TEXTES.technique.build[passage.build];
}

/** Ce que le clic vient de faire, dit au client sans un mot technique ; le detail va dans la partie repliee. */
function bandeauDuClic(TEXTES: Textes, { passage, attente }: Resultat): { bloc: Bloc; detail: string | null; toast: Reponse["toast"] } {
  switch (passage.build) {
    case "declenche":
      return reussi(passage.code)
        ? {
            bloc: { type: "banner", variant: "default", description: TEXTES.clic.lance },
            detail: `${passage.caches} ${TEXTES.technique.resultat.declenche(passage.code)}`,
            toast: { message: TEXTES.toast.fait, type: "success" },
          }
        : {
            bloc: { type: "banner", variant: "error", description: TEXTES.clic.echec },
            detail: `${passage.caches} ${TEXTES.technique.resultat.rejete(passage.code ?? 0)}`,
            toast: { message: TEXTES.toast.echec, type: "error" },
          };
    case "injoignable":
      return {
        bloc: { type: "banner", variant: "error", description: TEXTES.clic.echec },
        detail: `${passage.caches} ${TEXTES.technique.resultat.injoignable}`,
        toast: { message: TEXTES.toast.echec, type: "error" },
      };
    case "refuse":
      return {
        bloc: { type: "banner", variant: "alert", description: TEXTES.clic.refuse(secondes(DELAI_MS - attente, "bas"), secondes(attente)) },
        detail: null,
        toast: { message: TEXTES.toast.refuse, type: "info" },
      };
    case "sans-hook":
    case "hook-invalide":
      return {
        bloc: { type: "banner", variant: "alert", description: TEXTES.clic.nonRelie },
        detail: passage.caches,
        toast: { message: TEXTES.toast.nonRelie, type: "info" },
      };
  }
}

/** La preuve, en mots du client : les pages servies sont-elles posterieures a la derniere demande reussie ? */
function preuve(TEXTES: Textes, heure: (iso: string) => string, dernier: Passage | null): { client: Bloc[]; technique: Bloc[] } {
  if (!dernier || dernier.build !== "declenche" || !reussi(dernier.code)) return { client: [], technique: [] };
  const construit = heure(versionServie.construit);
  const demande = heure(dernier.quand);
  return Date.parse(versionServie.construit) > Date.parse(dernier.quand)
    ? { client: [{ type: "banner", variant: "default", title: TEXTES.preuve.faitTitre, description: TEXTES.preuve.fait(construit, demande) }], technique: [] }
    : {
        client: [{ type: "banner", variant: "alert", title: TEXTES.preuve.attenteTitre, description: TEXTES.preuve.attente(demande) }],
        technique: [{ type: "context", text: TEXTES.technique.attente(construit) }],
      };
}

function avertissementDuHook(TEXTES: Textes, hook: Hook): { client: Bloc[]; technique: Bloc[] } {
  if (hook.etat === "pret") return { client: [], technique: [] };
  const absent = hook.etat === "absent";
  return {
    client: [{ type: "banner", variant: "alert", title: TEXTES.nonRelie.titre, description: TEXTES.nonRelie.texte }],
    technique: [
      {
        type: "banner",
        variant: "alert",
        title: absent ? TEXTES.technique.hook.absentTitre : TEXTES.technique.hook.invalideTitre,
        description: absent ? TEXTES.technique.hook.absent : TEXTES.technique.hook.invalide,
      },
      { type: "code", language: "bash", code: COMMANDE_DU_SECRET },
    ],
  };
}

function reponseDuHook(TEXTES: Textes, dernier: Passage | null): string {
  if (!dernier) return TEXTES.jamais;
  return dernier.code === null ? TEXTES.technique.sansReponse : TEXTES.technique.http(dernier.code);
}

/** Les caches reellement configures, par leur nom ; "Aucun" quand le site n'en a pas. */
function nomsDesCaches(TEXTES: Textes, caches: typeof __ALOHA_CACHES__): string {
  const noms = [caches.objets, caches.routes].filter((nom): nom is NonNullable<typeof nom> => nom !== null);
  return noms.length > 0 ? noms.join(" + ") : TEXTES.aucun;
}

// Le fuseau du site : un site qui ne fige pas __ALOHA_BO_FUSEAU__ lit l'heure
// de Paris au lieu de planter la page.
const FUSEAU = lireLeFuseau(typeof __ALOHA_BO_FUSEAU__ === "string" ? __ALOHA_BO_FUSEAU__ : FUSEAU_PAR_DEFAUT);

export function composer(etat: Etat, clic?: Resultat): Reponse {
  const TEXTES = textesPour(etat.langue);
  const heure = (iso: string): string => heureDuSite(iso, etat.langue, FUSEAU);
  const bandeau = clic ? bandeauDuClic(TEXTES, clic) : undefined;
  const caches = __ALOHA_CACHES__;
  const hook = avertissementDuHook(TEXTES, etat.hook);
  const laPreuve = preuve(TEXTES, heure, etat.dernier);
  // Le detail technique, replie : ce que la personne qui a installe le site
  // doit lire (le hook, la commande du secret, les caches, le journal complet).
  const technique: Bloc[] = [
    { type: "section", text: TEXTES.technique.intro },
    ...(bandeau?.detail ? [{ type: "context" as const, text: bandeau.detail }] : []),
    ...hook.technique,
    ...laPreuve.technique,
    {
      type: "stats",
      items: [
        { label: TEXTES.technique.version, value: versionServie.version, description: TEXTES.technique.construit(heure(versionServie.construit)) },
        {
          label: TEXTES.technique.dernier,
          value: reponseDuHook(TEXTES, etat.dernier),
          description: etat.dernier ? heure(etat.dernier.quand) : TEXTES.technique.aucunDeclenchement,
        },
        {
          label: TEXTES.technique.caches,
          value: nomsDesCaches(TEXTES, caches),
          description: TEXTES.technique.detailDesCaches(caches.objets ?? TEXTES.technique.nonConfigure, caches.routes ?? TEXTES.technique.nonConfigure),
        },
      ],
    },
    { type: "section", text: TEXTES.technique.journal.titre },
    {
      type: "table",
      page_action_id: "journal-technique",
      empty_text: TEXTES.journal.vide,
      columns: [
        { key: "quand", label: TEXTES.journal.quand },
        { key: "caches", label: TEXTES.technique.journal.caches },
        { key: "build", label: TEXTES.technique.journal.build, format: "badge" },
        { key: "code", label: TEXTES.technique.journal.code },
      ],
      rows: etat.passages.map((passage) => ({
        quand: heure(passage.quand),
        caches: passage.caches,
        build: libelleDuBuild(TEXTES, passage),
        code: passage.code === null ? "-" : String(passage.code),
      })),
    },
    { type: "context", text: TEXTES.technique.journal.note(etat.adresseVersion, FUSEAU) },
  ];
  const derniere = etat.passages[0] ?? null;
  const blocks: Bloc[] = [
    { type: "header", text: TEXTES.titre },
    { type: "section", text: TEXTES.intro },
    ...(bandeau ? [bandeau.bloc] : []),
    // Le clic vient de dire que le bouton n'est pas relie : l'avertissement
    // permanent le redirait juste dessous.
    ...(clic && (clic.passage.build === "sans-hook" || clic.passage.build === "hook-invalide") ? [] : hook.client),
    {
      type: "actions",
      elements: [
        { type: "button", action_id: ACTION_DEPLOYER, label: TEXTES.bouton, style: "primary" },
        { type: "button", action_id: ACTION_ACTUALISER, label: TEXTES.actualiser, style: "secondary" },
      ],
    },
    // Deux cartes pour le client : quand les pages ont ete refaites, et la
    // derniere demande. Les caches et la reponse du hook sont dans le detail.
    {
      type: "stats",
      items: [
        { label: TEXTES.etat.pages, value: heure(versionServie.construit), description: TEXTES.etat.version(versionServie.version) },
        {
          label: TEXTES.etat.demande,
          value: derniere ? resultatPourLeClient(TEXTES, derniere) : TEXTES.jamais,
          description: derniere ? `${heure(derniere.quand)}, ${derniere.qui}` : TEXTES.etat.aucuneDemande,
        },
      ],
    },
    ...laPreuve.client,
    { type: "header", text: TEXTES.journal.titre },
    {
      type: "table",
      page_action_id: "journal",
      empty_text: TEXTES.journal.vide,
      columns: [
        { key: "quand", label: TEXTES.journal.quand },
        { key: "qui", label: TEXTES.journal.qui },
        { key: "resultat", label: TEXTES.journal.resultat, format: "badge" },
      ],
      rows: etat.passages.map((passage) => ({ quand: heure(passage.quand), qui: passage.qui, resultat: resultatPourLeClient(TEXTES, passage) })),
    },
    { type: "accordion", label: TEXTES.technique.titre, default_open: false, blocks: technique },
  ];
  return { blocks, ...(bandeau ? { toast: bandeau.toast } : {}) };
}
