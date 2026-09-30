// src/moteur/extensions/gestion/journal.ts - le journal des courriels vu comme une liste a gerer : recherche, page suivante, suppression de lignes choisies.
//
// La table et son format sont ceux de l'extension Courriels (noyau/base.ts) :
// ce fichier ne fait que la lire autrement (recherche, decalage) et effacer
// les lignes choisies. Le renvoi passe par le canal, comme le bouton de
// l'ancien ecran (noyau/envoi.ts, renvoyer).
import { type Base, type Ligne, preparer, versLigne } from "../courriels/noyau/base.ts";
import type { Etat, Origine } from "../courriels/noyau/regles.ts";

export interface RechercheJournal {
  etat?: Etat | "";
  formulaire?: Origine | "";
  q?: string;
  depuis?: number;
  limite?: number;
}

export async function chercherDansLeJournal(base: Base, r: RechercheJournal): Promise<{ items: Ligne[]; suite: number | null; total: number }> {
  await preparer(base);
  const ou: string[] = [];
  const valeurs: unknown[] = [];
  if (r.etat) {
    ou.push("etat = ?");
    valeurs.push(r.etat);
  }
  if (r.formulaire) {
    ou.push("formulaire = ?");
    valeurs.push(r.formulaire);
  }
  const q = (r.q ?? "").trim().toLowerCase().slice(0, 120);
  if (q) {
    ou.push("(destinataire LIKE ? ESCAPE '\\' OR sujet LIKE ? ESCAPE '\\')");
    const m = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    valeurs.push(m, m);
  }
  const clause = ou.length ? `WHERE ${ou.join(" AND ")}` : "";
  const limite = Math.min(Math.max(r.limite ?? 50, 1), 5000);
  const depuis = Math.max(r.depuis ?? 0, 0);
  const brut = await base.lire(`SELECT * FROM courriels_journal ${clause} ORDER BY quand DESC, id DESC LIMIT ? OFFSET ?`, [...valeurs, limite + 1, depuis]);
  const [compte] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_journal ${clause}`, valeurs);
  return { items: brut.slice(0, limite).map(versLigne), suite: brut.length > limite ? depuis + limite : null, total: Number(compte?.n ?? 0) };
}

/** Efface des lignes du journal, par paquets (D1 limite les parametres) ; rend le nombre effacees. */
export async function effacerDuJournal(base: Base, ids: readonly string[]): Promise<number> {
  await preparer(base);
  let n = 0;
  for (let i = 0; i < ids.length; i += 90) {
    const paquet = ids.slice(i, i + 90);
    const marques = paquet.map(() => "?").join(", ");
    const [avant] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_journal WHERE id IN (${marques})`, paquet);
    await base.executer(`DELETE FROM courriels_journal WHERE id IN (${marques})`, paquet);
    n += Number(avant?.n ?? 0);
  }
  return n;
}
