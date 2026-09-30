// src/moteur/extensions/gestion/admin/outils.tsx - les pieces communes des ecrans de gestion : l'appel aux routes, la liste paginee, les formats francais, le telechargement d'un CSV, la fenetre de confirmation.
/** @jsxImportSource react */
//
// Les boutons sont a nous (classe gs-bouton), dessines avec les variables du
// back office : le paquet de ses composants n'est pas une dependance des
// themes, et sa variante rouge n'est pas dans la feuille compilee du back
// office. La mise en page est dans styles/*.css (classes gs-*), posee par
// admin.tsx.
import { useCallback, useEffect, useRef, useState, type MouseEventHandler, type ReactNode } from "react";

/** Un bouton du back office : principal, secondaire, discret ou rouge (geste qui efface). */
export function Bouton({ variant = "secondary", size, loading, disabled, onClick, title, children }: { variant?: "primary" | "secondary" | "ghost" | "destructive"; size?: "sm"; loading?: boolean; disabled?: boolean; onClick?: MouseEventHandler<HTMLButtonElement>; title?: string; children: ReactNode }) {
  return (
    <button type="button" className={`gs-bouton gs-bouton--${variant}${size ? " gs-bouton--petit" : ""}`} disabled={disabled || loading} aria-busy={loading || undefined} onClick={onClick} title={title}>
      {loading ? <span className="gs-tourne" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Le petit cercle qui tourne pendant un chargement. */
export const Tourne = () => <span className="gs-tourne" aria-hidden="true" />;

export const ID = "aloha-gestion";

/** Appelle une route d'une extension (Gestion par defaut). L'en-tete X-EmDash-Request est la garde anti-CSRF du moteur. */
export async function appeler<T>(route: string, corps: Record<string, unknown> = {}, extension = ID): Promise<T> {
  const reponse = await fetch(`/_emdash/api/plugins/${extension}/${route}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
    body: JSON.stringify(corps),
  });
  const json = (await reponse.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!reponse.ok || !json) throw new Error(json?.error?.message ?? `Le back office a répondu ${reponse.status}. Rechargez la page.`);
  return json.data as T;
}

export interface Page<T> {
  items: T[];
  /** Le decalage de la page suivante, ou le curseur d'une source distante. */
  suite: number | string | null;
  total: number;
}

/** Une liste paginee par decalage : la premiere page, puis "Afficher la suite". `extra` garde le reste de la reponse (compteurs). */
export function useListe<T>(route: string, filtres: Record<string, unknown>) {
  const cle = JSON.stringify(filtres);
  const [etat, setEtat] = useState<{ items: T[]; suite: number | string | null; total: number; extra: Record<string, unknown>; charge: boolean; erreur: string | null }>({ items: [], suite: null, total: 0, extra: {}, charge: true, erreur: null });
  const tour = useRef(0);
  const lire = useCallback(
    async (depuis: number | string | null) => {
      const moi = ++tour.current;
      setEtat((e) => ({ ...e, charge: true, erreur: null }));
      try {
        const page = await appeler<Page<T> & Record<string, unknown>>(route, { ...(JSON.parse(cle) as object), depuis: depuis ?? 0 });
        if (moi !== tour.current) return;
        const { items, suite, total, ...extra } = page;
        setEtat((e) => ({ items: depuis ? [...e.items, ...items] : items, suite, total, extra, charge: false, erreur: null }));
      } catch (e) {
        if (moi === tour.current) setEtat((s) => ({ ...s, charge: false, erreur: e instanceof Error ? e.message : String(e) }));
      }
    },
    [route, cle],
  );
  useEffect(() => {
    void lire(null);
  }, [lire]);
  /** Tout ce qui correspond aux filtres (export, "selectionner tout"), 5 000 lignes au plus. */
  const tout = useCallback(async () => (await appeler<Page<T>>(route, { ...(JSON.parse(cle) as object), tout: true })).items, [route, cle]);
  return { ...etat, recharger: () => lire(null), continuer: () => (etat.suite !== null ? lire(etat.suite) : undefined), tout };
}

/* --- Formats ------------------------------------------------------------- */

const jourHeure = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
export const date = (ms: number | null | undefined): string => (ms ? jourHeure.format(new Date(ms)) : "-");
const relatif = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** "il y a 3 heures" ; la date exacte au-dela d'un mois. */
export function depuis(ms: number | null | undefined): string {
  if (!ms) return "-";
  const ecart = (ms - Date.now()) / 1000;
  const pas: [number, Intl.RelativeTimeFormatUnit, number][] = [
    [60, "second", 1],
    [3600, "minute", 60],
    [86400, "hour", 3600],
    [86400 * 30, "day", 86400],
  ];
  for (const [limite, unite, diviseur] of pas) if (Math.abs(ecart) < limite) return relatif.format(Math.round(ecart / diviseur), unite);
  return date(ms);
}

export const nombre = (n: number): string => new Intl.NumberFormat("fr-FR").format(n);
export const pluriel = (n: number, un: string, plusieurs: string): string => `${nombre(n)} ${n > 1 ? plusieurs : un}`;

/** Fait telecharger un texte au navigateur, sans passer par le serveur. */
export function telecharger(contenu: string, nom: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* --- Briques ------------------------------------------------------------- */

export type Ton = "succes" | "attention" | "erreur" | "info" | "neutre";

export function Etiquette({ ton, children }: { ton: Ton; children: ReactNode }) {
  return <span className={`gs-etiquette gs-etiquette--${ton}`}>{children}</span>;
}

/** L'en-tete d'un ecran : le titre, une phrase qui dit a quoi il sert, et ses actions. */
export function Entete({ titre, chapeau, actions }: { titre: string; chapeau?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="gs-entete">
      <div>
        <h1 className="gs-titre">{titre}</h1>
        {chapeau ? <p className="gs-chapeau">{chapeau}</p> : null}
      </div>
      {actions ? <div className="gs-actions">{actions}</div> : null}
    </header>
  );
}

/** Un avis de resultat, annonce aux lecteurs d'ecran. */
export function Avis({ avis, fermer }: { avis: { ton: "succes" | "erreur" | "info"; texte: ReactNode } | null; fermer?: () => void }) {
  if (!avis) return null;
  return (
    <div className={`gs-avis gs-avis--${avis.ton}`} role={avis.ton === "erreur" ? "alert" : "status"}>
      <span>{avis.texte}</span>
      {fermer ? (
        <button type="button" className="gs-avis-fermer" onClick={fermer} aria-label="Fermer cet avis">
          ×
        </button>
      ) : null}
    </div>
  );
}

/** Une rangee de filtres a bascule, chacun avec son compteur. */
export function Filtres<V extends string>({ valeur, options, onChange, libelle }: { valeur: V; options: { valeur: V; libelle: string; compte?: number }[]; onChange: (v: V) => void; libelle: string }) {
  return (
    <div className="gs-filtres" role="radiogroup" aria-label={libelle}>
      {options.map((o) => (
        <button key={o.valeur} type="button" role="radio" aria-checked={o.valeur === valeur} className="gs-filtre" onClick={() => onChange(o.valeur)}>
          {o.libelle}
          {o.compte !== undefined ? <span className="gs-filtre-compte">{nombre(o.compte)}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Le champ de recherche : il attend que la frappe s'arrete (300 ms) avant de chercher. */
export function Recherche({ valeur, onChange, placeholder }: { valeur: string; onChange: (v: string) => void; placeholder: string }) {
  const [texte, setTexte] = useState(valeur);
  useEffect(() => setTexte(valeur), [valeur]);
  useEffect(() => {
    if (texte.trim() === valeur) return;
    const t = setTimeout(() => onChange(texte.trim()), 300);
    return () => clearTimeout(t);
  }, [texte, valeur, onChange]);
  return (
    <label className="gs-recherche">
      <span className="gs-masque">Rechercher</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m13.5 13.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input type="search" value={texte} placeholder={placeholder} onChange={(e) => setTexte(e.target.value)} />
    </label>
  );
}

export interface Confirmation {
  titre: string;
  texte: ReactNode;
  bouton: string;
  danger?: boolean;
}

/**
 * La fenetre qui demande de confirmer un geste : titre, ce qui va se passer
 * (avec le nombre), un bouton qui dit le geste et "Annuler". Echap annule.
 */
export function Fenetre({ demande, confirmer, annuler, occupe }: { demande: Confirmation | null; confirmer: () => void; annuler: () => void; occupe: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (demande && !d.open) d.showModal();
    if (!demande && d.open) d.close();
  }, [demande]);
  return (
    <dialog ref={ref} className="gs-fenetre" onCancel={(e) => { e.preventDefault(); if (!occupe) annuler(); }} aria-labelledby="gs-fenetre-titre">
      {demande ? (
        <div className="gs-fenetre-corps">
          <h2 id="gs-fenetre-titre" className="gs-fenetre-titre">{demande.titre}</h2>
          <div className="gs-fenetre-texte">{demande.texte}</div>
          <div className="gs-fenetre-gestes">
            <Bouton variant="secondary" onClick={annuler} disabled={occupe}>
              Annuler
            </Bouton>
            <Bouton variant={demande.danger ? "destructive" : "primary"} onClick={confirmer} loading={occupe}>
              {demande.bouton}
            </Bouton>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
