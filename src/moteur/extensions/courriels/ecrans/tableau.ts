// src/moteur/extensions/courriels/ecrans/tableau.ts - l'ecran "Courriels" : l'etat du branchement, les tuiles du mois, la jauge du forfait, les derniers envois ; et la carte de l'accueil du back office.
import { IDENTITE } from "../identite.mjs";
import type { Bilan, Ligne } from "../noyau/base.ts";
import { manques } from "../noyau/envoi.ts";
import { depassement, finDuCycle, INCLUS_PAR_MOIS, masquer, type Reglages } from "../noyau/regles.ts";
import { type Bloc, depuis, jour, type Reponse } from "./blocs.ts";
import { colonnes, rangee } from "./journal.ts";
import type { Textes } from "./textes.fr.ts";

export const ACTION_ACTUALISER = "tableau:actualiser";

export interface DonneesTableau {
  reglages: Reglages;
  liaison: boolean;
  /** Le fournisseur choisi dans Reglages > Courriels (null : aucun, ou inconnu). */
  livreur: string | null;
  bilan: Bilan;
  derniers: Ligne[];
  /** Les envois refuses du mois qu'aucun renvoi n'a rattrapes (echecsEnAttente). */
  echecs?: Ligne[];
  maintenant: number;
}

/** La carte rouge d'un courriel qui n'est pas parti ; celle d'une commande le dit en premier. */
function alerteDesEchecs(t: Textes, d: DonneesTableau): Bloc[] {
  const echecs = d.echecs ?? [];
  if (echecs.length === 0) return [];
  const commande = echecs.some((l) => l.formulaire === "commande");
  return [{ type: "banner", variant: "error", title: t.tableau.echecsTitre(echecs.length), description: commande ? t.tableau.echecCommande : t.tableau.echecAutre }];
}

const manquesDe = (d: DonneesTableau) => manques(d.reglages, d.liaison, d.livreur === IDENTITE.id);

function etatDuBranchement(t: Textes, d: DonneesTableau): Bloc {
  const manque = manquesDe(d);
  if (manque.length === 0) {
    return { type: "banner", variant: "default", title: t.tableau.pretTitre, description: t.tableau.pret(masquer(d.reglages.destinataires.contact)) };
  }
  return { type: "banner", variant: "alert", title: t.tableau.incompletTitre, description: t.tableau.incomplet(manque.map((m) => t.tableau.manques[m])) };
}

/** La jauge du forfait : la part des 3 000 envois inclus deja consommee par ce site. */
function jauge(t: Textes, envoyes: number): Bloc {
  const part = (envoyes / INCLUS_PAR_MOIS) * 100;
  return { type: "meter", label: t.tableau.jauge(envoyes, INCLUS_PAR_MOIS), value: Math.min(envoyes, INCLUS_PAR_MOIS), max: INCLUS_PAR_MOIS, custom_value: t.tableau.pourcent(part) };
}

export function tableau(t: Textes, d: DonneesTableau): Reponse {
  const { bilan } = d;
  const pret = manquesDe(d).length === 0;
  const au_dela = depassement(bilan.envoyes);
  const blocks: Bloc[] = [
    { type: "header", text: t.pages.tableau },
    { type: "section", text: t.tableau.intro },
    ...alerteDesEchecs(t, d),
    etatDuBranchement(t, d),
    // Deux rangees de deux tuiles : sur un telephone, quatre tuiles cote a
    // cote ne laisseraient pas la place a un chiffre.
    {
      type: "stats",
      items: [
        { label: t.tableau.envoyes, value: bilan.envoyes, description: t.tableau.surInclus(INCLUS_PAR_MOIS) },
        { label: t.tableau.echecs, value: bilan.echecs + bilan.plafonnes, description: t.tableau.echecsDetail(bilan.echecs, bilan.plafonnes) },
      ],
    },
    {
      type: "stats",
      items: [
        {
          label: t.tableau.dernier,
          value: depuis(t, bilan.dernierEnvoye?.quand ?? null, d.maintenant),
          ...(bilan.dernierEnvoye ? { description: t.origines[bilan.dernierEnvoye.formulaire] } : {}),
        },
        { label: t.tableau.branchement, value: pret ? t.tableau.branchementPret : t.tableau.branchementIncomplet, description: t.tableau.branchementDetail(d.liaison) },
      ],
    },
    jauge(t, bilan.envoyes),
    { type: "context", text: t.tableau.cycle(jour(t, finDuCycle(d.maintenant, d.reglages.cycle))) },
  ];
  if (au_dela.au_dela > 0) {
    blocks.push({ type: "banner", variant: "alert", description: t.tableau.depasse(au_dela.au_dela, au_dela.dollars.toFixed(2)) });
  }
  if (bilan.plafonnes > 0) {
    blocks.push({ type: "banner", variant: "alert", title: t.tableau.plafonnesTitre, description: t.tableau.plafonnes(bilan.plafonnes) });
  }
  blocks.push(
    { type: "divider" },
    { type: "section", text: t.tableau.derniers, accessory: { type: "button", action_id: ACTION_ACTUALISER, label: t.actualiser, style: "secondary" } },
    { type: "table", page_action_id: "tableau:table", empty_text: t.tableau.vide, columns: colonnes(t, false), rows: d.derniers.map((l) => rangee(t, l, d.maintenant)) },
  );
  return { blocks };
}

/** La carte de l'accueil du back office : la jauge et l'etat, rien d'autre. */
export function carte(t: Textes, d: DonneesTableau): Reponse {
  return {
    blocks: [
      ...alerteDesEchecs(t, d),
      jauge(t, d.bilan.envoyes),
      { type: "context", text: t.tableau.carte(depuis(t, d.bilan.dernierEnvoye?.quand ?? null, d.maintenant), manquesDe(d).length ? t.tableau.incompletTitre : t.tableau.pretTitre) },
    ],
  };
}
