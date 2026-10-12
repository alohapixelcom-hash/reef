// src/moteur/seo/donnees.ts - le controle des donnees structurees (JSON-LD) d'une page : les types qu'elle porte, ceux qu'on attend d'elle, et les proprietes que Google exige pour un resultat enrichi.
//
// Les exigences viennent de la documentation de Google (Search Central,
// "Structured data" : Product, Article, BreadcrumbList, FAQPage,
// LocalBusiness, Organization), reduites aux proprietes obligatoires ou
// recommandees qu'un oubli fait perdre. FAQPage n'a plus de resultat enrichi
// que pour les sites d'autorite et de sante (Google, aout 2023) : elle reste
// controlee si elle est la, jamais exigee. Pur, sans dependance.
import type { Controle } from "./audit.ts";

/** Ce qu'est une page, d'apres la collection qui la porte ou son adresse ; decide des types attendus. */
export type SorteDePage = "accueil" | "produit" | "article" | "rayon" | "page";

type Noeud = Record<string, unknown>;

/** Tous les noeuds d'un ou plusieurs blocs JSON-LD, @graph et noeuds imbriques compris. */
export function noeuds(blocs: unknown[]): Noeud[] {
  const sortie: Noeud[] = [];
  const visiter = (v: unknown, profondeur: number) => {
    if (profondeur > 6 || v === null || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach((x) => visiter(x, profondeur + 1));
    const n = v as Noeud;
    if (n["@type"]) sortie.push(n);
    for (const [cle, x] of Object.entries(n)) if (cle !== "@context") visiter(x, profondeur + 1);
  };
  blocs.forEach((b) => visiter(b, 0));
  return sortie;
}

/** Les types d'un noeud ("Product", ["LocalBusiness", "Store"]). */
export const typesDe = (n: Noeud): string[] => (Array.isArray(n["@type"]) ? (n["@type"] as unknown[]).map(String) : [String(n["@type"])]);

/** Les sous-types de LocalBusiness qu'un site de la maison emploie. */
const COMMERCES = /^(LocalBusiness|Store|Restaurant|CafeOrCoffeeShop|FoodEstablishment|Bakery|ClothingStore|JewelryStore|ProfessionalService|HealthAndBeautyBusiness|LodgingBusiness|TravelAgency|SportsActivityLocation|Winery)$/;
const ARTICLES = /^(Article|BlogPosting|NewsArticle)$/;

const rempli = (v: unknown): boolean => (typeof v === "string" ? v.trim() !== "" : typeof v === "number" ? true : Array.isArray(v) ? v.length > 0 : v !== null && typeof v === "object");
const manquantes = (n: Noeud, cles: string[]) => cles.filter((k) => !rempli(n[k]));

function offres(n: Noeud): Noeud[] {
  const o = n.offers;
  return (Array.isArray(o) ? o : o ? [o] : []).filter((x): x is Noeud => typeof x === "object" && x !== null);
}

const ctl = (id: string, gravite: Controle["gravite"], ok: boolean, titre: string, constat: string, correction: string): Controle => ({ id, gravite, ok, titre, constat, correction });

/** Les controles des donnees structurees d'une page. */
export function controlerLesDonnees(blocs: unknown[], illisibles: number, sorte: SorteDePage): Controle[] {
  const r: Controle[] = [];
  const tous = noeuds(blocs);
  const avec = (re: RegExp) => tous.filter((n) => typesDe(n).some((t) => re.test(t)));
  const presents = [...new Set(tous.flatMap(typesDe))];
  if (illisibles) r.push(ctl("jsonld-lisible", "important", false, "Les données structurées sont lisibles", `${illisibles} bloc${illisibles > 1 ? "s" : ""} JSON-LD illisible${illisibles > 1 ? "s" : ""}.`, "Corriger le gabarit qui écrit ce bloc : Google l'ignore entièrement."));

  if (sorte === "accueil") {
    const orga = avec(/^(Organization|Corporation|OnlineBusiness|OnlineStore|NGO|EducationalOrganization)$/).concat(avec(COMMERCES));
    r.push(ctl("jsonld-organisation", "important", orga.length > 0, "L'accueil présente l'entreprise (Organization ou LocalBusiness)", orga.length ? `Présent : ${typesDe(orga[0]!).join(", ")}.` : `Types présents : ${presents.join(", ") || "aucun"}.`, "Ajouter un nœud Organization (ou LocalBusiness pour un commerce avec adresse) sur l'accueil : nom, logo, adresse du site, réseaux (sameAs)."));
    for (const n of orga) {
      const exige = typesDe(n).some((t) => COMMERCES.test(t)) ? ["name", "address", "url", "telephone"] : ["name", "url", "logo"];
      const trous = manquantes(n, exige);
      r.push(ctl("jsonld-organisation-champs", "conseil", trous.length === 0, "La fiche de l'entreprise est complète", trous.length ? `Manque : ${trous.join(", ")}.` : "Nom, adresse et coordonnées présents.", "Compléter la fiche dans le gabarit de l'accueil (les mêmes coordonnées que la fiche Google Business)."));
    }
  }

  const produits = avec(/^(Product|ProductGroup)$/);
  if (sorte === "produit" || produits.length) {
    r.push(ctl("jsonld-produit", sorte === "produit" ? "important" : "conseil", produits.length > 0, "La fiche produit est décrite (Product)", produits.length ? "Product présent." : `Types présents : ${presents.join(", ") || "aucun"}.`, "Le gabarit produit doit écrire un nœud Product : nom, image, description, offre."));
    // Un controle pour tous les produits de la page : une liste de produits n'en fait pas douze lignes.
    const trousP = new Set<string>();
    let incompletsP = 0;
    let exemple = "";
    for (const p of produits) {
      const o = offres(p);
      const trous = [...manquantes(p, ["name", "image"]), ...(o.length ? [] : ["offers"])];
      const offre = o[0];
      const prix = offre && (rempli(offre.price) || rempli(offre.lowPrice));
      const dispo = offre && typeof offre.availability === "string" && /schema\.org\/(InStock|OutOfStock|PreOrder|BackOrder|LimitedAvailability|SoldOut|Discontinued|InStoreOnly|OnlineOnly|PreSale)$/.test(offre.availability);
      if (offre && !prix) trous.push("offers.price");
      if (offre && !rempli(offre.priceCurrency)) trous.push("offers.priceCurrency");
      if (offre && !dispo) trous.push("offers.availability");
      if (trous.length) incompletsP += 1;
      trous.forEach((t) => trousP.add(t));
      if (!exemple && offre) exemple = `Prix ${String(offre.price ?? offre.lowPrice)} ${String(offre.priceCurrency)}, ${String(offre.availability).split("/").pop()}.`;
    }
    if (produits.length) {
      const constat = trousP.size ? `Manque : ${[...trousP].join(", ")}.${produits.length > 1 ? ` (${incompletsP} produit${incompletsP > 1 ? "s" : ""} sur ${produits.length})` : ""}` : exemple || "Complet.";
      r.push(ctl("jsonld-produit-champs", sorte === "produit" ? "important" : "conseil", trousP.size === 0, "Le produit a son prix, sa devise et sa disponibilité", constat, "Sans prix, devise et disponibilité, Google ne montre pas le prix sous le résultat : compléter l'offre dans le gabarit produit."));
    }
  }

  const articles = avec(ARTICLES);
  if (sorte === "article" || articles.length) {
    r.push(ctl("jsonld-article", sorte === "article" ? "important" : "conseil", articles.length > 0, "L'article est décrit (Article ou BlogPosting)", articles.length ? `${typesDe(articles[0]!).join(", ")} présent.` : `Types présents : ${presents.join(", ") || "aucun"}.`, "Le gabarit d'article doit écrire un nœud Article : titre, image, dates, auteur."));
    const trousA = new Set<string>();
    let incompletsA = 0;
    for (const a of articles) {
      const trous = manquantes(a, ["headline", "image", "datePublished", "author"]);
      if (trous.length) incompletsA += 1;
      trous.forEach((t) => trousA.add(t));
    }
    if (articles.length) {
      const constat = trousA.size ? `Manque : ${[...trousA].join(", ")}.${articles.length > 1 ? ` (${incompletsA} article${incompletsA > 1 ? "s" : ""} sur ${articles.length})` : ""}` : "Titre, image, date et auteur présents.";
      r.push(ctl("jsonld-article-champs", sorte === "article" ? "important" : "conseil", trousA.size === 0, "L'article a son titre, son image, sa date et son auteur", constat, "Compléter le nœud Article dans le gabarit (dateModified aussi, si l'article change)."));
    }
  }

  const fils = avec(/^BreadcrumbList$/);
  if (sorte !== "accueil") {
    const elements = (fils[0]?.itemListElement as unknown[] | undefined) ?? [];
    const ok = fils.length > 0 && Array.isArray(elements) && elements.length >= 2 && elements.every((e, i) => typeof e === "object" && e !== null && Number((e as Noeud).position) === i + 1 && rempli((e as Noeud).name));
    r.push(ctl("jsonld-fil", "conseil", ok, "Le fil d'Ariane est décrit (BreadcrumbList)", fils.length ? (ok ? `${elements.length} niveaux.` : "Présent mais incomplet (positions ou noms).") : "Absent.", "Le gabarit doit écrire un BreadcrumbList : chaque niveau avec position (1, 2, 3...), nom et adresse ; Google l'affiche à la place de l'adresse."));
  }

  for (const f of avec(/^FAQPage$/)) {
    const q = (Array.isArray(f.mainEntity) ? f.mainEntity : f.mainEntity ? [f.mainEntity] : []) as Noeud[];
    const ok = q.length > 0 && q.every((x) => rempli(x?.name) && rempli((x?.acceptedAnswer as Noeud | undefined)?.text));
    r.push(ctl("jsonld-faq", "conseil", ok, "Les questions fréquentes sont complètes (FAQPage)", ok ? `${q.length} questions.` : "Une question sans texte de réponse.", "Chaque question doit porter sa réponse (acceptedAnswer.text), identique au texte visible."));
  }
  return r;
}
