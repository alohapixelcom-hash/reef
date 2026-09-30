// src/moteur/champs/admin.ts - les composants des champs "une entree d'une autre collection, choisie par son nom" et "plusieurs entrees, cochees par leur nom", rendus par l'ecran d'une entree du back office.
//
// REACT, SANS JSX, comme la carte du tableau de bord : le theme n'a ni reglage
// JSX ni ilot, et ce module ne part au navigateur que dans le paquet de
// l'administration.
//
// CE QU'IL MONTRE : une liste des entrees de la collection visee par le champ
// (options.collection de la graine), par leur NOM (champ name, sinon title,
// sinon l'adresse), dans la langue de l'entree qu'on edite. CE QU'IL RANGE :
// le groupe de traductions de l'entree choisie, c'est-a-dire l'identifiant de
// sa premiere version. Un meme choix vaut donc pour les deux langues d'un
// article, et le moteur le verifie comme toute reference (l'entree existe).
//
// Une valeur ancienne (l'adresse de l'entree) est
// reconnue et affichee par son nom : elle n'est remplacee que si la personne
// choisit autre chose.
//
// Les classes sont celles des champs de l'administration elle-meme (elles sont
// dans sa feuille) ; le dossier est exclu de la feuille du site (global.css).
import { createElement as h, type ReactElement, useEffect, useId, useState } from "react";
import { CHAMP_CACHE, CHAMP_ENTREE, CHAMP_ENTREES } from "./identite.mjs";

interface Proprietes {
  value: unknown;
  onChange: (valeur: unknown) => void;
  label: string;
  id: string;
  required?: boolean;
  options?: { collection?: unknown; aide?: unknown } | null;
}

interface Choix {
  valeur: string;
  nom: string;
  adresse: string;
  identifiant: string;
}

type Etat = { phase: "attente" } | { phase: "pret"; choix: Choix[] } | { phase: "echec" };

const francais = (): boolean => document.documentElement.lang.toLowerCase().startsWith("fr");

const MOTS = {
  fr: { attente: "Chargement de la liste", echec: "La liste n'a pas pu se charger. Rechargez la page.", choisir: "Choisissez dans la liste", introuvable: "Entrée retirée ou introuvable", vide: "La liste est vide : créez d'abord une entrée, puis revenez ici.", retirees: "Entrées retirées, gardées tant que vous n'enregistrez pas" },
  en: { attente: "Loading the list", echec: "The list could not be loaded. Reload the page.", choisir: "Choose from the list", introuvable: "Entry removed or not found", vide: "The list is empty: create an entry first, then come back here.", retirees: "Removed entries, kept until you save" },
};

const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** La langue de l'entree editee : ?locale= dans l'adresse de l'ecran, sinon celle par defaut du moteur. */
function langueEditee(): string | null {
  return new URLSearchParams(location.search).get("locale");
}

async function lireLesChoix(collection: string, signal: AbortSignal): Promise<Choix[]> {
  const choix: Choix[] = [];
  const langue = langueEditee();
  let curseur: string | null = null;
  for (let tour = 0; tour < 20; tour++) {
    const q = new URLSearchParams({ limit: "100" });
    if (langue) q.set("locale", langue);
    if (curseur) q.set("cursor", curseur);
    const reponse = await fetch(`/_emdash/api/content/${encodeURIComponent(collection)}?${q}`, { credentials: "same-origin", headers: { "X-EmDash-Request": "1" }, signal });
    if (!reponse.ok) throw new Error(String(reponse.status));
    const corps = (await reponse.json()) as { data?: { items?: Record<string, unknown>[]; nextCursor?: string | null } };
    for (const item of corps.data?.items ?? []) {
      const donnees = (item.data ?? {}) as Record<string, unknown>;
      const identifiant = texte(item.id);
      const adresse = texte(item.slug);
      choix.push({ valeur: texte(item.translationGroup) || identifiant, identifiant, adresse, nom: texte(donnees.name) || texte(donnees.title) || adresse || identifiant });
    }
    curseur = corps.data?.nextCursor ?? null;
    if (!curseur) break;
  }
  return choix.sort((a, b) => a.nom.localeCompare(b.nom));
}

/** Le choix qui correspond a la valeur rangee : groupe de traductions, identifiant ou ancienne adresse. */
export function choixDeLaValeur(choix: readonly Choix[], valeur: string): Choix | undefined {
  return choix.find((c) => c.valeur === valeur) ?? choix.find((c) => c.identifiant === valeur) ?? choix.find((c) => c.adresse === valeur);
}

function ChoixDUneEntree(p: Proprietes): ReactElement {
  const m = francais() ? MOTS.fr : MOTS.en;
  const collection = texte(p.options?.collection);
  const aideBrute = p.options?.aide as Record<string, unknown> | undefined;
  const aide = aideBrute ? texte(francais() ? aideBrute.fr : aideBrute.en) : "";
  const [etat, setEtat] = useState<Etat>({ phase: "attente" });
  const idAide = useId();

  useEffect(() => {
    if (!collection) return setEtat({ phase: "echec" });
    const abandon = new AbortController();
    lireLesChoix(collection, abandon.signal)
      .then((choix) => setEtat({ phase: "pret", choix }))
      .catch(() => {
        if (!abandon.signal.aborted) setEtat({ phase: "echec" });
      });
    return () => abandon.abort();
  }, [collection]);

  const valeur = texte(p.value);
  const enfants: ReactElement[] = [h("label", { key: "l", htmlFor: p.id, className: "text-sm font-medium mb-1.5 block" }, p.label)];
  if (aide) enfants.push(h("p", { key: "a", id: idAide, className: "text-sm text-kumo-subtle mb-1.5" }, aide));
  if (etat.phase !== "pret") {
    enfants.push(h("p", { key: "e", role: etat.phase === "echec" ? "alert" : "status", className: "text-sm text-kumo-subtle" }, etat.phase === "echec" ? m.echec : m.attente));
    return h("div", { "data-aloha-champ": CHAMP_ENTREE }, enfants);
  }
  if (etat.choix.length === 0) {
    enfants.push(h("p", { key: "v", role: "status", className: "text-sm text-kumo-subtle" }, m.vide));
    return h("div", { "data-aloha-champ": CHAMP_ENTREE }, enfants);
  }
  const actuel = valeur ? choixDeLaValeur(etat.choix, valeur) : undefined;
  const options: ReactElement[] = [];
  if (!actuel) options.push(h("option", { key: "_", value: "", disabled: p.required === true }, valeur ? m.introuvable : m.choisir));
  for (const c of etat.choix) options.push(h("option", { key: c.valeur, value: c.valeur }, c.nom));
  enfants.push(
    h(
      "select",
      {
        key: "s",
        id: p.id,
        required: p.required === true,
        value: actuel?.valeur ?? "",
        "aria-describedby": aide ? idAide : undefined,
        onChange: (e: { target: { value: string } }) => p.onChange(e.target.value),
        className: "flex w-full rounded-md border border-kumo-line bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-ring",
      },
      options,
    ),
  );
  return h("div", { "data-aloha-champ": CHAMP_ENTREE }, enfants);
}

/** Les valeurs rangees d'un champ a plusieurs entrees : une liste de textes, ou rien. */
export function valeursRangees(v: unknown): string[] {
  let liste: unknown = v;
  if (typeof v === "string") {
    try {
      liste = JSON.parse(v);
    } catch {
      liste = [];
    }
  }
  return Array.isArray(liste) ? liste.map(texte).filter(Boolean) : [];
}

/**
 * Plusieurs entrees d'une autre collection, cochees par leur nom. Une valeur
 * ancienne (l'adresse de l'entree) est reconnue ; en cochant ou decochant, la
 * liste est rangee en groupes de traductions. Une valeur qui ne correspond plus
 * a rien reste rangee (elle est dite a l'ecran) jusqu'au prochain changement.
 */
function ChoixDePlusieursEntrees(p: Proprietes): ReactElement {
  const m = francais() ? MOTS.fr : MOTS.en;
  const collection = texte(p.options?.collection);
  const aideBrute = p.options?.aide as Record<string, unknown> | undefined;
  const aide = aideBrute ? texte(francais() ? aideBrute.fr : aideBrute.en) : "";
  const [etat, setEtat] = useState<Etat>({ phase: "attente" });
  const idAide = useId();

  useEffect(() => {
    if (!collection) return setEtat({ phase: "echec" });
    const abandon = new AbortController();
    lireLesChoix(collection, abandon.signal)
      .then((choix) => setEtat({ phase: "pret", choix }))
      .catch(() => {
        if (!abandon.signal.aborted) setEtat({ phase: "echec" });
      });
    return () => abandon.abort();
  }, [collection]);

  const enfants: ReactElement[] = [h("p", { key: "l", id: p.id, className: "text-sm font-medium mb-1.5 block" }, p.label)];
  if (aide) enfants.push(h("p", { key: "a", id: idAide, className: "text-sm text-kumo-subtle mb-1.5" }, aide));
  if (etat.phase !== "pret" || etat.choix.length === 0) {
    const phrase = etat.phase === "echec" ? m.echec : etat.phase === "attente" ? m.attente : m.vide;
    enfants.push(h("p", { key: "e", role: etat.phase === "echec" ? "alert" : "status", className: "text-sm text-kumo-subtle" }, phrase));
    return h("div", { "data-aloha-champ": CHAMP_ENTREES }, enfants);
  }
  const rangees = valeursRangees(p.value);
  const cochees = new Set(rangees.map((v) => choixDeLaValeur(etat.choix, v)?.valeur).filter((v): v is string => Boolean(v)));
  const orphelines = rangees.filter((v) => !choixDeLaValeur(etat.choix, v));
  const basculer = (valeur: string, oui: boolean): void => {
    const suite = new Set(cochees);
    if (oui) suite.add(valeur);
    else suite.delete(valeur);
    p.onChange(etat.choix.filter((c) => suite.has(c.valeur)).map((c) => c.valeur));
  };
  const cases = etat.choix.map((c) =>
    h("label", { key: c.valeur, className: "flex items-center gap-2 text-sm py-1" }, [
      h("input", { key: "i", type: "checkbox", checked: cochees.has(c.valeur), onChange: (e: { target: { checked: boolean } }) => basculer(c.valeur, e.target.checked) }),
      h("span", { key: "n" }, c.nom),
    ]),
  );
  enfants.push(h("div", { key: "c", role: "group", "aria-labelledby": p.id, "aria-describedby": aide ? idAide : undefined, className: "rounded-md border border-kumo-line px-3 py-2" }, cases));
  if (orphelines.length) enfants.push(h("p", { key: "o", role: "status", className: "text-sm text-kumo-subtle mt-1.5" }, `${m.retirees} : ${orphelines.join(", ")}`));
  return h("div", { "data-aloha-champ": CHAMP_ENTREES }, enfants);
}

/** Un champ garde sans l'afficher (voir CHAMP_CACHE) : rien a l'ecran, la valeur n'est pas touchee. */
function Cache(): null {
  return null;
}

/** Ce que le back office attend d'un module d'administration : ses champs de saisie, par nom. */
export const fields = { [CHAMP_ENTREE]: ChoixDUneEntree, [CHAMP_ENTREES]: ChoixDePlusieursEntrees, [CHAMP_CACHE]: Cache };
