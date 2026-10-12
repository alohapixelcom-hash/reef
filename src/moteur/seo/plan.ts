// src/moteur/seo/plan.ts - le coeur du plan vivant, sans EmDash ni Astro : reunir les adresses des trois sources, retirer ce qui ne doit pas y etre, ecrire le XML.
//
// POURQUOI UN PLAN VIVANT. Le plan fige de @astrojs/sitemap ne connait que
// les pages du build : il ment des qu'une entree est publiee, depubliee ou
// redirigee dans le back office. Le plan natif d'EmDash (/sitemap-<collection>.xml),
// lui, ne connait pas les routes du site (mesure sur alohapixel.com : 194
// adresses fausses, sans barre finale, slugs anglais non traduits). Ce plan-ci
// reunit, a chaque requete :
//   (a) les pages figees du build, relues dans le HTML construit (manifeste) ;
//   (b) les adresses que le site rend a la demande, donnees par le site ;
//   (c) les entrees EmDash publiees, a l'adresse que LE SITE leur donne ;
// moins les entrees en noindex, les sources des redirections actives et ce
// que le site met hors du plan.
//
// Une adresse est un chemin ("/fr/contact/"), jamais une adresse absolue :
// l'origine n'est posee qu'a l'ecriture du XML. Une alternative de langue peut
// pointer un autre domaine (hreflang entre domaines) : elle garde alors son
// adresse absolue.

export interface Alternative {
  /** La valeur de hreflang, telle que le head l'ecrit ("fr", "en-US", "x-default"). */
  langue: string;
  /** Un chemin du site ("/fr/x/") ou une adresse absolue d'un autre domaine. */
  href: string;
}

export interface EntreeDuPlan {
  chemin: string;
  alternatives?: Alternative[];
  /** Derniere modification (date W3C) : updated_at de la base, ou celle que la route du site donne ; jamais la date du build. */
  lastmod?: string | null;
  /** Les adresses des images de la page (image:image). */
  images?: string[];
}

/** Les langues du site, pour deviner les alternatives d'une liste de chemins et poser x-default. */
export interface Langues {
  /** La langue servie sans prefixe (code de la base : "en", "fr"). */
  parDefaut: string;
  /** Le prefixe de chaque autre langue ("fr" -> "/fr"). */
  prefixes?: Record<string, string>;
  /** La valeur hreflang d'un code de la base quand elles different ("en-us" -> "en-US"). */
  hreflang?: Record<string, string>;
}

export interface Redirections {
  exactes: Set<string>;
  motifs: RegExp[];
}

export type Raison = "noindex" | "redirigee" | "hors du plan";

export interface Retrait {
  chemin: string;
  raison: Raison;
}

export interface Retraits {
  noindex?: Iterable<string>;
  redirections?: Redirections;
  horsDuPlan?: RegExp;
}

/** Une reponse XML qui ne se garde nulle part : le plan indisponible (503). */
export const EN_TETES_XML: Record<string, string> = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "no-store",
};

/** Combien de secondes un plan ou l'index peut etre garde (frontal, navigateur, robot). */
export const GARDE_DU_PLAN = 300;

/**
 * Les en-tetes du plan vivant et de l'index. Plus de no-store : un plan qui
 * se recalcule a chaque visite de Google repondait en 9 a 86 s sur les
 * grandes boutiques (MESURE le 12 octobre 2026), et la Search Console le
 * declarait illisible. Cinq minutes de garde publique, et le frontal du socle
 * le garde sous la version du contenu : une publication change la cle, la
 * copie d'avant ne ressert jamais.
 */
export const EN_TETES_DU_PLAN: Record<string, string> = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": `public, max-age=${GARDE_DU_PLAN}`,
};

const NS_PLAN = "http://www.sitemaps.org/schemas/sitemap/0.9";
const NS_XHTML = "http://www.w3.org/1999/xhtml";
const NS_IMAGE = "http://www.google.com/schemas/sitemap-image/1.1";

/** Un texte dans du XML : les cinq caracteres reserves echappes. */
export const echapper = (texte: string): string =>
  texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** L'inverse, pour relire un plan. */
export const desechapper = (texte: string): string =>
  texte.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const ABSOLUE = /^https?:\/\//i;

/** Un chemin propre : une barre en tete, une seule a la suite, sans requete ni ancre. */
export function normaliser(chemin: string): string {
  const sans = chemin.replace(/[?#].*$/, "");
  return `/${sans.replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
}

/**
 * Le chemin d'une adresse du site, ou null si elle est sur un autre domaine.
 * Sans origine connue, toute adresse absolue est prise pour une adresse du site.
 */
export function cheminDe(href: string, origine?: string | URL | null): string | null {
  if (!ABSOLUE.test(href)) return normaliser(href);
  const u = new URL(href);
  if (origine && u.host !== new URL(origine).host) return null;
  return normaliser(u.pathname);
}

/**
 * Une date au format W3C (ISO 8601 en UTC), comme EmDash le fait pour son plan :
 * SQLite range "AAAA-MM-JJ HH:MM:SS" sans fuseau, que la Search Console refuse.
 */
export function versW3C(valeur: string | number | null | undefined): string | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  if (typeof valeur === "number") return Number.isFinite(valeur) ? new Date(valeur).toISOString() : null;
  let v = valeur.trim();
  if (v.includes(" ") && !v.includes("T")) v = v.replace(" ", "T");
  if (!/([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(v)) v += "Z";
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const plusRecente = (a?: string | null, b?: string | null): string | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
};

/** La valeur hreflang d'un code de langue de la base. */
export const hreflangDe = (code: string, langues?: Langues): string => langues?.hreflang?.[code] ?? code;

/** La langue d'un chemin et ce qui reste une fois son prefixe ote : deux langues d'une meme page partagent ce reste. */
export function decouper(chemin: string, langues: Langues): { langue: string; suffixe: string } {
  for (const [code, prefixe] of Object.entries(langues.prefixes ?? {})) {
    const p = normaliser(prefixe).replace(/\/$/, "");
    if (p && (chemin === p || chemin === `${p}/` || chemin.startsWith(`${p}/`))) return { langue: code, suffixe: chemin.slice(p.length) || "/" };
  }
  return { langue: langues.parDefaut, suffixe: chemin };
}

/**
 * Les alternatives devinees d'une liste de chemins sans alternatives connues :
 * deux chemins de langues differentes au meme reste sont la meme page. C'est
 * la regle du plan du socle d'avant (planDuSite), reprise telle quelle.
 */
export function devinerLesLangues(chemins: string[], langues?: Langues): EntreeDuPlan[] {
  const propres = [...new Set(chemins.map(normaliser))];
  if (!langues) return propres.map((chemin) => ({ chemin }));
  const groupes = new Map<string, Map<string, string>>();
  for (const chemin of propres) {
    const { langue, suffixe } = decouper(chemin, langues);
    if (!groupes.has(suffixe)) groupes.set(suffixe, new Map());
    groupes.get(suffixe)!.set(langue, chemin);
  }
  return propres.map((chemin) => {
    const freres = groupes.get(decouper(chemin, langues).suffixe)!;
    if (freres.size < 2) return { chemin };
    return { chemin, alternatives: [...freres].map(([code, href]) => ({ langue: hreflangDe(code, langues), href })) };
  });
}

/**
 * Une source de redirection en expression, ou null pour une source exacte.
 * EmDash : [param] pour un segment, [...reste] pour la fin (redirects/patterns.ts).
 * Cloudflare (_redirects) : :param pour un segment, * pour le reste.
 */
export function motifDeRedirection(source: string, syntaxe: "emdash" | "cloudflare"): RegExp | null {
  const marques = syntaxe === "emdash" ? /\[(?:\.\.\.)?\w+\]/ : /\*|(?:^|\/):\w+/;
  if (!marques.test(source)) return null;
  const morceaux = source.split(syntaxe === "emdash" ? /(\[(?:\.\.\.)?\w+\])/ : /(\*|:\w+)/);
  const corps = morceaux
    .map((m, i) => {
      if (i % 2 === 0) return m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (syntaxe === "emdash") return m.startsWith("[...") ? ".+" : "[^/]+";
      return m === "*" ? ".*" : "[^/]+";
    })
    .join("");
  return new RegExp(`^${corps}$`);
}

/** Les redirections actives, exactes et a motif, des deux syntaxes. */
export function redirections(sources: { source: string; syntaxe: "emdash" | "cloudflare" }[]): Redirections {
  const r: Redirections = { exactes: new Set(), motifs: [] };
  for (const { source, syntaxe } of sources) {
    if (!source.startsWith("/")) continue;
    const motif = motifDeRedirection(source, syntaxe);
    if (motif) r.motifs.push(motif);
    else r.exactes.add(source.replace(/[?#].*$/, ""));
  }
  return r;
}

/** Vrai quand une requete sur ce chemin part ailleurs : la source d'une redirection n'est jamais une adresse du plan. */
export const estRedirigee = (chemin: string, r?: Redirections): boolean => !!r && (r.exactes.has(chemin) || r.motifs.some((m) => m.test(chemin)));

/** Fusionne deux vues d'une meme adresse : alternatives et images reunies, date la plus recente. */
function fondre(a: EntreeDuPlan, b: EntreeDuPlan): EntreeDuPlan {
  const alternatives = [...(a.alternatives ?? [])];
  for (const alt of b.alternatives ?? []) if (!alternatives.some((x) => x.langue === alt.langue)) alternatives.push(alt);
  const images = [...new Set([...(a.images ?? []), ...(b.images ?? [])])];
  return {
    chemin: a.chemin,
    ...(alternatives.length > 0 ? { alternatives } : {}),
    lastmod: plusRecente(a.lastmod, b.lastmod),
    ...(images.length > 0 ? { images } : {}),
  };
}

/**
 * L'union des sources, moins les retraits. `datees` n'ajoute aucune adresse :
 * elle date et illustre celles qui sont deja la (une collection dont le site
 * liste deja les pages). Les alternatives vers une adresse retiree tombent.
 */
export function assembler(sources: EntreeDuPlan[][], retraits: Retraits = {}, datees: EntreeDuPlan[] = []): { entrees: EntreeDuPlan[]; retirees: Retrait[] } {
  const parChemin = new Map<string, EntreeDuPlan>();
  for (const liste of sources) {
    for (const e of liste) {
      const propre = { ...e, chemin: normaliser(e.chemin) };
      const deja = parChemin.get(propre.chemin);
      parChemin.set(propre.chemin, deja ? fondre(deja, propre) : propre);
    }
  }
  for (const e of datees) {
    const chemin = normaliser(e.chemin);
    const deja = parChemin.get(chemin);
    if (deja) parChemin.set(chemin, fondre(deja, { ...e, chemin }));
  }
  const noindex = new Set([...(retraits.noindex ?? [])].map(normaliser));
  const retirees: Retrait[] = [];
  const raisonDe = (chemin: string): Raison | null => {
    if (noindex.has(chemin)) return "noindex";
    if (estRedirigee(chemin, retraits.redirections)) return "redirigee";
    if (retraits.horsDuPlan?.test(chemin)) return "hors du plan";
    return null;
  };
  for (const chemin of [...parChemin.keys()]) {
    const raison = raisonDe(chemin);
    if (raison) {
      retirees.push({ chemin, raison });
      parChemin.delete(chemin);
    }
  }
  const entrees = [...parChemin.values()]
    .map((e) => {
      const alternatives = (e.alternatives ?? []).filter((a) => ABSOLUE.test(a.href) || !raisonDe(normaliser(a.href)));
      return { ...e, alternatives: alternatives.length > 0 ? alternatives : undefined };
    })
    .sort((a, b) => (a.chemin < b.chemin ? -1 : a.chemin > b.chemin ? 1 : 0));
  return { entrees, retirees: retirees.sort((a, b) => (a.chemin < b.chemin ? -1 : 1)) };
}

/**
 * Les alternatives telles qu'elles partent dans le XML : la page elle-meme
 * comprise (Google l'exige), x-default ajoute vers la langue par defaut quand
 * le head ne l'a pas donne. Sans langues connues, rien n'est invente.
 */
export function alternativesEcrites(e: EntreeDuPlan, langues?: Langues): Alternative[] {
  const alts = [...(e.alternatives ?? [])];
  const reelles = alts.filter((a) => a.langue !== "x-default");
  if (reelles.length === 0) return [];
  if (langues && !reelles.some((a) => normaliser(a.href) === e.chemin && !ABSOLUE.test(a.href))) {
    const moi = { langue: hreflangDe(decouper(e.chemin, langues).langue, langues), href: e.chemin };
    if (!reelles.some((a) => a.langue === moi.langue)) {
      alts.push(moi);
      reelles.push(moi);
    }
  }
  if (reelles.length < 2) return [];
  if (!alts.some((a) => a.langue === "x-default") && langues) {
    const defaut = reelles.find((a) => a.langue === hreflangDe(langues.parDefaut, langues));
    if (defaut) alts.push({ langue: "x-default", href: defaut.href });
  }
  return alts;
}

const absolue = (href: string, origine: string | URL): string => (ABSOLUE.test(href) ? href : new URL(href, origine).href);

/** Le XML du plan vivant. L'espace image n'est declare que si une page a une image. */
export function xmlDuPlan(entrees: EntreeDuPlan[], origine: string | URL, langues?: Langues): string {
  const avecImages = entrees.some((e) => (e.images ?? []).length > 0);
  const urls = entrees.map((e) => {
    const lastmod = e.lastmod ? `<lastmod>${echapper(e.lastmod)}</lastmod>` : "";
    const liens = alternativesEcrites(e, langues)
      .map((a) => `<xhtml:link rel="alternate" hreflang="${echapper(a.langue)}" href="${echapper(absolue(a.href, origine))}"/>`)
      .join("");
    const images = [...new Set((e.images ?? []).map((i) => absolue(i, origine)))]
      .map((i) => `<image:image><image:loc>${echapper(i)}</image:loc></image:image>`)
      .join("");
    return `<url><loc>${echapper(absolue(e.chemin, origine))}</loc>${lastmod}${liens}${images}</url>`;
  });
  const espaces = `xmlns="${NS_PLAN}" xmlns:xhtml="${NS_XHTML}"${avecImages ? ` xmlns:image="${NS_IMAGE}"` : ""}`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${espaces}>\n${urls.join("\n")}\n</urlset>\n`;
}

/** L'index : il ne cite que le plan vivant. */
export function xmlDeLIndex(origine: string | URL, plan = "/sitemap-moteur.xml"): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${NS_PLAN}"><sitemap><loc>${echapper(absolue(plan, origine))}</loc></sitemap></sitemapindex>\n`;
}

/**
 * Relit un plan (urlset) : adresses, alternatives, dates, images. Sert a
 * reprendre la route de plan qu'un site a deja (le /sitemap-contenu.xml
 * d'alohapixel.com, un planDuSite du socle) sans la reecrire.
 */
export function entreesDepuisXml(xml: string, origine?: string | URL | null): EntreeDuPlan[] {
  const sortie: EntreeDuPlan[] = [];
  for (const bloc of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const corps = bloc[1] ?? "";
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(corps)?.[1];
    if (!loc) continue;
    const chemin = cheminDe(desechapper(loc.trim()), origine);
    if (!chemin) continue;
    const lastmod = versW3C(/<lastmod>([\s\S]*?)<\/lastmod>/.exec(corps)?.[1]?.trim());
    const alternatives: Alternative[] = [];
    for (const l of corps.matchAll(/<xhtml:link\b([^>]*)\/?>/g)) {
      const attrs = l[1] ?? "";
      const langue = /hreflang="([^"]*)"/.exec(attrs)?.[1];
      const href = /href="([^"]*)"/.exec(attrs)?.[1];
      if (!langue || !href) continue;
      const brut = desechapper(href);
      alternatives.push({ langue: desechapper(langue), href: cheminDe(brut, origine) ?? brut });
    }
    const images = [...corps.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/g)].map((m) => desechapper((m[1] ?? "").trim()));
    sortie.push({ chemin, ...(alternatives.length ? { alternatives } : {}), ...(lastmod ? { lastmod } : {}), ...(images.length ? { images } : {}) });
  }
  return sortie;
}

/**
 * Vrai pour un ancien nom de plan, qui repond 301 vers l'index : le plan
 * natif d'EmDash (/sitemap.xml, /sitemap-<collection>.xml), le plan fige de
 * @astrojs/sitemap (/sitemap-0.xml, /sitemap-N.xml) et l'ancien plan du
 * contenu (/sitemap-contenu.xml). L'index et le plan vivant restent.
 */
export function estUnAncienPlan(chemin: string): boolean {
  if (chemin === "/sitemap-index.xml" || chemin === "/sitemap-moteur.xml") return false;
  return chemin === "/sitemap.xml" || /^\/sitemap-[^/]+\.xml$/.test(chemin);
}
