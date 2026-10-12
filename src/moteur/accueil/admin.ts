// src/moteur/accueil/admin.ts - la carte "tuiles" de la page d'accueil d'EmDash : lit le manifeste et les compteurs, rend les tuiles de tuiles.ts, et ramene la page a elles.
//
// REACT, SANS JSX, comme champs/admin.ts : le theme n'a ni reglage JSX ni
// ilot, et ce module ne part au navigateur que dans le paquet de
// l'administration. Aucune dependance nouvelle : ni @emdash-cms/admin (une
// dependance d'EmDash, pas des sites), ni kumo. Les liens sont donc de vrais
// liens : un clic recharge l'ecran vise, sans rien perdre.
//
// CE QUI EST LU, avec les droits de la personne connectee, chaque lecture
// pouvant echouer seule (droits d'editeur, hors ligne) sans rien casser :
//   - le manifeste d'EmDash (/_emdash/api/manifest) : quelles tuiles existent ;
//   - les messages non lus (route "non-lus" de la gestion) ;
//   - les commandes a preparer (route "tableau" de la boutique) ;
//   - l'activite recente (/_emdash/api/dashboard) : la derniere publication ;
//   - le plan du site (/sitemap-index.xml et les plans qu'il cite).
// Un nombre illisible laisse la tuile sans nombre, jamais a zero.
//
// LA PAGE. Les marques posees par ramenerLaPage() disent a accueil.css ou
// sont la colonne, la grille des cartes et la carte : sans elles (manifeste
// illisible), la page d'origine d'EmDash reste entiere.
import { createElement as h, type ReactElement, useEffect, useRef, useState } from "react";
import feuille from "./accueil.css?raw";
import { aLaPage, ADRESSE_DU_PLAN, adressesDuPlan, type Icone, type Manifeste, type Mesures, plansDeLIndex, type Tuile, tuilesDuSite } from "./tuiles";

const ADMIN = "/_emdash/admin";
const API = "/_emdash/api";

if (typeof document !== "undefined" && !document.querySelector("style[data-aloha-accueil]")) {
  const style = document.createElement("style");
  style.dataset.alohaAccueil = "";
  style.textContent = feuille.replace(/\/\*[\s\S]*?\*\//g, "");
  document.head.appendChild(style);
}

/** Une route d'EmDash ou d'une extension : ses donnees, ou null si elle refuse (droits, hors ligne). L'en-tete X-EmDash-Request est la garde anti-CSRF du moteur. */
async function lire<T>(adresse: string, corps?: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(adresse, {
      method: corps ? "POST" : "GET",
      credentials: "same-origin",
      headers: { "X-EmDash-Request": "1", ...(corps ? { "Content-Type": "application/json" } : {}) },
      ...(corps ? { body: JSON.stringify(corps) } : {}),
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** Le plan du site : le nombre d'adresses donnees aux moteurs, "absent" s'il ne repond pas, null s'il est illisible. */
async function lireLePlan(): Promise<Mesures["plan"]> {
  try {
    const r = await fetch(ADRESSE_DU_PLAN, { credentials: "same-origin" });
    if (r.status === 404) return "absent";
    if (!r.ok) return null;
    const xml = await r.text();
    const direct = adressesDuPlan(xml);
    if (direct !== null) return { adresses: direct };
    const plans = plansDeLIndex(xml).slice(0, 20);
    if (!plans.length) return null;
    let total = 0;
    for (const plan of plans) {
      const p = await fetch(plan, { credentials: "same-origin" });
      const n = p.ok ? adressesDuPlan(await p.text()) : null;
      if (n === null) return null;
      total += n;
    }
    return { adresses: total };
  } catch {
    return null;
  }
}

/** Les compteurs du site, lus en parallele ; chacun arrive quand il arrive. */
function lireLesMesures(m: Manifeste, poser: (partiel: Mesures) => void): void {
  if (aLaPage(m, "aloha-gestion", "/messages")) void lire<{ n: number }>(`${API}/plugins/aloha-gestion/non-lus`, {}).then((d) => poser({ nonLus: d ? d.n : null }));
  if (aLaPage(m, "aloha-commerce", "/commandes")) void lire<{ aPreparer: number }>(`${API}/plugins/aloha-commerce/tableau`, {}).then((d) => poser({ aPreparer: d ? d.aPreparer : null }));
  void lire<{ recentItems?: { id: string; collection: string; title: string; slug: string | null; status: string; updatedAt: string }[] }>(`${API}/dashboard`).then((d) => {
    const p = d?.recentItems?.find((i) => i.status === "published");
    poser({ publication: p ? { titre: p.title || p.slug || "", quand: p.updatedAt, collection: p.collection, id: p.id } : null });
  });
  void lireLePlan().then((plan) => poser({ plan }));
}

// Les icones : un trait, la couleur de l'accent, aucune pastille autour.
const TRACES: Record<Icone, string> = {
  messages: "M4 5h16v11H9l-5 4z",
  commandes: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  produit: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  ecrire: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  photos: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01",
  page: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  design: "M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1.1.2-2.2 1.4-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10zM7.5 12h.01M10 7.5h.01M15 7.5h.01",
  site: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  publier: "M12 16V4M7 9l5-5 5 5M4 20h16",
  publication: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  plan: "M4 6h16M4 12h16M4 18h10",
};

const icone = (nom: Icone): ReactElement =>
  h("svg", { className: "aa-icone", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true }, h("path", { d: TRACES[nom] }));

function tuile(t: Tuile): ReactElement {
  const adresse = t.externe ? t.vers : `${ADMIN}${t.vers}`;
  const nouvelOnglet = t.externe ? { target: "_blank", rel: "noopener" } : {};
  return h(
    "li",
    { key: t.id },
    h(
      "a",
      { className: `aa-tuile${t.attention ? " aa-tuile--attention" : ""}`, href: adresse, "data-tuile": t.id, ...nouvelOnglet },
      h("span", { className: "aa-tete" }, icone(t.icone), t.nombre !== undefined ? h("span", { className: "aa-nombre", "aria-hidden": true }, t.nombre > 999 ? "999+" : String(t.nombre)) : null),
      h("span", { className: "aa-titre" }, t.titre),
      h("span", { className: "aa-detail" }, t.detail),
    ),
  );
}

function rangee(id: string, titre: string, tuiles: Tuile[]): ReactElement | null {
  if (!tuiles.length) return null;
  return h("section", { className: `aa-rangee aa-rangee--${id}`, "aria-labelledby": `aa-${id}` }, h("h2", { id: `aa-${id}` }, titre), h("ul", { className: "aa-grille" }, tuiles.map(tuile)));
}

/**
 * Pose les marques que lit accueil.css, depuis la tuile vers le haut de la
 * page. Forme de Dashboard.tsx d'EmDash 0.38 : colonne .space-y-6 > grille
 * des cartes > carte > ... > la tuile. Une forme qui change (autre version
 * d'EmDash) ne trouve pas la colonne : rien n'est marque, la page reste.
 */
function ramenerLaPage(racine: HTMLElement): void {
  const colonne = racine.closest<HTMLElement>(".space-y-6");
  if (!colonne) return;
  let grille: HTMLElement | null = racine;
  while (grille && grille.parentElement !== colonne) grille = grille.parentElement;
  let carte: HTMLElement | null = racine;
  while (carte && carte.parentElement !== grille) carte = carte.parentElement;
  if (!grille || !carte || grille === racine || carte === racine) return;
  colonne.setAttribute("data-aloha-accueil", "");
  grille.setAttribute("data-aloha-accueil-grille", "");
  carte.setAttribute("data-aloha-accueil-carte", "");
  for (let e = racine.parentElement; e && e !== grille; e = e.parentElement) e.setAttribute("data-aloha-accueil-cadre", "");
  // L'intitule de la carte ("Votre site") : les rangees ont les leurs.
  for (const enfant of Array.from(carte.children)) if (!enfant.contains(racine)) enfant.setAttribute("data-aloha-accueil-masque", "");
}

export function Tuiles(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [manifeste, setManifeste] = useState<Manifeste | null | "echec">(null);
  const [mesures, setMesures] = useState<Mesures>({});

  useEffect(() => {
    let vivant = true;
    void lire<Manifeste>(`${API}/manifest`).then((m) => {
      if (!vivant) return;
      setManifeste(m ?? "echec");
      if (m) lireLesMesures(m, (partiel) => vivant && setMesures((avant) => ({ ...avant, ...partiel })));
    });
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    if (ref.current && manifeste && manifeste !== "echec") ramenerLaPage(ref.current);
  });

  if (manifeste === "echec") return h("p", { className: "aa-detail", role: "status" }, "Les raccourcis du tableau de bord n'ont pas pu se charger. Rechargez la page.");
  if (!manifeste) return h("div", { className: "aa-accueil aa-chargement", "aria-busy": true });
  const { actions, gestes, etat } = tuilesDuSite(manifeste, { ...mesures, maintenant: Date.now() });
  return h(
    "div",
    { className: "aa-accueil", ref },
    rangee("actions", "À traiter", actions),
    rangee("gestes", "Au quotidien", gestes),
    rangee("etat", "État du site", etat),
  );
}

/** Le module d'administration de l'extension : EmDash cherche la carte "tuiles" de identite.mjs sous `widgets`. */
export const widgets = { tuiles: Tuiles };
