// src/moteur/extensions/courriels/ecrans/journal.ts - l'ecran "Journal des courriels" : les filtres, le tableau des envois, le detail d'un envoi et son bouton "Renvoyer".
//
// Block Kit 0.38 n'a pas de ligne de tableau cliquable : le detail s'ouvre par
// la liste "Voir un envoi", qui reprend les lignes affichees. Sa liste
// deroulante affiche la VALEUR choisie, pas le libelle (defaut du composant
// d'EmDash 0.38) : chaque valeur est donc un libelle lisible ("Tous", "Envoye",
// "28 sept. 2026, 17:51 · Formulaire de contact · Envoye"), et la vue garde la
// table libelle vers identifiant. Aucun identifiant technique a l'ecran. L'etat de l'ecran
// (filtres, nombre de lignes, envoi ouvert) est garde par personne dans le KV
// de l'extension : il survit a un rechargement, et deux personnes ne se
// marchent pas dessus.
import type { Ligne } from "../noyau/base.ts";
import { erreurEnClair } from "../noyau/envoi.ts";
import { type Etat, ETATS, type Formulaire, masquer, type Origine, ORIGINES } from "../noyau/regles.ts";
import { type Bloc, date, dateCourte, depuis, type Reponse } from "./blocs.ts";
import type { Textes } from "./textes.fr.ts";

export const ACTIONS = {
  etat: "journal:etat",
  formulaire: "journal:formulaire",
  plus: "journal:plus",
  voir: "journal:voir",
  renvoyer: "journal:renvoyer",
  actualiser: "journal:actualiser",
} as const;

const PAS = 25;
const MAX = 200;

export interface Vue {
  etat: Etat | "";
  formulaire: Origine | "";
  limite: number;
  choisi: string | null;
  /** Libelle affiche dans "Voir un envoi" vers identifiant de ligne. */
  index: Record<string, string>;
}

export const VUE_PAR_DEFAUT: Vue = { etat: "", formulaire: "", limite: PAS, choisi: null, index: {} };

function lireIndex(brut: unknown): Record<string, string> {
  if (typeof brut !== "object" || brut === null) return {};
  const propre: Record<string, string> = {};
  for (const [libelle, id] of Object.entries(brut).slice(0, MAX + 1)) if (typeof id === "string" && id.length <= 80 && libelle.length <= 200) propre[libelle] = id;
  return propre;
}

/** Relit une vue gardee sans lui faire confiance. */
export function lireVue(brut: unknown): Vue {
  const v = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : {};
  return {
    etat: (ETATS as readonly string[]).includes(String(v.etat)) ? (v.etat as Etat) : "",
    formulaire: typeof v.formulaire === "string" && /^[a-z]{1,20}$/.test(v.formulaire) ? (v.formulaire as Origine) : "",
    limite: typeof v.limite === "number" && v.limite >= PAS && v.limite <= MAX ? v.limite : PAS,
    choisi: typeof v.choisi === "string" && v.choisi.length <= 80 ? v.choisi : null,
    index: lireIndex(v.index),
  };
}

/** La vue apres un clic. Les listes rendent leur libelle (voir en tete) : on le retraduit. Pur : `pnpm test` le verifie. */
export function appliquer(t: Textes, vue: Vue, action: string, valeur: unknown): Vue {
  const texte = typeof valeur === "string" ? valeur : "";
  switch (action) {
    case ACTIONS.etat:
      return { ...vue, etat: ETATS.find((e) => t.etats[e] === texte || e === texte) ?? "", limite: PAS };
    case ACTIONS.formulaire:
      return { ...vue, formulaire: ORIGINES.find((o) => t.origines[o] === texte || o === texte) ?? "", limite: PAS };
    case ACTIONS.plus:
      return { ...vue, limite: Math.min(vue.limite + PAS, MAX) };
    case ACTIONS.voir:
      return { ...vue, choisi: vue.index[texte] ?? null };
    default:
      return vue;
  }
}

/** Les colonnes du tableau des envois ; trois seulement pour les cinq derniers du tableau de bord, qui doivent tenir sur un telephone. */
export function colonnes(t: Textes, complet = true): { key: string; label: string; format?: "badge" }[] {
  return [
    { key: "quand", label: t.colonnes.quand },
    { key: "formulaire", label: t.colonnes.formulaire },
    ...(complet ? [{ key: "destinataire", label: t.colonnes.destinataire }, { key: "sujet", label: t.colonnes.sujet }] : []),
    { key: "etat", label: t.colonnes.etat, format: "badge" as const },
    ...(complet ? [{ key: "motif", label: t.colonnes.motif }] : []),
  ];
}

export function rangee(t: Textes, l: Ligne, maintenant: number): Record<string, string> {
  return {
    quand: depuis(t, l.quand, maintenant),
    formulaire: t.origines[l.formulaire] ?? l.formulaire,
    destinataire: l.destinataire === "-" ? "-" : masquer(l.destinataire),
    sujet: l.sujet.length > 60 ? `${l.sujet.slice(0, 57)}...` : l.sujet,
    etat: t.etats[l.etat] ?? l.etat,
    // La raison d'un refus en toutes lettres, dans la ligne meme.
    motif: l.etat === "envoye" ? "" : (erreurEnClair(t, l.code) ?? l.erreur ?? ""),
  };
}

/** Ce qui a livre, en clair : Cloudflare, la console d'EmDash en developpement, ou rien. */
export function nomDuFournisseur(t: Textes, fournisseur: string): string {
  if (fournisseur === "cloudflare") return "Cloudflare Email Sending";
  if (fournisseur === "emdash-console-email") return t.brancher.console;
  if (fournisseur === "aucun") return "-";
  return fournisseur;
}

function detail(t: Textes, l: Ligne, origine: Ligne | null): Bloc[] {
  const vers = l.destinataire === "-" ? "-" : masquer(l.destinataire);
  const erreur = erreurEnClair(t, l.code) ?? l.erreur;
  // Des tuiles plutot qu'une grille de champs : le composant des champs
  // d'EmDash tronque chaque valeur, et un sujet coupe a 390 px ne se lit plus.
  const passe = [l.fournisseur === "aucun" ? "" : t.journal.fournisseur(nomDuFournisseur(t, l.fournisseur)), origine ? t.journal.renvoiDe(date(t, origine.quand)) : ""].filter(Boolean).join(" ");
  const blocs: Bloc[] = [
    { type: "header", text: t.journal.detail },
    { type: "stats", items: [{ label: t.colonnes.quand, value: date(t, l.quand) }, { label: t.colonnes.etat, value: t.etats[l.etat] ?? l.etat }] },
    { type: "stats", items: [{ label: t.colonnes.formulaire, value: t.origines[l.formulaire] ?? l.formulaire }, { label: t.colonnes.destinataire, value: vers }] },
    { type: "section", text: `${t.colonnes.sujet} : ${l.sujet}` },
    ...(passe ? [{ type: "context" as const, text: passe }] : []),
  ];
  if (l.etat !== "envoye" && erreur) blocs.push({ type: "banner", variant: l.etat === "plafonne" ? "alert" : "error", title: t.journal.quoiFaire, description: erreur });
  if (l.message) {
    blocs.push({ type: "accordion", label: t.journal.contenu, blocks: [{ type: "code", code: l.message.texte }, ...(l.identifiant ? [{ type: "context" as const, text: t.journal.identifiant(l.identifiant) }] : [])] });
    blocs.push({
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: ACTIONS.renvoyer,
          label: t.journal.renvoyer,
          style: l.etat === "envoye" ? "secondary" : "primary",
          value: l.id,
          confirm: { title: t.journal.confirmerTitre, text: t.journal.confirmer(vers), confirm: t.journal.oui, deny: t.journal.non },
        },
      ],
    });
  } else {
    blocs.push({ type: "context", text: t.journal.sansContenu });
  }
  return blocs;
}

/**
 * Les libelles de "Voir un envoi", uniques : quand deux envois tombent la meme
 * minute avec le meme formulaire et le meme etat, le second prend " (2)".
 */
export function libellesDesEnvois(t: Textes, lignes: Ligne[]): { libelle: string; id: string }[] {
  const vus = new Map<string, number>();
  return lignes.map((l) => {
    const base = `${dateCourte(t, l.quand)} · ${t.originesCourtes[l.formulaire] ?? l.formulaire} · ${t.etatsCourts[l.etat] ?? l.etat}`;
    const n = (vus.get(base) ?? 0) + 1;
    vus.set(base, n);
    return { libelle: n === 1 ? base : `${base} (${n})`, id: l.id };
  });
}

/** Les envois proposes dans "Voir un envoi" : les lignes affichees, plus l'envoi ouvert s'il n'y est plus. */
export function envoisProposes(lignes: Ligne[], choisie: Ligne | null): Ligne[] {
  return [...(choisie && !lignes.some((l) => l.id === choisie.id) ? [choisie] : []), ...lignes];
}

export interface DonneesJournal {
  vue: Vue;
  lignes: Ligne[];
  choisie: Ligne | null;
  origineDuRenvoi: Ligne | null;
  formulaires: readonly Formulaire[];
  maintenant: number;
  /** Le resultat d'un renvoi, pose au-dessus du detail. */
  bandeau?: Bloc;
}

export function journal(t: Textes, d: DonneesJournal): Reponse {
  const { vue } = d;
  const origines: Origine[] = [...d.formulaires, "accuse", "essai", "systeme"];
  // Les listes deroulantes du back office ne relisent pas leur valeur
  // initiale une fois montees : un block_id qui suit l'etat les remonte.
  const cle = `${vue.etat}-${vue.formulaire}-${vue.limite}-${vue.choisi ?? ""}`;
  const blocks: Bloc[] = [
    { type: "header", text: t.pages.journal },
    { type: "section", text: t.journal.intro },
    {
      type: "actions",
      block_id: `filtres-${cle}`,
      elements: [
        {
          type: "select",
          action_id: ACTIONS.etat,
          label: t.journal.filtreEtat,
          initial_value: vue.etat ? t.etats[vue.etat] : t.journal.tous,
          options: [t.journal.tous, ...ETATS.map((e) => t.etats[e])].map((l) => ({ label: l, value: l })),
        },
        {
          type: "select",
          action_id: ACTIONS.formulaire,
          label: t.journal.filtreFormulaire,
          initial_value: vue.formulaire ? t.origines[vue.formulaire] : t.journal.tous,
          options: [t.journal.tous, ...origines.map((o) => t.origines[o])].map((l) => ({ label: l, value: l })),
        },
        { type: "button", action_id: ACTIONS.actualiser, label: t.actualiser, style: "secondary" },
      ],
    },
    { type: "table", page_action_id: "journal:table", empty_text: t.journal.vide, columns: colonnes(t), rows: d.lignes.map((l) => rangee(t, l, d.maintenant)) },
  ];
  if (d.lignes.length >= vue.limite && vue.limite < MAX) {
    blocks.push({ type: "actions", elements: [{ type: "button", action_id: ACTIONS.plus, label: t.journal.plus, style: "secondary" }] });
  }
  const libelles = libellesDesEnvois(t, envoisProposes(d.lignes, d.choisie));
  const ouvert = d.choisie ? libelles.find((l) => l.id === d.choisie!.id) : undefined;
  if (d.lignes.length > 0) {
    blocks.push(
      { type: "divider" },
      {
        type: "actions",
        block_id: `voir-${cle}`,
        elements: [
          {
            type: "select",
            action_id: ACTIONS.voir,
            label: t.journal.voir,
            ...(ouvert ? { initial_value: ouvert.libelle } : {}),
            options: libelles.map((l) => ({ label: l.libelle, value: l.libelle })),
          },
        ],
      },
    );
  }
  if (d.bandeau) blocks.push(d.bandeau);
  if (d.choisie) blocks.push(...detail(t, d.choisie, d.origineDuRenvoi));
  else if (vue.choisi) blocks.push({ type: "context", text: t.journal.introuvable });
  return { blocks };
}
