// src/moteur/maintenance/page.ts - compose la page "Maintenance" du back office en Block Kit : l'etat du site et un formulaire (interrupteur, titre, sous-titre, photo ou video de fond, date de retour).
//
// Block Kit, comme "Mettre le site a jour" (deployer/page.ts) : le back office
// la rend avec ses propres composants et l'habillage du theme. Le choix d'un
// media se fait dans une liste des photos et des videos de la mediatheque :
// l'element media_picker de Block Kit 0.38 n'est pas rendu dans une page
// d'extension (renderElement rend null). Pur : le dictionnaire et les listes
// arrivent en parametre, le self-check compose la page sans EmDash.
import type { FR } from "./textes.fr.ts";
import type { Reglages } from "./regles.ts";

type Textes = typeof FR;
type Option = { label: string; value: string };
type Condition = { field: string; eq: unknown };
type Champ =
  | { type: "toggle"; action_id: string; label: string; description?: string; initial_value?: boolean }
  | { type: "text_input"; action_id: string; label: string; placeholder?: string; initial_value?: string; multiline?: boolean }
  | { type: "radio"; action_id: string; label: string; options: Option[]; initial_value?: string }
  | { type: "select"; action_id: string; label: string; options: Option[]; initial_value?: string; condition?: Condition }
  | { type: "date_input"; action_id: string; label: string; initial_value?: string };
type Bouton = { type: "button"; action_id: string; label: string; style?: "primary" | "secondary" | "danger" };
type Bloc =
  | { type: "header"; text: string }
  | { type: "section"; text: string }
  | { type: "context"; text: string }
  | { type: "divider" }
  | { type: "banner"; title?: string; description: string; variant: "default" | "alert" | "error" }
  | { type: "fields"; fields: { label: string; value: string }[] }
  | { type: "form"; fields: Champ[]; submit: { label: string; action_id: string } }
  | { type: "actions"; elements: Bouton[] };

export interface Reponse {
  blocks: Bloc[];
  toast?: { message: string; type: "success" | "error" | "info" };
}

export const ACTION_ENREGISTRER = "enregistrer-la-maintenance";
export const ACTION_ACTUALISER = "actualiser";

/** Un media propose dans une liste : son identifiant et son nom de fichier. */
export interface MediaPropose {
  id: string;
  nom: string;
}

export interface Etat {
  /** Vrai quand le site est ferme aux visiteurs. */
  ferme: boolean;
  reglages: Reglages;
  images: MediaPropose[];
  videos: MediaPropose[];
}

/** Ce que le clic vient de faire. */
export type Geste = "ferme" | "rouvert" | "enregistre" | { erreur: string };

const options = (liste: MediaPropose[]): Option[] => liste.map((m) => ({ label: m.nom, value: m.id }));

export function composer(T: Textes, etat: Etat, geste?: Geste): Reponse {
  const F = T.formulaire;
  const r = etat.reglages;
  const champs: Champ[] = [
    { type: "toggle", action_id: "actif", label: F.actif, description: F.actifAide, initial_value: etat.ferme },
    { type: "text_input", action_id: "titre", label: F.titre, placeholder: F.titreExemple, initial_value: r.titre },
    { type: "text_input", action_id: "sousTitre", label: F.sousTitre, placeholder: F.sousTitreExemple, initial_value: r.sousTitre, multiline: true },
    {
      type: "radio",
      action_id: "fond",
      label: F.fond,
      initial_value: r.fond,
      options: [
        { label: F.fonds.aucun, value: "aucun" },
        { label: F.fonds.image, value: "image" },
        { label: F.fonds.video, value: "video" },
      ],
    },
  ];
  if (etat.images.length) champs.push({ type: "select", action_id: "image", label: F.image, options: options(etat.images), ...(r.image ? { initial_value: r.image } : {}), condition: { field: "fond", eq: "image" } });
  if (etat.videos.length) champs.push({ type: "select", action_id: "video", label: F.video, options: options(etat.videos), ...(r.video ? { initial_value: r.video } : {}), condition: { field: "fond", eq: "video" } });
  champs.push({ type: "date_input", action_id: "retour", label: F.retour, ...(r.retour ? { initial_value: r.retour } : {}) });

  const nomDu = (liste: MediaPropose[], id: string | null) => liste.find((m) => m.id === id)?.nom ?? T.recap.aucun;
  const fond = r.fond === "image" ? nomDu(etat.images, r.image) : r.fond === "video" ? nomDu(etat.videos, r.video) : F.fonds.aucun;
  const blocks: Bloc[] = [
    { type: "header", text: T.titre },
    { type: "section", text: T.intro },
    etat.ferme
      ? { type: "banner", variant: "alert", title: T.ferme.titre, description: T.ferme.texte }
      : { type: "banner", variant: "default", title: T.ouvert.titre, description: T.ouvert.texte },
  ];
  if (geste && typeof geste === "object") blocks.push({ type: "banner", variant: "error", description: geste.erreur });
  blocks.push(
    {
      type: "fields",
      fields: [
        { label: T.recap.titre, value: r.titre || T.recap.aucun },
        { label: T.recap.fond, value: fond },
        { label: T.recap.retour, value: r.retour ?? T.recap.aucun },
      ],
    },
    { type: "form", fields: champs, submit: { label: F.enregistrer, action_id: ACTION_ENREGISTRER } },
  );
  if (!etat.images.length) blocks.push({ type: "context", text: T.sansImage });
  if (!etat.videos.length) blocks.push({ type: "context", text: T.sansVideo });
  blocks.push({ type: "context", text: T.videoConseil });
  if (!r.titre) blocks.push({ type: "context", text: T.sansTitre });
  blocks.push({ type: "divider" }, { type: "actions", elements: [{ type: "button", action_id: ACTION_ACTUALISER, label: T.actualiser, style: "secondary" }] }, { type: "context", text: T.delai });

  if (!geste) return { blocks };
  if (typeof geste === "object") return { blocks, toast: { message: geste.erreur, type: "error" } };
  const message = geste === "ferme" ? T.toastFerme : geste === "rouvert" ? T.toastOuvert : T.toastEnregistre;
  return { blocks, toast: { message, type: "success" } };
}
