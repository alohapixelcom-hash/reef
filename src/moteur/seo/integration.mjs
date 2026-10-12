// src/moteur/seo/integration.mjs - l'integration Astro qui ecrit, a la fin du build, le manifeste des pages figees indexables (/_aloha/plan-fige.json) que le plan vivant relit.
//
// POURQUOI RELIRE LE HTML CONSTRUIT. Le plan doit dire ce que le head dit :
// memes pages, memes alternatives de langue. Plutot que de recalculer les
// hreflang (deux sources de verite qui finissent par diverger), on lit les
// balises que le build vient d'ecrire, comme hreflangDuHtml d'alohapixel.com.
// Une page qui porte noindex, une page dont la canonique pointe ailleurs, une
// page de redirection (meta refresh) n'entrent pas : elles sont notees dans
// `ecartees`, que l'ecran SEO montre.
//
// LES PAGES SANS PARAMETRE RENDUES A LA DEMANDE (l'accueil d'alohapixel.com)
// n'ont pas de HTML au build : leur chemin est pris dans astro:routes:resolved,
// comme @astrojs/sitemap le faisait. Le site les retire par `exclure` s'il le
// faut.
//
// LE FICHIER _redirects DU BUILD est relu ici : ses sources (sauf les
// reecritures 200) ne sont jamais des adresses du plan.
//
// Le manifeste part dans les fichiers publics (dist/client moteur allume) :
// le Worker le relit par sa liaison ASSETS. Il ne contient que des adresses
// publiques, deja dans le plan.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFESTE_DU_BUILD } from "./identite.mjs";

/**
 * La valeur d'un attribut dans une balise ("<link rel=... href=...>"), quel que soit l'ordre des attributs.
 * @param {string} balise
 * @param {string} nom
 * @returns {string | null}
 */
function attribut(balise, nom) {
  const m = new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(balise);
  return m ? (m[1] ?? m[2] ?? "").replace(/&amp;/g, "&") : null;
}

/**
 * Le chemin d'une adresse du site, ou null pour un autre domaine.
 * @param {string} href
 * @param {string | undefined} site
 * @returns {string | null}
 */
function cheminDe(href, site) {
  if (!/^https?:\/\//i.test(href)) return href.startsWith("/") ? href.replace(/[?#].*$/, "") : null;
  const u = new URL(href);
  if (site && u.host !== new URL(site).host) return null;
  return u.pathname;
}

/**
 * @typedef {{ langue: string, href: string }} Alternative
 * @typedef {{ indexable: true, alternatives: Alternative[] } | { indexable: false, raison: string }} PageLue
 */

/**
 * Ce que le head d'une page dit d'elle : indexable ou non (et pourquoi), ses
 * alternatives de langue. Fonction pure : le self-check la joue sur du HTML.
 * @param {string} html
 * @param {string} chemin
 * @param {string | undefined} site
 * @returns {PageLue}
 */
export function lireLaPage(html, chemin, site) {
  const tete = html.split(/<\/head>/i)[0] ?? html;
  const metas = tete.match(/<meta\b[^>]*>/gi) ?? [];
  const liens = tete.match(/<link\b[^>]*>/gi) ?? [];
  if (metas.some((m) => /^refresh$/i.test(attribut(m, "http-equiv") ?? ""))) return { indexable: false, raison: "redirection" };
  if (metas.some((m) => /^(robots|googlebot)$/i.test(attribut(m, "name") ?? "") && /noindex/i.test(attribut(m, "content") ?? ""))) return { indexable: false, raison: "noindex" };
  const canonique = liens.find((l) => /(^|\s)canonical(\s|$)/i.test(attribut(l, "rel") ?? ""));
  const href = canonique ? attribut(canonique, "href") : null;
  if (href && cheminDe(href, site) !== chemin) return { indexable: false, raison: "canonique ailleurs" };
  /** @type {Alternative[]} */
  const alternatives = [];
  for (const l of liens) {
    if (!/(^|\s)alternate(\s|$)/i.test(attribut(l, "rel") ?? "")) continue;
    const langue = attribut(l, "hreflang");
    const cible = attribut(l, "href");
    if (!langue || !cible) continue;
    alternatives.push({ langue, href: cheminDe(cible, site) ?? cible });
  }
  return { indexable: true, alternatives };
}

/**
 * Les sources du fichier _redirects (format Cloudflare : source destination
 * [code]), sans les reecritures en 200 qui servent une page sans changer
 * d'adresse.
 * @param {string} texte
 */
export function sourcesDesRedirections(texte) {
  /** @type {string[]} */
  const sources = [];
  for (const ligne of texte.split("\n")) {
    const propre = ligne.replace(/#.*$/, "").trim();
    if (!propre) continue;
    const [source, , code] = propre.split(/\s+/);
    if (!source?.startsWith("/") || code === "200") continue;
    sources.push(source);
  }
  return sources;
}

/**
 * Chaque index.html du dossier, avec son chemin public ("/fr/contact/").
 * @param {string} dossier
 * @returns {{ fichier: string, chemin: string }[]}
 */
function pagesDuDossier(dossier) {
  /** @type {{ fichier: string, chemin: string }[]} */
  const pages = [];
  /** @param {string} ici */
  const parcourir = (ici) => {
    for (const nom of readdirSync(ici)) {
      const plein = join(ici, nom);
      if (statSync(plein).isDirectory()) parcourir(plein);
      else if (nom === "index.html") {
        const rel = relative(dossier, ici).split(sep).join("/");
        pages.push({ fichier: plein, chemin: rel ? `/${rel}/` : "/" });
      }
    }
  };
  parcourir(dossier);
  return pages;
}

/**
 * Ce que le site ecarte du plan : une expression, ou une liste de chemins
 * (NOINDEX_PATHS d'alohapixel.com : les pages de recherche, en noindex, que le
 * build ne fige pas et dont le HTML n'est donc pas relu).
 * @typedef {RegExp | readonly string[]} Exclure
 */

/**
 * @param {Exclure | undefined} exclure
 * @returns {RegExp | null}
 */
function enExpression(exclure) {
  if (!exclure) return null;
  if (exclure instanceof RegExp) return exclure;
  const chemins = exclure.map((c) => c.replace(/\/?$/, "/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return chemins.length > 0 ? new RegExp(`^(?:${chemins.join("|")})$`) : null;
}

/**
 * Le manifeste d'un dossier de build. Pur hormis la lecture du disque : le
 * self-check le joue sur un dossier jetable.
 * @param {string} dossier
 * @param {{ site?: string, exclure?: Exclure, aLaDemande?: string[], construit?: string }} options
 */
export function lireLeBuild(dossier, options = {}) {
  const exclure = enExpression(options.exclure);
  // Jamais au plan : les adresses internes (/_emdash, /_astro...) et les pages introuvables.
  /** @param {string} chemin */
  const interne = (chemin) => chemin.startsWith("/_") || /(^|\/)(404|500)\/$/.test(chemin);
  /** @type {{ chemin: string, alternatives?: Alternative[] }[]} */
  const pages = [];
  /** @type {{ chemin: string, raison: string }[]} */
  const ecartees = [];
  for (const { fichier, chemin } of pagesDuDossier(dossier).sort((a, b) => (a.chemin < b.chemin ? -1 : 1))) {
    if (interne(chemin)) continue;
    if (exclure?.test(chemin)) {
      ecartees.push({ chemin, raison: "exclue par le site" });
      continue;
    }
    const lue = lireLaPage(readFileSync(fichier, "utf8"), chemin, options.site);
    if (!lue.indexable) ecartees.push({ chemin, raison: lue.raison });
    else pages.push({ chemin, ...(lue.alternatives.length > 0 ? { alternatives: lue.alternatives } : {}) });
  }
  const figees = new Set(pages.map((p) => p.chemin));
  const aLaDemande = [...new Set((options.aLaDemande ?? []).map((c) => (c.endsWith("/") ? c : `${c}/`)))]
    .filter((c) => !interne(c) && !figees.has(c) && !exclure?.test(c))
    .sort();
  const fichierRedirections = join(dossier, "_redirects");
  const redirections = existsSync(fichierRedirections) ? sourcesDesRedirections(readFileSync(fichierRedirections, "utf8")) : [];
  return { construit: options.construit ?? new Date().toISOString(), pages, aLaDemande, redirections, ecartees };
}

/**
 * L'integration, a poser dans les integrations d'Astro, moteur allume :
 *   import { planFige } from "./src/moteur/seo/integration.mjs";
 *   integrations: [..., planFige({ exclure: NOINDEX_PATHS })]
 * @param {{ exclure?: Exclure }} [options]
 * @returns {import("astro").AstroIntegration}
 */
export function planFige(options = {}) {
  /** @type {string | undefined} */
  let site;
  /** @type {string[]} */
  let aLaDemande = [];
  return {
    name: "aloha:plan-fige",
    hooks: {
      "astro:config:done": ({ config }) => {
        site = config.site;
      },
      "astro:routes:resolved": ({ routes }) => {
        aLaDemande = routes
          .filter((r) => r.type === "page" && r.origin === "project" && !r.isPrerendered && r.params.length === 0 && typeof r.pathname === "string")
          .map((r) => /** @type {string} */ (r.pathname));
      },
      "astro:build:done": ({ dir, logger }) => {
        const dossier = fileURLToPath(dir);
        const manifeste = lireLeBuild(dossier, { site, exclure: options.exclure, aLaDemande });
        const cible = join(dossier, MANIFESTE_DU_BUILD.slice(1));
        mkdirSync(join(cible, ".."), { recursive: true });
        writeFileSync(cible, `${JSON.stringify(manifeste)}\n`);
        logger.info(`plan fige : ${manifeste.pages.length} pages figees, ${manifeste.aLaDemande.length} rendues a la demande, ${manifeste.ecartees.length} ecartees, ${manifeste.redirections.length} redirections`);
      },
    },
  };
}
