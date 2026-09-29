// src/moteur/extensions/courriels/ecrans/reglages.ts - l'ecran "Reglages des courriels" : adresses, destinataires des formulaires, accuse de reception par langue, plafonds ; un seul bouton pour enregistrer, un pour annuler.
import { type ErreurDeReglage, type Formulaire, LANGUES, type Reglages, remplir } from "../noyau/regles.ts";
import { type Bloc, type Champ, date, type Reponse } from "./blocs.ts";
import type { Textes } from "./textes.fr.ts";

export const ACTIONS = { enregistrer: "reglages:enregistrer", annuler: "reglages:annuler" } as const;

/** Les valeurs d'un formulaire du back office, cle par cle, en reglages bruts pour lireReglages. Pur. */
export function versReglages(valeurs: Record<string, unknown>, formulaires: readonly Formulaire[]): Record<string, unknown> {
  const v = (cle: string) => valeurs[cle];
  const brut: Record<string, unknown> = {
    expediteur: v("expediteur") ?? "",
    nom: v("nom") ?? "",
    reponse: v("reponse") ?? "",
    destinataires: Object.fromEntries(formulaires.map((f) => [f, v(`dest_${f}`) ?? ""])),
    accuse: {
      actif: v("accuse_actif") === true,
      sujet: Object.fromEntries(LANGUES.map((l) => [l, v(`accuse_sujet_${l}`) ?? ""])),
      texte: Object.fromEntries(LANGUES.map((l) => [l, v(`accuse_texte_${l}`) ?? ""])),
    },
    plafonds: { heure: v("plafond_heure"), jour: v("plafond_jour"), destinataire: v("plafond_destinataire"), mois: v("plafond_mois") },
    cycle: v("cycle"),
  };
  return brut;
}

function champs(t: Textes, r: Reglages, formulaires: readonly Formulaire[], saisie: Record<string, unknown> | null, nomDuSite: string): Champ[] {
  // Apres un refus, le formulaire rend ce que la personne avait tape : rien
  // n'est a ressaisir, seule l'erreur est a corriger.
  const texte = (cle: string, valeur: string) => (saisie && typeof saisie[cle] === "string" ? (saisie[cle] as string) : valeur);
  const nombre = (cle: string, valeur: number) => (saisie && typeof saisie[cle] === "number" ? (saisie[cle] as number) : valeur);
  const accuse = saisie && typeof saisie.accuse_actif === "boolean" ? saisie.accuse_actif : r.accuse.actif;
  const siAccuse = { field: "accuse_actif", eq: true };
  return [
    { type: "text_input", action_id: "expediteur", label: t.reglages.expediteur, placeholder: `contact@${t.brancher.domaineExemple}`, initial_value: texte("expediteur", r.expediteur) },
    { type: "text_input", action_id: "nom", label: t.reglages.nom, placeholder: nomDuSite, initial_value: texte("nom", r.nom) },
    { type: "text_input", action_id: "reponse", label: t.reglages.reponse, initial_value: texte("reponse", r.reponse) },
    ...formulaires.map((f): Champ => ({ type: "text_input", action_id: `dest_${f}`, label: t.reglages.destinataire[f], placeholder: `vous@${t.brancher.domaineExemple}`, initial_value: texte(`dest_${f}`, r.destinataires[f]) })),
    { type: "toggle", action_id: "accuse_actif", label: t.reglages.accuse, description: t.reglages.accuseAide, initial_value: accuse },
    ...LANGUES.flatMap((l): Champ[] => [
      { type: "text_input", action_id: `accuse_sujet_${l}`, label: t.reglages.accuseSujet[l], initial_value: texte(`accuse_sujet_${l}`, r.accuse.sujet[l]), condition: siAccuse },
      { type: "text_input", action_id: `accuse_texte_${l}`, label: t.reglages.accuseTexte[l], multiline: true, initial_value: texte(`accuse_texte_${l}`, r.accuse.texte[l]), condition: siAccuse },
    ]),
    { type: "number_input", action_id: "plafond_heure", label: t.reglages.heure, min: 0, max: 100_000, initial_value: nombre("plafond_heure", r.plafonds.heure) },
    { type: "number_input", action_id: "plafond_jour", label: t.reglages.jour, min: 0, max: 100_000, initial_value: nombre("plafond_jour", r.plafonds.jour) },
    { type: "number_input", action_id: "plafond_destinataire", label: t.reglages.parDestinataire, min: 0, max: 100_000, initial_value: nombre("plafond_destinataire", r.plafonds.destinataire) },
    { type: "number_input", action_id: "plafond_mois", label: t.reglages.mois, min: 0, max: 100_000, initial_value: nombre("plafond_mois", r.plafonds.mois) },
    { type: "number_input", action_id: "cycle", label: t.reglages.cycle, min: 1, max: 28, initial_value: nombre("cycle", r.cycle) },
  ];
}

export function erreursEnClair(t: Textes, erreurs: ErreurDeReglage[]): string[] {
  const vues = new Set<string>();
  for (const e of erreurs) {
    if (e.champ === "expediteur" && e.raison === "messagerie") vues.add(t.reglages.erreurs.messagerie);
    else if (e.champ === "expediteur" || e.champ === "reponse" || e.champ === "plafonds" || e.champ === "cycle") vues.add(t.reglages.erreurs[e.champ]);
    else vues.add(e.raison === "trop" ? t.reglages.erreurs.trop(t.origines[e.champ]) : t.reglages.erreurs.adresse(t.origines[e.champ]));
  }
  return [...vues];
}

export interface DonneesReglages {
  reglages: Reglages;
  formulaires: readonly Formulaire[];
  nomDuSite: string;
  /** Ce qui avait ete tape, quand l'enregistrement a ete refuse. */
  saisie: Record<string, unknown> | null;
  bandeau?: Bloc;
  derniere: { quand: number; qui: string } | null;
}

export function reglages(t: Textes, d: DonneesReglages): Reponse {
  const r = d.reglages;
  const apercu = remplir(r.accuse.texte.fr, { nom: t.reglages.apercuVisiteur, site: r.nom || d.nomDuSite });
  const blocks: Bloc[] = [
    { type: "header", text: t.pages.reglages },
    { type: "section", text: t.reglages.intro },
    ...(d.bandeau ? [d.bandeau] : []),
    {
      // Un block_id neuf a chaque rendu : les champs du back office ne
      // relisent pas leur valeur initiale une fois montes.
      type: "form",
      block_id: `reglages-${Date.now()}`,
      fields: champs(t, r, d.formulaires, d.saisie, d.nomDuSite),
      submit: { label: t.reglages.enregistrer, action_id: ACTIONS.enregistrer },
    },
    { type: "actions", elements: [{ type: "button", action_id: ACTIONS.annuler, label: t.reglages.annuler, style: "secondary" }] },
  ];
  if (r.accuse.actif) blocks.push({ type: "accordion", label: t.reglages.apercu, blocks: [{ type: "code", code: apercu }] });
  if (d.derniere) blocks.push({ type: "context", text: t.reglages.derniere(date(t, d.derniere.quand), d.derniere.qui) });
  return { blocks };
}
