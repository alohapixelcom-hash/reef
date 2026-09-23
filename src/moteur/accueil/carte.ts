// src/moteur/accueil/carte.ts - le composant React de la carte du site, rendu par le tableau de bord du back office.
//
// REACT, SANS JSX : le back office est une application React, et cette carte
// est le seul composant que le theme lui ajoute. Ecrit avec createElement, il
// ne demande ni reglage JSX ni fichier .tsx au theme, qui n'a par ailleurs
// aucun ilot. Il ne part au navigateur que dans le paquet de l'administration.
//
// Ses classes (aloha-carte...) sont habillees par ../back-office.css, avec les
// jetons du theme : aucune couleur n'est ecrite ici.
import { createElement as h, type ReactElement, useEffect, useState } from "react";
import type { EtatDuSite } from "./extension";
import { CARTE, IDENTITE } from "./identite.mjs";

const ROUTE = `/_emdash/api/plugins/${IDENTITE.id}/etat`;

type Chargement = { phase: "attente" } | { phase: "pret"; etat: EtatDuSite } | { phase: "echec" };

/** Les deux seules phrases que la route ne peut pas fournir : celles d'avant sa reponse. */
function secours(): { attente: string; echec: string } {
  return document.documentElement.lang.toLowerCase().startsWith("fr")
    ? { attente: "Chargement de l'état du site", echec: "L'état du site n'a pas pu être lu." }
    : { attente: "Loading the state of the site", echec: "The state of the site could not be read." };
}

function Fait({ libelle, valeur, detail }: { libelle: string; valeur: ReactElement | string; detail?: string }): ReactElement {
  return h(
    "div",
    { className: "aloha-carte-fait" },
    h("dt", null, libelle),
    h("dd", null, h("span", { className: "aloha-carte-valeur" }, valeur), detail ? h("span", { className: "aloha-carte-detail" }, detail) : null),
  );
}

function CarteDuSite(): ReactElement {
  const [chargement, setChargement] = useState<Chargement>({ phase: "attente" });

  useEffect(() => {
    const abandon = new AbortController();
    fetch(ROUTE, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
      body: "{}",
      signal: abandon.signal,
    })
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error(String(reponse.status));
        const corps = (await reponse.json()) as { data: EtatDuSite };
        setChargement({ phase: "pret", etat: corps.data });
      })
      .catch(() => {
        if (!abandon.signal.aborted) setChargement({ phase: "echec" });
      });
    return () => abandon.abort();
  }, []);

  if (chargement.phase === "attente") {
    return h("p", { className: "aloha-carte-attente", role: "status" }, secours().attente);
  }
  if (chargement.phase === "echec") {
    return h("p", { className: "aloha-carte-attente", role: "alert" }, secours().echec);
  }

  const { dernier, version, construit, liens, textes } = chargement.etat;
  return h(
    "div",
    { className: "aloha-carte" },
    h(
      "dl",
      { className: "aloha-carte-faits" },
      h(Fait, {
        libelle: textes.dernier,
        valeur: dernier ? h("a", { href: dernier.edition }, dernier.titre) : textes.aucun,
        detail: dernier ? [dernier.quand, dernier.collection, dernier.langue?.toUpperCase()].filter(Boolean).join(" · ") : undefined,
      }),
      h(Fait, { libelle: textes.version, valeur: version, detail: construit }),
    ),
    h(
      "div",
      { className: "aloha-carte-actions" },
      h(
        "a",
        { className: "aloha-bouton aloha-bouton-plein", href: liens.site, target: "_blank", rel: "noopener" },
        textes.voir,
        h("span", { className: "aloha-hors-ecran" }, ` (${textes.nouvelOnglet})`),
      ),
      h("a", { className: "aloha-bouton", href: liens.deployer }, textes.deployer),
    ),
  );
}

/** Ce que le back office attend d'un module d'administration : ses cartes, par identifiant. */
export const widgets = { [CARTE]: CarteDuSite };
