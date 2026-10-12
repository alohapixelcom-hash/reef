// src/moteur/seo/admin.tsx - l'ecran SEO du back office : robots.txt et llms.txt saisis et enregistres en base, et l'etat du plan du site.
/** @jsxImportSource react */
//
// EmDash importe ce module dans son application d'administration (adminEntry
// du descripteur) et monte l'ecran sous /_emdash/admin/plugins/aloha-seo. A
// l'import, il pose une fois sa feuille (classes seo-*, variables natives du
// back office : clair et sombre suivent le back office).
//
// UN SEUL ECRAN POUR CE QUI N'EN AVAIT PAS. llms.txt n'existait nulle part ;
// robots.txt est la meme valeur que Parametres > SEO d'EmDash (une seule
// source, les deux ecrans montrent toujours le meme texte), rangee ici a cote
// du plan du site qu'il annonce.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Audit } from "./audit.tsx";
import feuille from "./ecran.css?raw";

if (typeof document !== "undefined" && !document.querySelector("style[data-aloha-seo]")) {
  const style = document.createElement("style");
  style.dataset.alohaSeo = "";
  style.textContent = feuille.replace(/\/\*[\s\S]*?\*\//g, "");
  document.head.appendChild(style);
}

type Nom = "robots" | "llms";
interface Fichier {
  nom: Nom;
  texte: string | null;
  maj: number | null;
  par: string | null;
  modifieAilleurs: boolean;
  parDefaut: string | null;
}
interface Retrait {
  chemin: string;
  raison: string;
}
interface Plan {
  adresses: number;
  figees: number;
  duSite: number;
  deLaBase: number;
  derniereModification: string | null;
  manifeste: string | null;
  manquantes: string[];
  retirees: Retrait[];
  ecarteesAuBuild: Retrait[];
  changeLe: number;
}
interface Etat {
  origine: string;
  fichiers: Record<Nom, Fichier>;
  plan: Plan | null;
}

/** Les plafonds de fichiers.ts (LONGUEUR_MAX), recopies : ce module part dans le navigateur, sans le code serveur. */
const MAX: Record<Nom, number> = { robots: 5_000, llms: 64_000 };

/** Appelle une route de l'extension. L'en-tete X-EmDash-Request est la garde anti-CSRF du moteur. */
async function appeler(route: string, corps: Record<string, unknown> = {}): Promise<Etat> {
  const reponse = await fetch(`/_emdash/api/plugins/aloha-seo/${route}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
    body: JSON.stringify(corps),
  });
  const json = (await reponse.json().catch(() => null)) as { data?: Etat; error?: { message?: string } } | null;
  if (!reponse.ok || !json?.data) throw new Error(json?.error?.message ?? `Le back office a répondu ${reponse.status}. Rechargez la page.`);
  return json.data;
}

const jourHeure = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const date = (v: number | string | null | undefined): string => (v ? jourHeure.format(new Date(v)) : "-");
const nombre = (n: number): string => new Intl.NumberFormat("fr-FR").format(n);

const RAISONS: Record<string, string> = {
  noindex: "masquée aux moteurs (noindex)",
  redirigee: "redirigée ailleurs",
  "hors du plan": "écartée par le site",
  "canonique ailleurs": "sa page canonique est une autre adresse",
  redirection: "page de redirection",
  "exclue par le site": "écartée par le site",
};

function Bouton({ variante = "secondaire", occupe, desactive, onClick, children }: { variante?: "principal" | "secondaire" | "discret"; occupe?: boolean; desactive?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`seo-bouton seo-bouton--${variante}`} disabled={desactive || occupe} aria-busy={occupe || undefined} onClick={onClick}>
      {children}
    </button>
  );
}

const PRESENTATION: Record<Nom, { titre: string; aide: string; exemple: string }> = {
  robots: {
    titre: "robots.txt",
    aide: "Ce que les robots des moteurs de recherche ont le droit de lire. La ligne « Sitemap: » vers le plan du site est ajoutée si elle manque. Ce texte est le même que celui de Paramètres > SEO : les deux écrans modifient le même réglage.",
    exemple: "User-agent: *\nAllow: /",
  },
  llms: {
    titre: "llms.txt",
    aide: "La présentation du site aux assistants d'intelligence artificielle, en Markdown : le titre du site sur la première ligne, précédé de « # », puis les pages qui comptent.",
    exemple: "# Nom du site\n\n> Ce que fait le site, en une phrase.",
  },
};

function CarteDuFichier({ fichier, origine, surEtat }: { fichier: Fichier; origine: string; surEtat: (e: Etat) => void }) {
  const p = PRESENTATION[fichier.nom];
  const initial = fichier.texte ?? fichier.parDefaut ?? "";
  const [texte, setTexte] = useState(initial);
  const [occupe, setOccupe] = useState<"" | "enregistrer" | "defaut">("");
  const [avis, setAvis] = useState<{ ton: "succes" | "erreur"; texte: string } | null>(null);
  useEffect(() => setTexte(fichier.texte ?? fichier.parDefaut ?? ""), [fichier.texte, fichier.parDefaut]);
  const change = texte !== initial;
  const agir = async (geste: "enregistrer" | "defaut") => {
    if (geste === "defaut" && !window.confirm(`Revenir au texte par défaut du site pour ${p.titre} ? Le texte saisi ici sera effacé.`)) return;
    setOccupe(geste);
    setAvis(null);
    try {
      const e = await appeler(geste, geste === "enregistrer" ? { nom: fichier.nom, texte } : { nom: fichier.nom });
      surEtat(e);
      setAvis({ ton: "succes", texte: geste === "enregistrer" ? `${p.titre} est enregistré : le site le sert dès maintenant.` : `${p.titre} revient au texte par défaut du site.` });
    } catch (err) {
      setAvis({ ton: "erreur", texte: err instanceof Error ? err.message : String(err) });
    } finally {
      setOccupe("");
    }
  };
  const max = MAX[fichier.nom];
  const trop = texte.length > max;
  return (
    <section className="seo-carte" aria-labelledby={`seo-${fichier.nom}`}>
      <header className="seo-carte-tete">
        <h2 id={`seo-${fichier.nom}`} className="seo-carte-titre">
          {p.titre}
        </h2>
        <span className={`seo-pastille seo-pastille--${fichier.texte === null ? "neutre" : "succes"}`}>{fichier.texte === null ? "Texte par défaut du site" : "Texte saisi ici"}</span>
      </header>
      <p className="seo-aide">{p.aide}</p>
      <label className="seo-masque" htmlFor={`seo-texte-${fichier.nom}`}>
        Texte de {p.titre}
      </label>
      <textarea id={`seo-texte-${fichier.nom}`} className="seo-texte" value={texte} placeholder={p.exemple} spellCheck={false} rows={fichier.nom === "llms" ? 18 : 10} onChange={(e) => setTexte(e.target.value)} />
      <div className="seo-pied">
        <span className={`seo-compteur${trop ? " seo-compteur--trop" : ""}`}>
          {nombre(texte.length)} / {nombre(max)} caractères
        </span>
        <span className="seo-trace">
          {fichier.maj ? `Dernière modification ici : ${date(fichier.maj)}${fichier.par ? `, par ${fichier.par}` : ""}` : fichier.texte === null ? "Aucune modification : le site sert son texte par défaut." : ""}
          {fichier.modifieAilleurs ? " Le texte a été changé depuis dans Paramètres > SEO." : ""}
        </span>
      </div>
      <div className="seo-gestes">
        <Bouton variante="principal" desactive={!change || trop || texte.trim() === ""} occupe={occupe === "enregistrer"} onClick={() => void agir("enregistrer")}>
          Enregistrer
        </Bouton>
        <Bouton desactive={!change} onClick={() => setTexte(initial)}>
          Annuler les modifications
        </Bouton>
        <Bouton variante="discret" desactive={fichier.texte === null} occupe={occupe === "defaut"} onClick={() => void agir("defaut")}>
          Revenir au texte par défaut
        </Bouton>
        <a className="seo-lien" href={new URL(fichier.nom === "robots" ? "/robots.txt" : "/llms.txt", origine).href} target="_blank" rel="noreferrer">
          Voir le fichier servi
        </a>
      </div>
      {avis ? (
        <p className={`seo-avis seo-avis--${avis.ton}`} role={avis.ton === "erreur" ? "alert" : "status"}>
          {avis.texte}
        </p>
      ) : null}
    </section>
  );
}

function Retraits({ titre, liste }: { titre: string; liste: Retrait[] }) {
  if (liste.length === 0) return null;
  return (
    <details className="seo-retraits">
      <summary>
        {titre} ({nombre(liste.length)})
      </summary>
      <ul>
        {liste.map((r) => (
          <li key={`${r.chemin}-${r.raison}`}>
            <code>{r.chemin}</code> : {RAISONS[r.raison] ?? r.raison}
          </li>
        ))}
      </ul>
    </details>
  );
}

function EtatDuPlan({ plan, origine }: { plan: Plan | null; origine: string }) {
  const index = new URL("/sitemap-index.xml", origine).href;
  const vivant = new URL("/sitemap-moteur.xml", origine).href;
  return (
    <section className="seo-carte" aria-labelledby="seo-plan">
      <header className="seo-carte-tete">
        <h2 id="seo-plan" className="seo-carte-titre">
          État du plan du site
        </h2>
        <a className="seo-lien" href={index} target="_blank" rel="noreferrer">
          {index}
        </a>
      </header>
      {plan ? (
        <>
          <div className="seo-tuiles">
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre">{nombre(plan.adresses)}</span>
              <span className="seo-tuile-libelle">adresses dans le plan</span>
            </div>
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre seo-tuile-chiffre--date">{date(plan.derniereModification)}</span>
              <span className="seo-tuile-libelle">dernière page modifiée</span>
            </div>
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre">{nombre(plan.retirees.length)}</span>
              <span className="seo-tuile-libelle">adresses retirées</span>
            </div>
          </div>
          <p className="seo-aide">
            Le plan est recalculé à chaque lecture par un moteur de recherche. Il a changé pour la dernière fois le {date(plan.changeLe)}.
            {plan.manifeste ? ` Pages figées relevées au build du ${date(plan.manifeste)}.` : " Attention : la liste des pages figées du build est introuvable, elles manquent au plan."}
            {plan.manquantes.length > 0 ? ` Collections absentes de la base : ${plan.manquantes.join(", ")}.` : ""}
          </p>
          <Retraits titre="Adresses retirées du plan" liste={plan.retirees} />
          <Retraits titre="Pages du build écartées" liste={plan.ecarteesAuBuild} />
        </>
      ) : (
        <p className="seo-aide">Le plan n'a pas encore été calculé depuis l'installation de cet écran : ouvrez-le une fois, puis rechargez cette page.</p>
      )}
      <div className="seo-gestes">
        <a className="seo-bouton seo-bouton--secondaire" href={vivant} target="_blank" rel="noreferrer">
          Ouvrir le plan
        </a>
      </div>
    </section>
  );
}

export function Seo() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    setErreur(null);
    try {
      setEtat(await appeler("etat"));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void charger();
  }, [charger]);
  return (
    <div className="seo-ecran">
      <header>
        <h1 className="seo-titre">SEO</h1>
        <p className="seo-chapeau">Ce que le site dit aux moteurs de recherche et aux assistants : robots.txt, llms.txt, le plan du site, et l'audit de chaque page. Chaque enregistrement est en ligne aussitôt, sans mise à jour du site.</p>
      </header>
      {erreur ? (
        <p className="seo-avis seo-avis--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {etat ? (
        <>
          <CarteDuFichier fichier={etat.fichiers.robots} origine={etat.origine} surEtat={setEtat} />
          <CarteDuFichier fichier={etat.fichiers.llms} origine={etat.origine} surEtat={setEtat} />
          <EtatDuPlan plan={etat.plan} origine={etat.origine} />
          <Audit />
        </>
      ) : erreur ? null : (
        <p className="seo-aide">Chargement…</p>
      )}
    </div>
  );
}

export const pages = { "/": Seo };
