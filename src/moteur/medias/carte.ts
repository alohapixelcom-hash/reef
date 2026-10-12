// src/moteur/medias/carte.ts - compose la carte "Photos" du tableau de bord en Block Kit : le bilan, le bouton du lot, les dernieres photos traitees.
//
// POURQUOI UNE CARTE ET PAS UN ECRAN : EmDash 0.38 ne laisse aucune extension
// ajouter un bouton a sa Mediatheque (PluginAdminConfig : pages, widgets,
// blocs, champs ; rien pour la Mediatheque). Un ecran "Medias" au rail
// doublerait l'ecran natif. La carte du tableau de bord ne double rien : elle
// dit ce qui a ete fait et porte le seul geste qui manque.
//
// Block Kit plutot que React, comme l'extension deployer : le back office la
// rend avec ses composants, aux couleurs du site, sans script de plus.
import type { Ligne } from "./base.ts";
import type { BilanDuLot } from "./lot.ts";
import { poids } from "./regles.ts";
import type { Textes } from "./textes";

type Bouton = { type: "button"; action_id: string; label: string; style?: "primary" | "secondary" };
type Bloc =
  | { type: "context"; text: string }
  | { type: "stats"; items: { label: string; value: string; description?: string }[] }
  | { type: "banner"; title?: string; description: string; variant: "default" | "alert" | "error" }
  | { type: "actions"; elements: Bouton[] }
  | { type: "section"; text: string }
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

export const ACTION_OPTIMISER = "optimiser";

export interface EtatDeLaCarte {
  langue: "fr" | "en";
  textes: Textes;
  /** La conversion a l'envoi est branchee (liant Images). */
  relie: boolean;
  /** Le lot peut reecrire les photos existantes (liant Images et seau R2 ou KV). */
  lotPossible: boolean;
  /** Vrai pour un role Editeur et plus : seul il voit le bouton. */
  peutOptimiser: boolean;
  faites: number;
  gagnes: number;
  restantes: number;
  lot: number;
  journal: Ligne[];
}

/** La raison d'une ligne, en mots du client ; une raison inconnue s'affiche telle quelle plutot que de disparaitre. */
function raison(t: Textes, detail: string | null): string {
  if (!detail) return "";
  const cle = detail.startsWith("champ-refuse") ? "champ-refuse" : detail.split(" ")[0];
  return t.raisons[cle] ?? t.raisons.echec;
}

function resultat(t: Textes, l: Ligne): string {
  if (l.etat === "fait") return t.resultat.fait(l.format ?? "");
  const pourquoi = raison(t, l.detail);
  const base = l.etat === "echec" ? t.resultat.echec : t.resultat.garde;
  return pourquoi ? `${base} (${pourquoi})` : base;
}

export function composer(e: EtatDeLaCarte, lot?: BilanDuLot | "refuse"): Reponse {
  const t = e.textes;
  const blocks: Bloc[] = [];
  if (!e.relie) blocks.push({ type: "banner", variant: "alert", title: t.nonRelie.titre, description: t.nonRelie.texte });
  if (lot === "refuse") blocks.push({ type: "banner", variant: "alert", description: t.refuse });
  else if (lot) blocks.push({ type: "banner", variant: lot.echecs ? "alert" : "default", description: t.lot(lot.faites, lot.gardees, lot.echecs) });
  blocks.push({
    type: "stats",
    items: [
      { label: t.stats.faites, value: String(e.faites) },
      { label: t.stats.gagne, value: e.gagnes > 0 ? poids(e.gagnes, e.langue) : "0" },
      { label: t.stats.restantes, value: String(e.restantes) },
    ],
  });
  if (e.restantes === 0) blocks.push({ type: "context", text: t.toutFait });
  else if (!e.peutOptimiser) blocks.push({ type: "context", text: t.reserve });
  else if (!e.lotPossible) {
    if (e.relie) blocks.push({ type: "context", text: t.lotIndisponible });
  } else {
    blocks.push({ type: "actions", elements: [{ type: "button", action_id: ACTION_OPTIMISER, label: t.bouton, style: "primary" }] });
    blocks.push({ type: "context", text: t.consigne(e.lot) });
  }
  blocks.push({ type: "section", text: t.journal.titre });
  blocks.push({
    type: "table",
    page_action_id: "journal-medias",
    empty_text: t.journal.vide,
    columns: [
      { key: "photo", label: t.journal.photo },
      { key: "resultat", label: t.journal.resultat, format: "badge" },
      { key: "poids", label: t.journal.poids },
    ],
    rows: e.journal.map((l) => ({
      photo: l.nom ?? "-",
      resultat: resultat(t, l),
      poids: l.avant && l.apres ? `${poids(l.avant, e.langue)} → ${poids(l.apres, e.langue)}` : l.avant ? poids(l.avant, e.langue) : "-",
    })),
  });
  return { blocks, ...(lot && lot !== "refuse" ? { toast: { message: t.toast, type: lot.echecs ? ("info" as const) : ("success" as const) } } : {}) };
}
