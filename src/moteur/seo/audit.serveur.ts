// src/moteur/seo/audit.serveur.ts - ce que l'audit SEO lit cote serveur : l'inventaire des pages (le plan publie et les entrees publiees de la base), chaque page rendue comme un visiteur la recoit, les redirections, les 404 relevees et les mots cles.
//
// CE QU'EMDASH 0.38 PERMET, ET RIEN DE PLUS :
//   - les entrees publiees se lisent dans la base (ec_<collection>,
//     _emdash_seo), comme le plan les lit (base.ts) ;
//   - une page se juge sur ce que Google recoit : elle est demandee a
//     l'adresse publique du site par fetch, sans cookie, exactement comme un
//     robot (statut, X-Robots-Tag, HTML). Le Worker du moteur peut appeler
//     l'adresse publique du site : un domaine personnalise ou pages.dev
//     repond a un fetch venu du meme compte (Cloudflare, Custom Domains,
//     "Worker to Worker communication"). Site en maintenance : chaque page
//     repond 503, l'audit le dit ;
//   - les redirections sont la table _emdash_redirects (menu Redirections),
//     compteur de passages compris ; les 404 sont la table _emdash_404_log
//     qu'EmDash remplit quand une adresse inconnue passe par lui. Une 404
//     servie par un fichier ou par le Worker avant EmDash n'y est pas :
//     la liste est un releve, pas un compte exhaustif.
// Une page par requete au plus a la fois, PAGES_PAR_APPEL par appel : un
// Worker a un plafond de sous-requetes, et le site ne doit pas se sentir
// audite.
import { type Controle, controler, lirePage, noter } from "./audit.ts";
import { type Base, ecrireLigne, lireLesEntrees, lireLigne } from "./base.ts";
import type { SorteDePage } from "./donnees.ts";
import { ROUTE_DU_PLAN } from "./identite.mjs";
import { cheminDe, entreesDepuisXml } from "./plan.ts";
import type { OptionsDuPlanVivant } from "./route.ts";

export const PAGES_PAR_APPEL = 6;
const DELAI_MS = 15_000;
const AGENT = "AlohaSEO-Audit (+audit du back office)";

export interface PageInventoriee {
  chemin: string;
  collection: string | null;
  sorte: SorteDePage;
  dansLePlan: boolean;
  noindexEnBase: boolean;
}

/** La sorte d'une page d'apres sa collection (noms usuels de la maison) ou son adresse. */
export function sorteDe(collection: string | null, chemin: string): SorteDePage {
  if (/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?$/.test(chemin)) return "accueil";
  if (collection && /^(products|produits|boutique)$/.test(collection)) return "produit";
  if (collection && /^(posts|blog|articles|billets|carnet|journal)$/.test(collection)) return "article";
  if (collection && /^(rayons|categories|collections)$/.test(collection)) return "rayon";
  if (!collection && /\/(?:produit|product|shop)\/[^/]+\/$/.test(chemin)) return "produit";
  if (!collection && /\/(nos-produits|categorie-produit|collections|rayons?)\/[^/]+\/$/.test(chemin)) return "rayon";
  return "page";
}

async function lire(adresse: string): Promise<Response> {
  return fetch(adresse, { redirect: "manual", headers: { "User-Agent": AGENT, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(DELAI_MS) });
}

/** Les pages du site : le plan tel qu'il est publie, plus chaque entree publiee de la base, rangee par sorte. */
export async function inventaire(base: Base | null, origine: string, plan: OptionsDuPlanVivant): Promise<{ pages: PageInventoriee[]; planLisible: boolean }> {
  const duPlan = new Set<string>();
  let planLisible = false;
  try {
    const r = await lire(new URL(ROUTE_DU_PLAN, origine).href);
    if (r.ok) {
      // Le plan est celui du site : ses adresses sont sur le domaine final, meme lu depuis un apercu (pages.dev) ou en local.
      for (const e of entreesDepuisXml(await r.text(), null)) duPlan.add(e.chemin);
      planLisible = true;
    } else await r.body?.cancel();
  } catch {
    planLisible = false;
  }
  const pages = new Map<string, PageInventoriee>();
  for (const chemin of duPlan) pages.set(chemin, { chemin, collection: null, sorte: sorteDe(null, chemin), dansLePlan: true, noindexEnBase: false });
  if (base) {
    const regles = Object.entries(plan.collections ?? {}).map(([collection, r]) => ({ collection, adresse: typeof r === "function" ? r : r.adresse }));
    const { entrees } = await lireLesEntrees(base, regles.map((r) => r.collection));
    for (const e of entrees) {
      const brut = regles.find((r) => r.collection === e.collection)?.adresse({ collection: e.collection, id: e.id, slug: e.slug, locale: e.locale });
      const chemin = brut ? cheminDe(brut, origine) : null;
      if (!chemin) continue;
      pages.set(chemin, { chemin, collection: e.collection, sorte: sorteDe(e.collection, chemin), dansLePlan: duPlan.has(chemin), noindexEnBase: e.noindex });
    }
  }
  return { pages: [...pages.values()].sort((a, b) => a.chemin.localeCompare(b.chemin)), planLisible };
}

export interface PageAuditee {
  chemin: string;
  adresse: string;
  statut: number;
  redirigeVers: string | null;
  /** L'adresse canonique absolue que la page declare, ou null. */
  canonique: string | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  mots: number;
  note: number;
  controles: Controle[];
}

/** Rend une page comme un robot la recoit et l'audite. Une page injoignable est une page notee 0, jamais une erreur de l'ecran. */
export async function auditerUnePage(origine: string, p: PageInventoriee, motCle: string | null): Promise<PageAuditee> {
  const adresse = new URL(p.chemin, origine).href;
  let statut = 0;
  let redirigeVers: string | null = null;
  let html = "";
  let robotsEntete: string | null = null;
  try {
    const r = await lire(adresse);
    statut = r.status;
    robotsEntete = r.headers.get("X-Robots-Tag");
    redirigeVers = r.headers.get("Location");
    if ((r.headers.get("Content-Type") ?? "").includes("text/html")) html = await r.text();
    else await r.body?.cancel();
  } catch {
    statut = 0;
  }
  const l = lirePage(html, origine);
  const controles = controler(l, { adresse, statut, robotsEntete, dansLePlan: p.dansLePlan, sorte: p.sorte, motCle });
  const canonique = l.canonique ? new URL(l.canonique, adresse).href : null;
  return { chemin: p.chemin, adresse, statut, redirigeVers, canonique, title: l.title, description: l.description, h1: l.titres.find((h) => h.niveau === 1)?.texte ?? null, mots: l.mots, note: noter(controles), controles };
}

/** Audite une suite de pages, une a la fois. */
export async function auditer(origine: string, pages: PageInventoriee[], motsCles: Record<string, string>): Promise<PageAuditee[]> {
  const sortie: PageAuditee[] = [];
  for (const p of pages.slice(0, PAGES_PAR_APPEL)) sortie.push(await auditerUnePage(origine, p, motsCles[p.chemin] ?? null));
  return sortie;
}

export interface Redirection {
  source: string;
  destination: string;
  type: number;
  motif: boolean;
  active: boolean;
  passages: number;
  dernierPassage: string | null;
}

/** Les redirections du menu Redirections, les plus suivies d'abord. Table absente : aucune. */
export async function lireToutesLesRedirections(base: Base): Promise<Redirection[]> {
  try {
    const l = await base.lire<Record<string, unknown>>("SELECT source, destination, type, is_pattern, enabled, hits, last_hit_at FROM _emdash_redirects ORDER BY hits DESC, source LIMIT 300");
    return l.map((x) => ({ source: String(x.source), destination: String(x.destination), type: Number(x.type), motif: Number(x.is_pattern) === 1, active: Number(x.enabled) === 1, passages: Number(x.hits ?? 0), dernierPassage: x.last_hit_at ? String(x.last_hit_at) : null }));
  } catch {
    return [];
  }
}

/** Les adresses introuvables relevees ces 30 derniers jours, les plus demandees d'abord ; null si la table n'existe pas. */
export async function lireLes404(base: Base): Promise<{ chemin: string; fois: number; derniere: string; provenance: string | null }[] | null> {
  try {
    const l = await base.lire<Record<string, unknown>>(
      `SELECT path, COUNT(*) AS fois, MAX(created_at) AS derniere, MAX(referrer) AS provenance FROM _emdash_404_log
       WHERE created_at >= datetime('now', '-30 days') GROUP BY path ORDER BY fois DESC, derniere DESC LIMIT 100`,
    );
    return l.map((x) => ({ chemin: String(x.path), fois: Number(x.fois), derniere: String(x.derniere), provenance: x.provenance ? String(x.provenance) : null }));
  } catch {
    return null;
  }
}

/** Les mots cles choisis page par page, gardes dans aloha_seo (ligne "motscles"). */
export async function lireLesMotsCles(base: Base): Promise<Record<string, string>> {
  const l = await lireLigne(base, "motscles");
  try {
    const v = l?.contenu ? (JSON.parse(l.contenu) as unknown) : {};
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "string")) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Enregistre (ou efface, texte vide) le mot cle d'une page. 80 caracteres, 2 000 pages au plus. */
export async function ecrireLeMotCle(base: Base, chemin: string, motCle: string, qui: string): Promise<Record<string, string>> {
  if (!chemin.startsWith("/") || chemin.length > 500) throw new RangeError("Adresse de page illisible.");
  const mots = await lireLesMotsCles(base);
  const propre = motCle.replace(/\s+/g, " ").trim().slice(0, 80);
  if (propre) mots[chemin] = propre;
  else delete mots[chemin];
  if (Object.keys(mots).length > 2000) throw new RangeError("Trop de mots clés enregistrés (2 000 pages au plus).");
  await ecrireLigne(base, { nom: "motscles", contenu: JSON.stringify(mots), empreinte: null, maj: Date.now(), maj_par: qui });
  return mots;
}
