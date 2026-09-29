// scripts/couverture-edition.mjs - l'inventaire de la barre d'edition : sur chaque page, en mode edition, ce qui est annote, ce qui vient du cadre (menus, reglages), ce qui reste au code, et ce qui est ORPHELIN.
//
// CE QUE LE SCRIPT PROUVE. Le moteur allume, un editeur qui bascule "Edit"
// doit pouvoir toucher chaque texte et chaque image qu'il voit. Ce script
// ouvre chaque page dans Chromium avec une session d'editeur et le cookie du
// mode edition, puis classe chaque noeud de texte visible et chaque image :
//   - annote : sous un element data-emdash-ref qui nomme un champ (la barre
//     l'edite, dans la page ou au back office) ;
//   - cadre : sous un element data-aloha-cadre, pose en mode edition seulement
//     sur ce qui vient d'un menu ou d'un reglage du site (le panneau "Cadre
//     du site" y mene) ;
//   - hors base : un texte de HORS_BASE (src/moteur/contenu.sections.ts),
//     donc laisse au code avec sa raison, une phrase a jetons comprise
//     ("{count} posts" vaut pour "8 posts", et chacun de ses morceaux fixes) ;
//     le nom d'une langue du selecteur de langue (localeMeta, une commande de
//     l'interface) ; un texte sans lettre (un numero, une annee, une
//     ponctuation), que personne ne redige ; ou tout ce qui est sous une
//     commande de l'interface marquee en mode edition : data-aloha-interface
//     (marqueInterface de cadre.ts), ou data-aloha-cadre="interface" ;
//   - decor : un texte d'une maquette decorative, sous un element
//     aria-hidden="true" (le faux ecran d'un produit, une bulle de
//     demonstration), que le brief laisse au code avec l'habillage ; une
//     image ou une video n'est jamais du decor : elle se remplace (Aloha) ;
//   - edition : le libelle d'une pastille (data-aloha-pastilles), qui
//     n'existe qu'en mode edition et nomme ce qu'elle modifie ;
//   - orphelin : tout le reste. Le resultat exige est ZERO orphelin.
// La barre d'EmDash elle-meme (#emdash-toolbar) est ignoree. Un texte riche
// (Portable Text) monte par l'editeur integre d'EmDash (l'ilot
// InlinePortableTextEditor) s'edite seul, dans la page : il compte comme
// annote.
//
//   node scripts/couverture-edition.mjs --url http://localhost:4381 [--session <cookie>] [--json <fichier>] [--adresses /,/fr/]
//
// Sans --session, la porte de developpement d'astro dev ouvre la session
// (voir navigateur.mjs). Le code de sortie vaut 1 des qu'une page a un
// orphelin.
import { writeFileSync } from "node:fs";
import { register } from "node:module";
import { HORS_BASE } from "../src/moteur/contenu.sections.ts";
import { chargerLesTextes } from "../src/moteur/textes.node.mjs";
import { arguments_, contexteEditeur, ouvrirChromium } from "./navigateur.mjs";

const { nommes } = arguments_();
const url = (nommes.url ?? "http://localhost:4381").replace(/\/$/, "");

/**
 * Les adresses de chaque page geree, dans les deux langues, la page
 * introuvable comprise. Le theme les declare dans son adaptateur
 * (ADRESSES_DE_COUVERTURE de src/moteur/theme.ts) ; sans elles, celles de
 * Swell, le modele (le socle ne connait pas les pages d'un theme).
 */
const ADRESSES_DU_MODELE = ["/", "/fr/", "/about/", "/fr/about/", "/contact/", "/fr/contact/", "/legal/", "/fr/legal/", "/nope/", "/fr/nope/"];
// theme.ts lit ses alias (@config/...) : le crochet de resolution d'abord.
register("../src/moteur/resolution.node.mjs", import.meta.url);
const { ADRESSES_DE_COUVERTURE } = await import("../src/moteur/theme.ts");
// --adresses /a/,/b/ : ne parcourt que celles-la (mise au point d'une page).
export const ADRESSES = nommes.adresses ? nommes.adresses.split(",") : Array.isArray(ADRESSES_DE_COUVERTURE) ? ADRESSES_DE_COUVERTURE : ADRESSES_DU_MODELE;

/** Toutes les phrases sous un chemin du dictionnaire : "nav" donne chaque libelle de la navigation. */
function phrasesSous(objet) {
  if (typeof objet === "string") return [objet];
  if (typeof objet === "number") return [String(objet)];
  if (Array.isArray(objet)) return objet.flatMap(phrasesSous);
  if (objet && typeof objet === "object") return Object.values(objet).flatMap(phrasesSous);
  return [];
}

/** Lit "a.b.*.c" dans les textes, un "*" valant chaque rang d'une liste. */
function lireAvecJoker(objet, chemin) {
  if (objet === undefined || objet === null) return [];
  if (chemin === "") return [objet];
  const [tete, ...reste] = chemin.split(".");
  if (tete === "*") return (Array.isArray(objet) ? objet : []).flatMap((e) => lireAvecJoker(e, reste.join(".")));
  return lireAvecJoker(objet[tete], reste.join("."));
}

/** Les textes que HORS_BASE laisse au code, dans les deux langues, normalises, et les noms des langues du selecteur. */
async function textesHorsBase() {
  const textes = await chargerLesTextes();
  const phrases = new Set();
  const { localeMeta } = await import("../src/i18n/config.ts");
  for (const meta of Object.values(localeMeta)) for (const nom of [meta.label, meta.short]) phrases.add(nom);
  for (const langue of Object.values(textes)) {
    for (const { chemin } of HORS_BASE) {
      for (const valeur of lireAvecJoker(langue, chemin)) for (const phrase of phrasesSous(valeur)) phrases.add(normaliser(phrase));
    }
  }
  return phrases;
}

const normaliser = (texte) => String(texte).replace(/\s+/g, " ").trim();

/**
 * Les phrases a jetons de HORS_BASE, en expressions : "{count} posts" vaut
 * pour "8 posts", et chacun de ses morceaux fixes ("posts") pour le cas ou le
 * gabarit coupe la phrase en deux balises.
 */
function gabaritsHorsBase(phrases) {
  const echapper = (x) => x.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const jeton = /\{[a-zA-Z]+\}/;
  return [...phrases]
    .filter((p) => jeton.test(p))
    .flatMap((p) => {
      const morceaux = p.split(new RegExp(jeton, "g"));
      const fixes = morceaux.map((m) => m.trim()).filter((m) => /\p{L}/u.test(m));
      return [new RegExp(`^${morceaux.map(echapper).join(".+")}$`, "u"), ...fixes.map((m) => new RegExp(`^${echapper(m)}$`, "u"))];
    });
}

/**
 * Le releve d'une page, execute dans le navigateur : chaque noeud de texte
 * visible et chaque image, avec sa classe (annote, cadre, ou "a classer") et
 * l'endroit ou il est.
 */
function releverDansLaPage() {
  const visible = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const style = getComputedStyle(e);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"].includes(e.tagName)) return false;
      if (e.id === "emdash-toolbar" || e.closest("#emdash-toolbar, #emdash-img-popover")) return false;
    }
    return true;
  };
  const classer = (el, texte) => {
    let cache = false;
    for (let e = el; e; e = e.parentElement) {
      // L'editeur integre d'EmDash (texte riche) : il edite son champ en place,
      // son ilot porte le champ dans ses props, pas en attribut.
      if (e.tagName === "ASTRO-ISLAND" && e.getAttribute("component-export") === "InlinePortableTextEditor") return "annote";
      if (e.getAttribute?.("aria-hidden") === "true") cache = true;
      const ref = e.getAttribute?.("data-emdash-ref");
      if (ref) {
        try {
          if (JSON.parse(ref).field) return "annote";
        } catch {}
      }
      // Une commande de l'interface laissee au code (filtres, tris, compteurs,
      // fil d'Ariane), marquee en mode edition : rangee avec ce qui reste au code.
      if (e.hasAttribute?.("data-aloha-interface") || e.getAttribute?.("data-aloha-cadre") === "interface") return "interface";
      if (e.hasAttribute?.("data-aloha-cadre")) return "cadre";
      if (e.hasAttribute?.("data-aloha-pastilles")) return "edition";
    }
    return texte && cache ? "decor" : "a-classer";
  };
  const chemin = (el) => {
    const morceaux = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      morceaux.unshift(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : ""));
      if (morceaux.length >= 5) break;
    }
    return morceaux.join(" > ");
  };
  const releves = [];
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let noeud = marcheur.nextNode(); noeud; noeud = marcheur.nextNode()) {
    const texte = noeud.textContent.replace(/\s+/g, " ").trim();
    if (!texte) continue;
    const parent = noeud.parentElement;
    if (!parent || !visible(parent)) continue;
    releves.push({ sorte: "texte", texte, classe: classer(parent, true), ou: chemin(parent) });
  }
  for (const img of document.querySelectorAll("img, video, source")) {
    if (!visible(img)) continue;
    const src = img.currentSrc || img.getAttribute("src") || img.getAttribute("srcset") || img.dataset.src || "";
    // Une source d'un <picture> suit l'image qu'elle alimente (l'annotation est sur l'img).
    const cible = img.tagName === "SOURCE" && img.parentElement?.tagName === "PICTURE" ? (img.parentElement.querySelector("img") ?? img) : img;
    releves.push({ sorte: img.tagName.toLowerCase(), texte: src.slice(0, 80), classe: classer(cible, false), ou: chemin(img) });
  }
  const annotations = [...document.querySelectorAll("[data-emdash-ref]")].map((e) => JSON.parse(e.getAttribute("data-emdash-ref")));
  return {
    entrees: annotations.filter((a) => !a.field).length,
    champs: annotations.filter((a) => a.field).length,
    barre: document.querySelector("#emdash-toolbar")?.getAttribute("data-edit-mode") ?? null,
    releves,
  };
}

const horsBase = await textesHorsBase();
const gabarits = gabaritsHorsBase(horsBase);
const estHorsBase = (texte) => horsBase.has(texte) || horsBase.has(texte.replace(/[,.;:]$/, "")) || gabarits.some((g) => g.test(texte)) || !/\p{L}/u.test(texte);
const navigateur = await ouvrirChromium();
const contexte = await contexteEditeur(navigateur, { url, session: nommes.session });
const page = await contexte.newPage();

const rapport = [];
let orphelinsEnTout = 0;
for (const adresse of ADRESSES) {
  await page.goto(url + adresse, { waitUntil: "networkidle" });
  const releve = await page.evaluate(releverDansLaPage);
  const compte = { annote: 0, cadre: 0, edition: 0, decor: 0, horsBase: 0, orphelins: [] };
  for (const r of releve.releves) {
    if (r.classe === "annote") compte.annote++;
    else if (r.classe === "cadre") compte.cadre++;
    else if (r.classe === "edition") compte.edition++;
    else if (r.classe === "interface") compte.horsBase++;
    else if (r.classe === "decor") compte.decor++;
    else if (r.sorte === "texte" && estHorsBase(r.texte)) compte.horsBase++;
    else compte.orphelins.push(r);
  }
  orphelinsEnTout += compte.orphelins.length;
  rapport.push({ adresse, barre: releve.barre, entrees: releve.entrees, champs: releve.champs, ...compte });
  console.log(
    `${adresse.padEnd(14)} barre=${releve.barre}  entrees=${String(releve.entrees).padStart(3)}  champs=${String(releve.champs).padStart(4)}  ` +
      `annotes=${String(compte.annote).padStart(4)}  cadre=${String(compte.cadre).padStart(3)}  pastilles=${String(compte.edition).padStart(3)}  decor=${String(compte.decor).padStart(3)}  hors-base=${String(compte.horsBase).padStart(3)}  orphelins=${compte.orphelins.length}`,
  );
  for (const o of compte.orphelins) console.log(`    ! ${o.sorte} "${o.texte.slice(0, 70)}"  (${o.ou})`);
}

await navigateur.close();
if (nommes.json) writeFileSync(nommes.json, JSON.stringify(rapport, null, 2));
console.log(`\n${orphelinsEnTout} element(s) orphelin(s) sur ${ADRESSES.length} pages.`);
process.exit(orphelinsEnTout > 0 ? 1 : 0);
