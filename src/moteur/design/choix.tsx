// src/moteur/design/choix.tsx - les controles de la page Design : une rangee de choix (boutons radio presentes en segments), les pastilles de couleur, et le choix d'une image de la mediatheque.
/** @jsxImportSource react */
//
// DE VRAIS BOUTONS RADIO. Chaque rangee est un groupe <fieldset> de boutons
// radio natifs : le clavier (fleches), le lecteur d'ecran et la cible de
// 44 px viennent de la plateforme. La presentation en segments est la feuille
// ecran.css, rien d'autre.
import { useState } from "react";
import type { ImageDuSite } from "./api.ts";

interface Segments {
  nom: string;
  titre: string;
  aide?: string;
  choix: readonly string[];
  valeur: string;
  /** Le choix qui vaut vide (le rendu d'origine) : il s'enregistre comme un champ vide. */
  vide: string;
  /** Le nom court affiche pour le choix vide quand sa valeur est longue (la valeur enregistree ne change pas). */
  nomDuVide?: string;
  /** Une pile de polices pour ecrire l'exemple du choix dans sa police. */
  exemple?: (v: string) => string | undefined;
  /** Dessine un coin dans chaque choix (rayons). */
  coin?: boolean;
  poser: (v: string | null) => void;
}

const COINS: Record<string, string> = { Net: "0.25rem", Doux: "0.75rem", Arrondi: "1.5rem" };

export function Segments({ nom, titre, aide, choix, valeur, vide, nomDuVide, exemple, coin, poser }: Segments) {
  return (
    <fieldset className="ds-rangee">
      <legend className="ds-legende">{titre}</legend>
      <div className="ds-segments">
        {choix.map((c) => {
          const police = exemple?.(c);
          return (
            <label key={c} className="ds-segment">
              <input type="radio" name={nom} value={c} checked={valeur === c} onChange={() => poser(c === vide ? null : c)} />
              <span className="ds-segment-texte">
                {coin && <span className="ds-coin" aria-hidden="true" style={{ borderTopLeftRadius: COINS[c] ?? "0.5rem" }} />}
                {police && (
                  <span className="ds-exemple" aria-hidden="true" style={{ fontFamily: police }}>
                    Aa
                  </span>
                )}
                {c === vide && nomDuVide ? nomDuVide : c}
              </span>
            </label>
          );
        })}
      </div>
      {aide && <p className="ds-aide">{aide}</p>}
    </fieldset>
  );
}

interface Pastilles {
  nom: string;
  choix: { valeur: string; teinte: number | null }[];
  valeur: string;
  vide: string;
  poser: (v: string | null) => void;
}

export function Pastilles({ nom, choix, valeur, vide, poser }: Pastilles) {
  return (
    <fieldset className="ds-rangee">
      <legend className="ds-masque">Couleur de la marque</legend>
      <div className="ds-pastilles">
        {choix.map(({ valeur: c, teinte }) => (
          <label key={c} className="ds-pastille">
            <input type="radio" name={nom} value={c} checked={valeur === c} onChange={() => poser(c === vide ? null : c)} />
            <span className={`ds-rond${teinte === null ? " ds-rond--origine" : ""}`} aria-hidden="true" style={teinte === null ? undefined : { background: `hsl(${teinte} 68% 42%)` }} />
            <span className="ds-pastille-nom">{c}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface Images {
  titre: string;
  aide: string;
  fond: "clair" | "sombre";
  images: ImageDuSite[];
  choisi: string | null;
  apercu: string | null;
  poser: (i: ImageDuSite | null) => void;
}

export function Images({ titre, aide, fond, images, choisi, apercu, poser }: Images) {
  const [ouvert, setOuvert] = useState(false);
  const courant = images.find((i) => i.id === choisi)?.url ?? apercu;
  return (
    <div className="ds-rangee">
      <p className="ds-legende">{titre}</p>
      <div className="ds-logo">
        <div className={`ds-logo-fond ds-logo-fond--${fond}`}>{courant ? <img src={courant} alt="" /> : <span className="ds-aide">Logo du thème</span>}</div>
        <div className="ds-logo-gestes">
          <button type="button" className="ds-bouton ds-bouton--second" aria-expanded={ouvert} disabled={!images.length} onClick={() => setOuvert(!ouvert)}>
            {ouvert ? "Fermer" : "Choisir dans la médiathèque"}
          </button>
          {(choisi || apercu) && (
            <button type="button" className="ds-bouton ds-bouton--second" onClick={() => (poser(null), setOuvert(false))}>
              Retirer
            </button>
          )}
        </div>
      </div>
      <p className="ds-aide">{aide}</p>
      {ouvert && (
        <ul className="ds-grille" aria-label={`Images de la médiathèque pour : ${titre}`}>
          {images.map((i) => (
            <li key={i.id}>
              <button type="button" className={`ds-vignette ds-logo-fond--${fond}`} aria-pressed={i.id === choisi} onClick={() => (poser(i), setOuvert(false))}>
                <img src={i.url} alt="" loading="lazy" />
                <span className="ds-masque">{i.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
