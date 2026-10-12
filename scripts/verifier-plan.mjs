#!/usr/bin/env node
// scripts/verifier-plan.mjs - relit le plan du site en ligne et verifie que chaque adresse dit vrai : 200, canonique = adresse, pas de noindex, pas de redirection. Code 1 si une adresse ment.
//
// Usage :
//   node scripts/verifier-plan.mjs https://alohapixel.com
//   node scripts/verifier-plan.mjs https://alohapixel.com/sitemap-moteur.xml --simultanees 1 --limite 50
//   node scripts/verifier-plan.mjs https://alohapixel.app --anciens
//
// Une origine seule part de /sitemap-index.xml et suit chaque plan qu'il cite.
// --anciens verifie en plus que les anciens noms (/sitemap.xml, /sitemap-0.xml,
// /sitemap-contenu.xml) repondent 301 vers l'index.
//
// DEUX REQUETES SIMULTANEES AU PLUS, jamais davantage, quoi qu'on demande :
// sur un site en production, six requetes paralleles ont deja fait rendre
// des 500 et des 503 aux vrais visiteurs (recette d'un grand site de la maison). Codes de
// sortie : 0 tout est vrai, 1 au moins une adresse ment, 2 commande ou plan
// illisible.

const PLAFOND = 2;
const AGENT = "aloha-verifier-plan/1.0 (+controle du plan du site)";

/** @param {string} message @returns {never} */
function arreter(message) {
  console.error(message);
  process.exit(2);
}

/** @param {string[]} argv */
function lireArguments(argv) {
  const options = { cible: /** @type {string | null} */ (null), simultanees: PLAFOND, limite: Infinity, anciens: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--simultanees") options.simultanees = Math.max(1, Math.min(PLAFOND, Number(argv[++i]) || PLAFOND));
    else if (a === "--limite") options.limite = Math.max(1, Number(argv[++i]) || Infinity);
    else if (a === "--anciens") options.anciens = true;
    else if (!a.startsWith("--") && !options.cible) options.cible = a;
    else arreter(`Argument inconnu : ${a}`);
  }
  if (!options.cible || !/^https?:\/\//.test(options.cible)) arreter("Usage : node scripts/verifier-plan.mjs <https://domaine ou adresse d'un plan> [--simultanees 1|2] [--limite N] [--anciens]");
  return { ...options, cible: /** @type {string} */ (options.cible) };
}

/** @param {string} t */
const desechapper = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** @param {string} adresse */
async function lire(adresse, methode = "GET") {
  return fetch(adresse, { method: methode, redirect: "manual", headers: { "user-agent": AGENT, accept: "text/html,application/xml;q=0.9,*/*;q=0.8" } });
}

/** Les adresses d'un plan ou d'un index (suivi recursivement). */
/**
 * @param {string} adresse
 * @param {Set<string>} [vus]
 * @returns {Promise<string[]>}
 */
async function adressesDuPlan(adresse, vus = new Set()) {
  if (vus.has(adresse)) return [];
  vus.add(adresse);
  const r = await lire(adresse);
  if (r.status !== 200) arreter(`${adresse} : le plan repond ${r.status}${r.headers.get("location") ? ` vers ${r.headers.get("location")}` : ""}.`);
  const type = r.headers.get("content-type") ?? "";
  if (!/xml/.test(type)) console.warn(`${adresse} : type ${type || "absent"}, attendu application/xml.`);
  const xml = await r.text();
  const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((m) => desechapper((m[1] ?? "").trim()));
  if (/<sitemapindex[\s>]/.test(xml)) {
    /** @type {string[]} */
    const toutes = [];
    for (const plan of locs) toutes.push(...(await adressesDuPlan(plan, vus)));
    return toutes;
  }
  if (!/<urlset[\s>]/.test(xml)) arreter(`${adresse} : ni urlset ni sitemapindex.`);
  return locs;
}

/** Les valeurs d'un attribut d'une balise, quel que soit l'ordre des attributs. */
/** @param {string} balise @param {string} nom @returns {string | null} */
function attribut(balise, nom) {
  const m = new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(balise);
  return m ? desechapper(m[1] ?? m[2] ?? "") : null;
}

/** Ce qu'une adresse dit d'elle-meme ; une liste vide veut dire qu'elle dit vrai. */
/** @param {string} adresse @returns {Promise<string[]>} */
async function controler(adresse) {
  /** @type {string[]} */
  const mensonges = [];
  let r;
  try {
    r = await lire(adresse);
  } catch (e) {
    return [`injoignable (${e instanceof Error ? e.message : String(e)})`];
  }
  if (r.status >= 300 && r.status < 400) return [`redirigee (${r.status} vers ${r.headers.get("location") ?? "?"})`];
  if (r.status !== 200) return [`repond ${r.status}`];
  if (/noindex/i.test(r.headers.get("x-robots-tag") ?? "")) mensonges.push("en-tete X-Robots-Tag noindex");
  const html = await r.text();
  const tete = html.split(/<\/head>/i)[0] ?? html;
  const metas = tete.match(/<meta\b[^>]*>/gi) ?? [];
  if (metas.some((m) => /^(robots|googlebot)$/i.test(attribut(m, "name") ?? "") && /noindex/i.test(attribut(m, "content") ?? ""))) mensonges.push("balise robots noindex");
  if (metas.some((m) => /^refresh$/i.test(attribut(m, "http-equiv") ?? ""))) mensonges.push("page de redirection (meta refresh)");
  const canonique = (tete.match(/<link\b[^>]*>/gi) ?? []).find((l) => /(^|\s)canonical(\s|$)/i.test(attribut(l, "rel") ?? ""));
  const href = canonique ? attribut(canonique, "href") : null;
  if (!href) mensonges.push("pas de canonique");
  else if (new URL(href, adresse).href !== adresse) mensonges.push(`canonique ailleurs (${new URL(href, adresse).href})`);
  return mensonges;
}

/**
 * @param {string[]} liste
 * @param {number} simultanees
 * @param {(adresse: string, i: number) => Promise<void>} travail
 */
async function enParallele(liste, simultanees, travail) {
  let suivant = 0;
  const voies = Array.from({ length: Math.min(simultanees, liste.length) }, async () => {
    while (suivant < liste.length) {
      const i = suivant++;
      await travail(/** @type {string} */ (liste[i]), i);
    }
  });
  await Promise.all(voies);
}

const options = lireArguments(process.argv.slice(2));
const depart = /\.xml(?:\?|$)/.test(options.cible) ? options.cible : new URL("/sitemap-index.xml", options.cible).href;
const origine = new URL(depart).origin;
let faux = 0;

if (options.anciens) {
  for (const ancien of ["/sitemap.xml", "/sitemap-0.xml", "/sitemap-contenu.xml"]) {
    const r = await lire(new URL(ancien, origine).href, "HEAD");
    const vers = r.headers.get("location") ?? "";
    if (r.status !== 301 || new URL(vers, origine).pathname !== "/sitemap-index.xml") {
      console.log(`MENT  ${ancien} : ${r.status}${vers ? ` vers ${vers}` : ""}, attendu 301 vers /sitemap-index.xml`);
      faux++;
    }
  }
}

const toutes = [...new Set(await adressesDuPlan(depart))];
const adresses = toutes.slice(0, options.limite);
console.log(`${toutes.length} adresses dans le plan (${depart}) ; ${adresses.length} relues, ${options.simultanees} a la fois.`);
const etrangeres = adresses.filter((a) => new URL(a).origin !== origine);
for (const a of etrangeres) {
  console.log(`MENT  ${a} : adresse d'un autre domaine que ${origine}`);
  faux++;
}
let faites = 0;
await enParallele(
  adresses.filter((a) => !etrangeres.includes(a)),
  options.simultanees,
  /** @param {string} adresse */
  async (adresse) => {
    const mensonges = await controler(adresse);
    faites++;
    if (mensonges.length > 0) {
      faux++;
      console.log(`MENT  ${adresse} : ${mensonges.join(" ; ")}`);
    }
    if (faites % 50 === 0) console.log(`... ${faites} / ${adresses.length}`);
  },
);
console.log(faux === 0 ? `Plan juste : ${adresses.length} adresses relues, toutes en 200, canoniques, indexables.` : `${faux} adresse(s) mentent sur ${adresses.length} relues.`);
process.exit(faux === 0 ? 0 : 1);
