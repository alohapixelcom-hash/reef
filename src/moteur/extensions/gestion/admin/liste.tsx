// src/moteur/extensions/gestion/admin/liste.tsx - la liste a gerer de la maison : une case par ligne, "tout cocher", la barre des gestes de masse (avec confirmation et nombre), la recherche, l'export CSV.
/** @jsxImportSource react */
//
// UNE SEULE PIECE pour toutes les listes du back office (messages, abonnes,
// journal des courriels ; commandes, clients, stock et factures de la
// boutique) : si une liste sait le faire, toutes le savent.
//
// LA SELECTION survit a "Afficher la suite" et au rechargement apres un
// geste ; elle se vide quand les filtres changent (une case cochee qu'on ne
// voit plus serait un piege). "Selectionner les N" va chercher TOUTES les
// lignes qui correspondent (5 000 au plus), pas seulement celles affichees.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { csv, nomDuFichier } from "../regles.ts";
import { Avis, Bouton, type Confirmation, Fenetre, nombre, pluriel, telecharger, Tourne } from "./outils";

export interface Colonne<T> {
  cle: string;
  titre: string;
  rendu: (x: T) => ReactNode;
  /** La valeur exportee ; absente, la colonne n'est pas exportee. */
  csv?: (x: T) => unknown;
  /** Colonne principale : prend la place qui reste, et le titre de la ligne sur un telephone. */
  principale?: boolean;
  /** Exportee seulement, jamais affichee (le texte entier d'un message, par exemple). */
  cachee?: boolean;
  /** Un texte long qui se replie sur plusieurs lignes (la raison d'un refus). */
  repliable?: boolean;
}

export interface GesteDeMasse<T> {
  id: string;
  libelle: string;
  danger?: boolean;
  /** Le geste ne vaut que pour certaines lignes : les autres sont laissees de cote (et le nombre le dit). */
  pour?: (x: T) => boolean;
  /** La confirmation, avec le nombre de lignes concernees ; absente, le geste part tout de suite. */
  confirmer?: (n: number) => Confirmation;
  /** Le geste ; rend la phrase a afficher ("12 messages archivés."). */
  faire: (ids: string[]) => Promise<string>;
}

export interface ProprietesDeLaListe<T> {
  etiquette: string;
  items: T[];
  idDe: (x: T) => string;
  colonnes: Colonne<T>[];
  gestes: GesteDeMasse<T>[];
  total: number;
  charge: boolean;
  erreur: string | null;
  suite: boolean;
  continuer: () => void;
  recharger: () => void;
  tout: () => Promise<T[]>;
  /** Change quand les filtres changent : la selection est alors videe. */
  filtresCle: string;
  vide: { titre: string; texte?: ReactNode };
  outils?: ReactNode;
  exporter?: { prefixe: string };
  ouvrir?: (x: T) => void;
  ouverte?: string | null;
  /** Une selection imposee de l'exterieur ("Selectionner les suspects"). */
  selectionImposee?: { ids: string[]; lignes?: T[]; tour: number } | null;
  apres?: () => void;
}

const classeDe = (c: { principale?: boolean; repliable?: boolean }): string | undefined => (c.principale ? "gs-principale" : c.repliable ? "gs-repliable" : undefined);

export function ListeGeree<T>(p: ProprietesDeLaListe<T>) {
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  // Les lignes choisies hors de la page affichee ("Selectionner les N").
  const [horsPage, setHorsPage] = useState<Map<string, T>>(new Map());
  const [demande, setDemande] = useState<{ geste: GesteDeMasse<T>; ids: string[]; confirmation: Confirmation } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [avis, setAvis] = useState<{ ton: "succes" | "erreur" | "info"; texte: ReactNode } | null>(null);
  const [cherche, setCherche] = useState(false);

  useEffect(() => {
    setChoisis(new Set());
    setHorsPage(new Map());
  }, [p.filtresCle]);

  useEffect(() => {
    if (!p.selectionImposee) return;
    setChoisis(new Set(p.selectionImposee.ids));
    setHorsPage(new Map((p.selectionImposee.lignes ?? []).map((x) => [p.idDe(x), x])));
  }, [p.selectionImposee?.tour]);

  const parId = useMemo(() => {
    const m = new Map<string, T>(horsPage);
    for (const x of p.items) m.set(p.idDe(x), x);
    return m;
  }, [p.items, horsPage, p.idDe]);

  const affichesIds = p.items.map(p.idDe);
  const tousAffichesCoches = affichesIds.length > 0 && affichesIds.every((id) => choisis.has(id));
  const certains = affichesIds.some((id) => choisis.has(id));
  const n = choisis.size;
  const visibles = p.colonnes.filter((c) => !c.cachee);

  const basculer = (id: string) =>
    setChoisis((s) => {
      const t = new Set(s);
      if (t.has(id)) t.delete(id);
      else t.add(id);
      return t;
    });
  const basculerTout = () =>
    setChoisis((s) => {
      const t = new Set(s);
      if (tousAffichesCoches) for (const id of affichesIds) t.delete(id);
      else for (const id of affichesIds) t.add(id);
      return t;
    });
  const vider = () => {
    setChoisis(new Set());
    setHorsPage(new Map());
  };

  const toutSelectionner = async () => {
    setCherche(true);
    try {
      const tous = await p.tout();
      setHorsPage(new Map(tous.map((x) => [p.idDe(x), x])));
      setChoisis(new Set(tous.map(p.idDe)));
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setCherche(false);
    }
  };

  const lancer = (geste: GesteDeMasse<T>) => {
    const ids = [...choisis].filter((id) => {
      const x = parId.get(id);
      return !geste.pour || (x !== undefined && geste.pour(x));
    });
    if (ids.length === 0) {
      setAvis({ ton: "info", texte: `« ${geste.libelle} » ne vaut pour aucune des lignes cochées.` });
      return;
    }
    if (geste.confirmer) setDemande({ geste, ids, confirmation: geste.confirmer(ids.length) });
    else void executer(geste, ids);
  };

  const executer = async (geste: GesteDeMasse<T>, ids: string[]) => {
    setOccupe(true);
    try {
      const texte = await geste.faire(ids);
      const laisses = n - ids.length;
      setAvis({ ton: "succes", texte: laisses > 0 ? `${texte} ${pluriel(laisses, "ligne cochée n'était pas concernée", "lignes cochées n'étaient pas concernées")}.` : texte });
      vider();
      p.recharger();
      p.apres?.();
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setOccupe(false);
      setDemande(null);
    }
  };

  const exporter = async () => {
    if (!p.exporter) return;
    setCherche(true);
    try {
      const lignes = n > 0 ? [...choisis].map((id) => parId.get(id)).filter((x): x is T => x !== undefined) : await p.tout();
      const colonnes = p.colonnes.filter((c) => c.csv);
      telecharger(csv(colonnes.map((c) => c.titre), lignes.map((x) => colonnes.map((c) => c.csv!(x)))), nomDuFichier(p.exporter.prefixe, Date.now()));
      setAvis({ ton: "succes", texte: `${pluriel(lignes.length, "ligne exportée", "lignes exportées")} dans un fichier CSV (il s'ouvre avec Excel, Numbers ou LibreOffice).` });
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setCherche(false);
    }
  };

  return (
    <div className="gs-liste">
      <div className="gs-outils">
        {p.outils}
        {p.exporter ? (
          <Bouton variant="secondary" size="sm" onClick={() => void exporter()} loading={cherche && n === 0} disabled={p.total === 0}>
            {n > 0 ? `Exporter la sélection (${nombre(n)})` : "Exporter en CSV"}
          </Bouton>
        ) : null}
      </div>
      <Avis avis={avis} fermer={() => setAvis(null)} />
      {n > 0 ? (
        <div className="gs-masse" role="region" aria-label="Gestes sur la sélection">
          <strong className="gs-masse-compte">{pluriel(n, "ligne cochée", "lignes cochées")}</strong>
          {tousAffichesCoches && p.total > n ? (
            <button type="button" className="gs-lien" onClick={() => void toutSelectionner()} disabled={cherche}>
              Cocher les {nombre(p.total)} qui correspondent
            </button>
          ) : null}
          <span className="gs-masse-gestes">
            {p.gestes.map((g) => (
              <Bouton key={g.id} variant={g.danger ? "destructive" : "secondary"} size="sm" onClick={() => lancer(g)} disabled={occupe}>
                {g.libelle}
              </Bouton>
            ))}
            <Bouton variant="ghost" size="sm" onClick={vider} disabled={occupe}>
              Tout décocher
            </Bouton>
          </span>
        </div>
      ) : null}
      {p.erreur ? (
        <div className="gs-avis gs-avis--erreur" role="alert">
          <span>{p.erreur}</span>
          <Bouton variant="secondary" size="sm" onClick={p.recharger}>Réessayer</Bouton>
        </div>
      ) : null}
      {p.items.length ? (
        <div className="gs-defile">
        <table className="gs-table" aria-label={p.etiquette}>
          <thead>
            <tr>
              <th scope="col" className="gs-case">
                <input type="checkbox" aria-label="Tout cocher sur cette page" checked={tousAffichesCoches} ref={(el) => { if (el) el.indeterminate = certains && !tousAffichesCoches; }} onChange={basculerTout} />
              </th>
              {visibles.map((c) => (
                <th key={c.cle} scope="col" className={classeDe(c)}>{c.titre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.items.map((x) => {
              const id = p.idDe(x);
              return (
                <tr key={id} aria-selected={choisis.has(id)} aria-current={p.ouverte === id ? "true" : undefined} className={p.ouvrir ? "gs-ouvrable" : undefined} onClick={p.ouvrir ? (e) => { if (!(e.target as HTMLElement).closest("input, button, a")) p.ouvrir!(x); } : undefined}>
                  <td className="gs-case">
                    <input type="checkbox" aria-label="Cocher cette ligne" checked={choisis.has(id)} onChange={() => basculer(id)} />
                  </td>
                  {visibles.map((c) => (
                    <td key={c.cle} data-titre={c.titre} className={classeDe(c)}>{c.rendu(x)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : p.charge ? (
        <div className="gs-chargement" role="status" aria-live="polite"><Tourne /><span>Chargement…</span></div>
      ) : (
        <div className="gs-vide">
          <p className="gs-vide-titre">{p.vide.titre}</p>
          {p.vide.texte ? <p className="gs-vide-texte">{p.vide.texte}</p> : null}
        </div>
      )}
      <div className="gs-suite">
        <span>{p.items.length ? `${nombre(p.items.length)} sur ${pluriel(p.total, "ligne", "lignes")}` : ""}</span>
        {p.suite ? <Bouton variant="secondary" size="sm" loading={p.charge} onClick={p.continuer}>Afficher la suite</Bouton> : null}
      </div>
      <Fenetre demande={demande?.confirmation ?? null} occupe={occupe} annuler={() => setDemande(null)} confirmer={() => demande && void executer(demande.geste, demande.ids)} />
    </div>
  );
}
