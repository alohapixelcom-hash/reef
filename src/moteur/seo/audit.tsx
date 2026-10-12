// src/moteur/seo/audit.tsx - la partie "Audit" de l'ecran SEO : chaque page jugee comme Google la recoit, sa note, ses corrections par ordre d'urgence, l'apercu du resultat, les doublons, les redirections, les 404 relevees et les etapes Search Console et Google Business.
/** @jsxImportSource react */
//
// L'audit se lance a la main (bouton) : il demande chaque page du site a son
// adresse publique, par petits lots (PAGES_PAR_APPEL cote serveur), et la
// barre avance a chaque lot. Rien n'est garde entre deux visites, sauf les
// mots cles : un audit dit l'etat du site a l'instant ou on le lance.
import { Fragment, useMemo, useState } from "react";
import { apercuGoogle, type Controle, corrections, doublons, type Gravite } from "./audit.ts";
import type { PageAuditee, PageInventoriee, Redirection } from "./audit.serveur.ts";

interface Inventaire {
  origine: string;
  pages: PageInventoriee[];
  planLisible: boolean;
  parAppel: number;
  motsCles: Record<string, string>;
  redirections: Redirection[];
  introuvables: { chemin: string; fois: number; derniere: string; provenance: string | null }[] | null;
}

async function appeler<T>(route: string, corps: Record<string, unknown> = {}): Promise<T> {
  const reponse = await fetch(`/_emdash/api/plugins/aloha-seo/${route}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
    body: JSON.stringify(corps),
  });
  const json = (await reponse.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!reponse.ok || !json?.data) throw new Error(json?.error?.message ?? `Le back office a répondu ${reponse.status}. Rechargez la page.`);
  return json.data;
}

const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const SORTES: Record<string, string> = { accueil: "Accueil", produit: "Produit", article: "Article", rayon: "Rayon", page: "Page" };
const GRAVITES: Record<Gravite, string> = { bloquant: "Bloquant", important: "Important", conseil: "Conseil" };
const ton = (note: number) => (note >= 80 ? "bon" : note >= 50 ? "moyen" : "faible");

function Note({ note }: { note: number }) {
  return <span className={`seo-note seo-note--${ton(note)}`}>{note}</span>;
}

function ListeDeControles({ liste }: { liste: Controle[] }) {
  return (
    <ul className="seo-controles">
      {liste.map((k) => (
        <li key={k.id + k.constat} className={`seo-controle seo-controle--${k.ok ? "ok" : k.gravite}`}>
          <strong>{k.ok ? "Bon" : GRAVITES[k.gravite]}</strong> {k.titre}. <span className="seo-aide">{k.constat}</span>
          {k.ok ? null : <span className="seo-correction">{k.correction}</span>}
        </li>
      ))}
    </ul>
  );
}

function Detail({ page, motCle, surMotCle }: { page: PageAuditee; motCle: string; surMotCle: (m: string) => Promise<void> }) {
  const g = apercuGoogle(page.title, page.description, page.canonique ?? page.adresse);
  const [saisie, setSaisie] = useState(motCle);
  const [occupe, setOccupe] = useState(false);
  const aCorriger = corrections(page.controles);
  return (
    <div className="seo-detail">
      <div className="seo-google" aria-label="Aperçu du résultat dans Google">
        <span className="seo-google-fil">{g.fil}</span>
        <span className="seo-google-titre">{g.titre}</span>
        <span className="seo-google-texte">{g.description}</span>
      </div>
      <p className="seo-aide">Aperçu indicatif : Google coupe au pixel près et réécrit parfois le titre ou l'extrait.</p>
      <div className="seo-gestes">
        <label className="seo-champ">
          Mot clé visé pour cette page
          <input value={saisie} maxLength={80} placeholder="ex. café de spécialité Pau" onChange={(e) => setSaisie(e.target.value)} />
        </label>
        <button
          type="button"
          className="seo-bouton seo-bouton--secondaire"
          disabled={occupe || saisie.trim() === motCle}
          onClick={async () => {
            setOccupe(true);
            await surMotCle(saisie).finally(() => setOccupe(false));
          }}
        >
          Enregistrer et revérifier
        </button>
      </div>
      <h3 className="seo-sous-titre">{aCorriger.length ? `À corriger, du plus urgent au plus léger (${aCorriger.length})` : "Rien à corriger sur cette page"}</h3>
      <ListeDeControles liste={aCorriger} />
      <details className="seo-retraits">
        <summary>Contrôles réussis ({page.controles.length - aCorriger.length})</summary>
        <ListeDeControles liste={page.controles.filter((k) => k.ok)} />
      </details>
    </div>
  );
}

function Etapes() {
  return (
    <details className="seo-retraits">
      <summary>Search Console et fiche Google Business : les étapes à faire une fois</summary>
      <ol className="seo-etapes">
        <li>Search Console (search.google.com/search-console) : ajouter la propriété « Domaine » du site, la valider par l'enregistrement DNS que Google propose (à faire par la personne qui gère le nom de domaine).</li>
        <li>Dans « Sitemaps », soumettre l'adresse du plan affichée plus haut (sitemap-index.xml), puis revenir sous quelques jours : le nombre de pages découvertes doit approcher celui du plan.</li>
        <li>« Pages » : lire chaque motif d'exclusion. « Explorée, actuellement non indexée » se traite en étoffant la page, « Page en double » par la canonique.</li>
        <li>« Inspection de l'URL » sur une page modifiée, puis « Demander une indexation ».</li>
        <li>Fiche Google Business (business.google.com) : nom, adresse et téléphone écrits exactement comme sur le site, catégorie principale précise, horaires, photos récentes, lien vers le site.</li>
        <li>Demander un avis Google aux clients satisfaits et répondre à chaque avis : c'est ce qui compte le plus pour la carte locale.</li>
      </ol>
    </details>
  );
}

export function Audit() {
  const [inv, setInv] = useState<Inventaire | null>(null);
  const [resultats, setResultats] = useState<Record<string, PageAuditee>>({});
  const [avance, setAvance] = useState<{ fait: number; total: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("toutes");

  const lancer = async () => {
    setErreur(null);
    setResultats({});
    try {
      const i = await appeler<Inventaire>("audit-inventaire");
      setInv(i);
      setAvance({ fait: 0, total: i.pages.length });
      for (let d = 0; d < i.pages.length; d += i.parAppel) {
        const lot = await appeler<{ pages: PageAuditee[] }>("audit-pages", { pages: i.pages.slice(d, d + i.parAppel) });
        setResultats((r) => ({ ...r, ...Object.fromEntries(lot.pages.map((p) => [p.chemin, p])) }));
        setAvance({ fait: Math.min(i.pages.length, d + i.parAppel), total: i.pages.length });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setAvance(null);
    }
  };

  const pages = Object.values(resultats);
  const triees = useMemo(() => {
    const parSorte = new Map((inv?.pages ?? []).map((p) => [p.chemin, p.sorte]));
    return pages.filter((p) => filtre === "toutes" || parSorte.get(p.chemin) === filtre).sort((a, b) => a.note - b.note || a.chemin.localeCompare(b.chemin));
  }, [pages, inv, filtre]);
  const priorites = useMemo(() => {
    const m = new Map<string, { k: Controle; n: number }>();
    for (const p of pages) for (const k of corrections(p.controles)) m.set(k.id, { k, n: (m.get(k.id)?.n ?? 0) + 1 });
    const rang: Record<Gravite, number> = { bloquant: 0, important: 1, conseil: 2 };
    return [...m.values()].sort((a, b) => rang[a.k.gravite] - rang[b.k.gravite] || b.n - a.n);
  }, [pages]);
  const dbl = useMemo(() => doublons(pages.filter((p) => p.statut === 200).map((p) => ({ adresse: p.chemin, title: p.title, description: p.description }))), [pages]);
  const moyenne = pages.length ? Math.round(pages.reduce((s, p) => s + p.note, 0) / pages.length) : 0;

  const motCle = async (chemin: string, m: string) => {
    if (!inv) return;
    try {
      const { motsCles } = await appeler<{ motsCles: Record<string, string> }>("audit-mot-cle", { chemin, motCle: m });
      setInv({ ...inv, motsCles });
      const p = inv.pages.find((x) => x.chemin === chemin);
      if (p) {
        const lot = await appeler<{ pages: PageAuditee[] }>("audit-pages", { pages: [p] });
        setResultats((r) => ({ ...r, ...Object.fromEntries(lot.pages.map((x) => [x.chemin, x])) }));
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="seo-carte" aria-labelledby="seo-audit">
      <header className="seo-carte-tete">
        <h2 id="seo-audit" className="seo-carte-titre">
          Audit des pages
        </h2>
        <button type="button" className="seo-bouton seo-bouton--principal" disabled={avance !== null} aria-busy={avance !== null || undefined} onClick={() => void lancer()}>
          {pages.length ? "Relancer l'audit" : "Lancer l'audit"}
        </button>
      </header>
      <p className="seo-aide">
        Chaque page du plan et chaque contenu publié est demandé au site comme le ferait Google : titre, description, titres, images, liens, canonique, langues, données structurées. La note est sur 100 ; une page que Google ne peut pas indexer ne dépasse jamais 40. Aucun outil ne garantit une place : ces contrôles retirent ce qui empêche une page d'être bien classée.
      </p>
      {avance ? (
        <div className="seo-avancee" role="status">
          <progress max={avance.total} value={avance.fait} /> {nombre(avance.fait)} / {nombre(avance.total)} pages
        </div>
      ) : null}
      {erreur ? (
        <p className="seo-avis seo-avis--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {inv && !inv.planLisible ? <p className="seo-avis seo-avis--erreur">Le plan du site n'a pas pu être lu à son adresse publique : seules les pages de la base sont auditées.</p> : null}
      {pages.length ? (
        <>
          <div className="seo-tuiles">
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre">{moyenne}</span>
              <span className="seo-tuile-libelle">note moyenne sur 100</span>
            </div>
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre">{nombre(pages.length)}</span>
              <span className="seo-tuile-libelle">pages auditées</span>
            </div>
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre">{nombre(pages.filter((p) => p.controles.some((k) => !k.ok && k.gravite === "bloquant")).length)}</span>
              <span className="seo-tuile-libelle">pages avec un défaut bloquant</span>
            </div>
            <div className="seo-tuile">
              <span className="seo-tuile-chiffre">{nombre(dbl.titles.length + dbl.descriptions.length)}</span>
              <span className="seo-tuile-libelle">titres ou descriptions en double</span>
            </div>
          </div>
          <h3 className="seo-sous-titre">Corrections prioritaires du site</h3>
          <ol className="seo-controles">
            {priorites.slice(0, 12).map(({ k, n }) => (
              <li key={k.id} className={`seo-controle seo-controle--${k.gravite}`}>
                <strong>{GRAVITES[k.gravite]}</strong> {k.titre} : {nombre(n)} page{n > 1 ? "s" : ""}. <span className="seo-correction">{k.correction}</span>
              </li>
            ))}
          </ol>
          {dbl.titles.length + dbl.descriptions.length ? (
            <details className="seo-retraits" open>
              <summary>Doublons : deux pages qui se font concurrence dans Google</summary>
              <ul>
                {[...dbl.titles.map((g) => ({ ...g, quoi: "Même titre" })), ...dbl.descriptions.map((g) => ({ ...g, quoi: "Même description" }))].map((g) => (
                  <li key={g.quoi + g.texte}>
                    {g.quoi} « {g.texte} » : {g.adresses.map((a) => <code key={a}>{a} </code>)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <label className="seo-champ">
            Afficher
            <select value={filtre} onChange={(e) => setFiltre(e.target.value)}>
              <option value="toutes">toutes les pages</option>
              {Object.entries(SORTES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l.toLowerCase()}s
                </option>
              ))}
            </select>
          </label>
          <table className="seo-table">
            <thead>
              <tr>
                <th scope="col">Note</th>
                <th scope="col">Page</th>
                <th scope="col">Titre dans Google</th>
                <th scope="col">À corriger</th>
              </tr>
            </thead>
            <tbody>
              {triees.map((p) => (
                <Fragment key={p.chemin}>
                  <tr>
                    <td>
                      <Note note={p.note} />
                    </td>
                    <td>
                      <button type="button" className="seo-lien" aria-expanded={ouverte === p.chemin} onClick={() => setOuverte(ouverte === p.chemin ? null : p.chemin)}>
                        {p.chemin}
                      </button>
                      {p.statut !== 200 ? ` (code ${p.statut}${p.redirigeVers ? ` vers ${p.redirigeVers}` : ""})` : ""}
                    </td>
                    <td>{p.title ?? "-"}</td>
                    <td>{nombre(corrections(p.controles).length)}</td>
                  </tr>
                  {ouverte === p.chemin ? (
                    <tr>
                      <td colSpan={4}>
                        <Detail page={p} motCle={inv?.motsCles[p.chemin] ?? ""} surMotCle={(m) => motCle(p.chemin, m)} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {inv ? (
        <>
          <details className="seo-retraits">
            <summary>Redirections ({nombre(inv.redirections.length)}), à gérer dans le menu Redirections</summary>
            <ul>
              {inv.redirections.map((r) => (
                <li key={r.source}>
                  <code>{r.source}</code> vers <code>{r.destination}</code> ({r.type}
                  {r.active ? "" : ", désactivée"}) : {nombre(r.passages)} passage{r.passages > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </details>
          <details className="seo-retraits">
            <summary>Adresses introuvables relevées ces 30 jours ({inv.introuvables ? nombre(inv.introuvables.length) : "relevé indisponible"})</summary>
            <p className="seo-aide">Une adresse demandée souvent mérite une redirection vers la page la plus proche. Ce relevé ne voit que les adresses passées par le moteur du site.</p>
            <ul>
              {(inv.introuvables ?? []).map((x) => (
                <li key={x.chemin}>
                  <code>{x.chemin}</code> : {nombre(x.fois)} fois{x.provenance ? `, depuis ${x.provenance}` : ""}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
      <Etapes />
    </section>
  );
}
