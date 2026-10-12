// src/moteur/seo/audit.ts - l'audit SEO d'une page rendue : ce que le HTML dit (title, description, titres, images, liens, canonique, robots, hreflang, donnees structurees), les controles qui en decoulent, la note, l'apercu Google et les doublons du site.
//
// PUR ET SANS DOM : le Worker n'a pas de DOM, le self-check non plus. Le HTML
// est lu par expressions, assez pour les balises qu'un site de la maison
// ecrit (attributs entre guillemets, dans n'importe quel ordre). Le meme
// module part dans le navigateur (audit.tsx) pour les doublons et l'apercu.
//
// CE QUE L'AUDIT NE PROMET PAS. Aucun outil ne garantit une place dans Google.
// Les controles sont ceux que Google documente (Search Central : title,
// meta description, titres, alt, canonique, hreflang, donnees structurees)
// et des seuils de la maison, dits comme tels : 30 a 60 caracteres pour un
// title, 70 a 160 pour une description, 300 mots pour une page de contenu.
// Les longueurs de l'apercu sont celles qu'affiche Google en general, pas
// une regle : Google tronque au pixel et reecrit parfois ses extraits.
import { controlerLesDonnees, type SorteDePage } from "./donnees.ts";

export type Gravite = "bloquant" | "important" | "conseil";

export interface Controle {
  id: string;
  gravite: Gravite;
  ok: boolean;
  /** Ce qui est verifie, en mots du client. */
  titre: string;
  /** Ce qui a ete trouve. */
  constat: string;
  /** Ce qu'il faut faire quand le controle echoue. */
  correction: string;
}

export interface Lecture {
  langue: string | null;
  title: string | null;
  description: string | null;
  robots: string | null;
  canonique: string | null;
  hreflang: { langue: string; href: string }[];
  titres: { niveau: number; texte: string }[];
  /** `decorative` : aria-hidden="true" ou role="presentation", que le lecteur d'ecran saute deja. */
  images: { src: string; alt: string | null; decorative: boolean }[];
  liensInternes: number;
  liensExternes: number;
  mots: number;
  premierParagraphe: string;
  donnees: unknown[];
  donneesIllisibles: number;
  ogImage: string | null;
}

/** La valeur d'un attribut ; un attribut nu (`<img alt>`, ce qu'Astro ecrit pour alt="") vaut la chaine vide. */
const attribut = (balise: string, nom: string): string | null => {
  const m = new RegExp(`\\s${nom}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(balise);
  if (m) return decoder(m[2] ?? m[3] ?? m[4] ?? "");
  // Les valeurs entre guillemets sont videes d'abord : class="a alt b" ne porte pas d'attribut alt.
  return new RegExp(`\\s${nom}(?=[\\s/>])`, "i").test(balise.replace(/"[^"]*"|'[^']*'/g, '""')) ? "" : null;
};

/** Les entites HTML courantes et numeriques. */
export function decoder(texte: string): string {
  return texte
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const sansBalises = (html: string) => decoder(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const balises = (html: string, nom: string) => html.match(new RegExp(`<${nom}\\b[^>]*>`, "gi")) ?? [];

/** Lit une page HTML rendue. `origine` decide ce qu'est un lien interne. */
export function lirePage(html: string, origine: string): Lecture {
  const tete = /<head\b[\s\S]*?<\/head>/i.exec(html)?.[0] ?? html;
  const metas = balises(tete, "meta");
  const meta = (nom: string) => {
    const b = metas.find((m) => (attribut(m, "name") ?? attribut(m, "property") ?? "").toLowerCase() === nom);
    return b ? attribut(b, "content") : null;
  };
  const liens = balises(tete, "link");
  const canon = liens.find((l) => (attribut(l, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"));
  const hreflang = liens
    .filter((l) => (attribut(l, "rel") ?? "").toLowerCase() === "alternate" && attribut(l, "hreflang"))
    .map((l) => ({ langue: attribut(l, "hreflang") ?? "", href: attribut(l, "href") ?? "" }));
  // Le corps sans ce qui n'est pas du contenu lu par le visiteur.
  const corps = (/<body\b[\s\S]*<\/body>/i.exec(html)?.[0] ?? html).replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ");
  const principal = /<main\b[\s\S]*?<\/main>/i.exec(corps)?.[0] ?? corps.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, " ");
  const titres = [...corps.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ niveau: Number(m[1]), texte: sansBalises(m[2] ?? "") }));
  const images = balises(corps, "img").map((b) => ({ src: attribut(b, "src") ?? "", alt: attribut(b, "alt"), decorative: attribut(b, "aria-hidden") === "true" || /^(presentation|none)$/.test(attribut(b, "role") ?? "") }));
  const hote = new URL(origine).host;
  let internes = 0;
  let externes = 0;
  for (const a of balises(principal, "a")) {
    const href = attribut(a, "href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      if (new URL(href, origine).host === hote) internes += 1;
      else externes += 1;
    } catch {
      // Une adresse illisible ne compte pas.
    }
  }
  const donnees: unknown[] = [];
  let illisibles = 0;
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      donnees.push(JSON.parse(m[1] ?? ""));
    } catch {
      illisibles += 1;
    }
  }
  const texte = sansBalises(principal);
  const titreBrut = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(tete)?.[1];
  return {
    langue: attribut(/<html\b[^>]*>/i.exec(html)?.[0] ?? "", "lang"),
    title: titreBrut === undefined ? null : sansBalises(titreBrut),
    description: meta("description"),
    robots: meta("robots"),
    canonique: canon ? attribut(canon, "href") : null,
    hreflang,
    titres,
    images,
    liensInternes: internes,
    liensExternes: externes,
    mots: texte ? texte.split(" ").filter((m) => /[\p{L}\p{N}]/u.test(m)).length : 0,
    premierParagraphe: sansBalises(/<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(principal)?.[1] ?? ""),
    donnees,
    donneesIllisibles: illisibles,
    ogImage: meta("og:image"),
  };
}

/** Minuscules sans accents : une comparaison de mots qui ne depend pas de la casse ni des accents. */
export function plier(texte: string): string {
  return texte.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface ContexteDeLaPage {
  /** L'adresse absolue demandee. */
  adresse: string;
  statut: number;
  /** L'en-tete X-Robots-Tag de la reponse. */
  robotsEntete: string | null;
  dansLePlan: boolean;
  sorte: SorteDePage;
  motCle?: string | null;
}

const c = (id: string, gravite: Gravite, ok: boolean, titre: string, constat: string, correction: string): Controle => ({ id, gravite, ok, titre, constat, correction });
const sansBarre = (u: string) => u.replace(/\/+$/, "");

/** Les controles d'une page lue. Le premier echec bloquant suffit a sortir la page de Google : il passe devant. */
export function controler(l: Lecture, x: ContexteDeLaPage): Controle[] {
  const r: Controle[] = [];
  const noindex = /noindex/i.test(`${l.robots ?? ""} ${x.robotsEntete ?? ""}`);
  r.push(c("statut", "bloquant", x.statut === 200, "La page répond", `Code ${x.statut}.`, "Une page à référencer doit répondre 200 : corriger l'adresse ou poser une redirection dans Redirections."));
  r.push(c("indexable", "bloquant", !noindex, "Google a le droit de l'indexer", noindex ? "La page demande à ne pas être indexée (noindex)." : "Indexable.", "Décocher « Masquer aux moteurs de recherche » dans le panneau SEO de la page, si elle doit apparaître dans Google."));
  // Le chemin seul est compare : un apercu (pages.dev) ou un essai local porte la canonique du domaine final, et c'est juste.
  const canon = l.canonique ? new URL(l.canonique, x.adresse) : null;
  const ici = new URL(x.adresse);
  const autreDomaine = canon && canon.host !== ici.host ? ` (domaine ${canon.host}, à vérifier s'il n'est pas le domaine final du site)` : "";
  r.push(c("canonique", "bloquant", canon !== null && sansBarre(canon.pathname) === sansBarre(ici.pathname), "L'adresse canonique est la page elle-même", canon ? `Canonique : ${canon.href}${autreDomaine}` : "Aucune balise canonique.", canon ? "La canonique désigne une autre adresse : Google indexera celle-là. Vider le champ « Adresse canonique » du panneau SEO si c'est une erreur." : "Ajouter la balise canonique (gabarit du site)."));
  r.push(c("plan", "important", x.dansLePlan || noindex, "La page est dans le plan du site", x.dansLePlan ? "Présente dans /sitemap-moteur.xml." : "Absente du plan.", "Publier la page, ou signaler au webmestre qu'une collection manque au plan (site.ts)."));
  const t = l.title ?? "";
  r.push(c("title", "bloquant", t.length > 0, "La page a un titre (title)", t ? `« ${t} »` : "Aucun title.", "Renseigner le titre SEO dans le panneau SEO de la page."));
  if (t) r.push(c("title-longueur", "important", t.length >= 30 && t.length <= 60, "Le titre fait 30 à 60 caractères", `${t.length} caractères.`, t.length < 30 ? "Allonger le titre : ce que la page offre, le lieu ou la marque." : "Raccourcir le titre : Google le coupe vers 60 caractères."));
  const d = l.description ?? "";
  r.push(c("description", "important", d.length > 0, "La page a une description", d ? `« ${d} »` : "Aucune meta description.", "Écrire la description dans le panneau SEO : elle est souvent reprise sous le titre dans Google."));
  if (d) r.push(c("description-longueur", "conseil", d.length >= 70 && d.length <= 160, "La description fait 70 à 160 caractères", `${d.length} caractères.`, d.length < 70 ? "Étoffer la description : un bénéfice et une incitation à cliquer." : "Raccourcir : Google la coupe vers 160 caractères."));
  const h1 = l.titres.filter((h) => h.niveau === 1);
  r.push(c("h1", "important", h1.length === 1, "Un seul titre principal (H1)", h1.length === 0 ? "Aucun H1." : h1.length === 1 ? `H1 : « ${h1[0]?.texte} »` : `${h1.length} H1 : ${h1.map((h) => `« ${h.texte} »`).join(", ")}.`, h1.length === 0 ? "Donner un titre principal à la page (premier bloc de titre)." : "Garder un seul H1 : les autres passent en titre de section (H2)."));
  const sauts = l.titres.filter((h, i) => i > 0 && h.niveau > (l.titres[i - 1]?.niveau ?? 1) + 1);
  r.push(c("hierarchie", "conseil", sauts.length === 0, "Les titres se suivent sans sauter de niveau", sauts.length ? `Saut vers H${sauts[0]?.niveau} après H${l.titres[l.titres.indexOf(sauts[0]!) - 1]?.niveau} (« ${sauts[0]?.texte} »).` : `${l.titres.length} titres en ordre.`, "Un H3 suit un H2, un H2 suit le H1 : corriger le niveau des titres concernés."));
  const sansAlt = l.images.filter((i) => i.alt === null && !i.decorative);
  const decoSansAlt = l.images.filter((i) => i.alt === null && i.decorative);
  if (decoSansAlt.length) r.push(c("alt-decoratif", "conseil", false, "Les images décoratives portent alt=\"\"", `${decoSansAlt.length} image${decoSansAlt.length > 1 ? "s" : ""} masquée${decoSansAlt.length > 1 ? "s" : ""} aux lecteurs d'écran sans attribut alt.`, "Ajouter alt=\"\" à ces images dans le gabarit : le HTML l'exige, Google l'attend."));
  r.push(c("alt", "important", sansAlt.length === 0, "Chaque image a un texte alternatif", sansAlt.length ? `${sansAlt.length} image${sansAlt.length > 1 ? "s" : ""} sans alt sur ${l.images.length}.` : `${l.images.length} image${l.images.length > 1 ? "s" : ""}, toutes décrites ou marquées décoratives.`, "Décrire chaque photo dans Médias (champ « Texte alternatif »)."));
  const mince = x.sorte === "accueil" || x.sorte === "rayon" ? 150 : 300;
  r.push(c("contenu", "important", l.mots >= mince, `Assez de texte (${mince} mots au moins)`, `${l.mots} mots dans le contenu principal.`, "Une page mince se classe mal : ajouter des informations utiles (usages, questions fréquentes, détails)."));
  r.push(c("liens", "conseil", l.liensInternes >= 2, "La page renvoie vers d'autres pages du site", `${l.liensInternes} lien${l.liensInternes > 1 ? "s" : ""} interne${l.liensInternes > 1 ? "s" : ""} dans le contenu.`, "Ajouter des liens vers les pages proches (produits, articles, rayon)."));
  if (l.hreflang.length) {
    const soi = l.hreflang.some((h) => sansBarre(new URL(h.href, x.adresse).pathname) === sansBarre(ici.pathname));
    r.push(c("hreflang", "important", soi && l.hreflang.some((h) => h.langue === "x-default"), "Les langues se désignent entre elles", `${l.hreflang.length} alternatives (${l.hreflang.map((h) => h.langue).join(", ")}).`, "Chaque version doit se citer elle-même et citer x-default : à corriger dans le gabarit du site."));
  }
  r.push(c("langue", "conseil", Boolean(l.langue), "La langue de la page est déclarée", l.langue ? `lang="${l.langue}"` : "Aucun attribut lang.", "Déclarer la langue sur la balise html (gabarit du site)."));
  r.push(c("partage", "conseil", Boolean(l.ogImage), "La page a une image de partage", l.ogImage ? "og:image présente." : "Aucune og:image.", "Choisir une image de partage dans le panneau SEO de la page."));
  if (x.motCle?.trim()) {
    const m = plier(x.motCle);
    const dans = (s: string | null | undefined) => plier(s ?? "").includes(m);
    const ou = [dans(t) && "titre", dans(h1[0]?.texte) && "H1", dans(d) && "description", dans(l.premierParagraphe) && "premier paragraphe", dans(new URL(x.adresse).pathname.replace(/[-/]/g, " ")) && "adresse"].filter(Boolean) as string[];
    r.push(c("mot-cle", "important", dans(t) && dans(h1[0]?.texte), `Le mot clé « ${x.motCle.trim()} » est au bon endroit`, ou.length ? `Présent dans : ${ou.join(", ")}.` : "Absent du titre, du H1, de la description et du premier paragraphe.", "Placer le mot clé dans le titre SEO et dans le H1, puis dans la description et la première phrase, sans le répéter à l'excès."));
  }
  r.push(...controlerLesDonnees(l.donnees, l.donneesIllisibles, x.sorte));
  return r;
}

const POIDS: Record<Gravite, number> = { bloquant: 25, important: 10, conseil: 3 };

/**
 * La note sur 100 : la part des points gagnes, chaque controle pesant selon
 * sa gravite (25, 10, 3). Un seul echec bloquant plafonne la note a 40 :
 * une page que Google ne peut pas indexer n'est jamais "presque bonne".
 */
export function noter(controles: Controle[]): number {
  const total = controles.reduce((s, k) => s + POIDS[k.gravite], 0);
  if (total === 0) return 0;
  const gagne = controles.reduce((s, k) => s + (k.ok ? POIDS[k.gravite] : 0), 0);
  const note = Math.round((gagne / total) * 100);
  return controles.some((k) => !k.ok && k.gravite === "bloquant") ? Math.min(40, note) : note;
}

/** Les corrections, de la plus grave a la plus legere. */
export function corrections(controles: Controle[]): Controle[] {
  const rang: Record<Gravite, number> = { bloquant: 0, important: 1, conseil: 2 };
  return controles.filter((k) => !k.ok).sort((a, b) => rang[a.gravite] - rang[b.gravite]);
}

/** Les groupes d'adresses qui partagent le meme title ou la meme description (compares sans casse ni accents). */
export function doublons(pages: { adresse: string; title: string | null; description: string | null }[]) {
  const grouper = (cle: "title" | "description") => {
    const m = new Map<string, { texte: string; adresses: string[] }>();
    for (const p of pages) {
      const v = p[cle]?.trim();
      if (!v) continue;
      const k = plier(v);
      const g = m.get(k) ?? { texte: v, adresses: [] };
      g.adresses.push(p.adresse);
      m.set(k, g);
    }
    return [...m.values()].filter((g) => g.adresses.length > 1);
  };
  return { titles: grouper("title"), descriptions: grouper("description") };
}

/** L'apercu d'un resultat Google : titre et description coupes aux longueurs usuelles, adresse en fil d'Ariane. */
export function apercuGoogle(title: string | null, description: string | null, adresse: string) {
  const couper = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")} …`);
  const u = new URL(adresse);
  const segments = u.pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  return {
    titre: couper(title ?? "(sans titre : Google en inventera un)", 60),
    site: u.host,
    fil: [u.host, ...segments].join(" > "),
    description: couper(description ?? "(sans description : Google prendra un extrait de la page)", 160),
  };
}
