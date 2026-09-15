// src/frontmatter.ts - lire, ecrire et VALIDER le front matter des articles de alohapixel.com.
//
// CE QUE CE FICHIER PROTEGE. Les articles de alohapixel.com sont des fichiers
// Markdown commites dans le depot du site, et Cloudflare Pages recompile a
// chaque commit sur main. Un article dont le front matter ne satisfait pas le
// schema de la collection (site/src/content.config.ts) ne compile pas, et une
// compilation qui echoue ne met pas seulement CET article de cote : elle laisse
// le site entier sur sa version precedente. Un back office qui commite sans
// verifier est donc un back office qui peut mettre le site hors service depuis
// un formulaire. Tout ce fichier existe pour que cela n'arrive pas.
//
// LES RUBRIQUES ET LES ETIQUETTES SONT RECOPIEES ICI, et c'est delibere :
// elles vivent dans site/src/config/journal/terms.ts de l'AUTRE depot, que ce
// Worker ne compile pas et ne peut pas importer. La copie doit etre tenue a
// jour a la main ; le prix de l'oubli est un refus en 422, jamais un site
// casse, ce qui est le bon sens de l'erreur. Relevees le 2026-09-04.
//
// LE YAML EST UN SOUS-ENSEMBLE, pas un analyseur complet, parce que la maison
// n'ajoute aucune dependance. Il couvre exactement les formes que les 96
// articles utilisent : scalaires quotes ou nus, listes en ligne, un bloc
// image { src, alt }, et une liste de blocs faq { question, answer }.

/** Les six rubriques du journal. Copie de TOPIC_SLUGS. */
export const CATEGORIES = [
  "creation-site-web",
  "referencement-seo",
  "wordpress-maintenance",
  "guides-metier",
  "infrastructure-depannage",
  "developpement-sur-mesure",
] as const;

/** Les quinze etiquettes du journal. Copie de TAG_SLUGS. */
export const TAGS = [
  "agence-web-pau",
  "creation-site-web",
  "ocean-friendly",
  "apprendre-wordpress",
  "guide-2026",
  "seo-2026",
  "sobriete-numerique",
  "creation-site-internet-pau",
  "agence-seo-pau",
  "abonnement-site-web",
  "securite-wordpress",
  "seo-local",
  "site-web-premium",
  "agence-web-paris",
  "wordpress-paris",
] as const;

/** L'ordre d'ecriture des champs. Les cles inconnues sont ecrites ensuite, jamais perdues. */
const FIELD_ORDER = [
  "title",
  "description",
  "pubDate",
  "author",
  "category",
  "tags",
  "image",
  "faq",
  "draft",
];

export type Frontmatter = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

function unquote(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

/** Un scalaire ou une liste en ligne. Les dates restent des chaines : elles voyagent en ISO. */
function parseScalar(raw: string): unknown {
  const v = raw.trim();
  if (v === "" || v === "~" || v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlow(inner).map((part) => parseScalar(part));
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return unquote(v);
}

/** Decoupe une liste en ligne sur les virgules HORS guillemets. */
function splitFlow(inner: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let quote = "";
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]!;
    if (quote) {
      if (c === "\\" && quote === '"') {
        buf += c + (inner[++i] ?? "");
        continue;
      }
      if (c === quote) quote = "";
      buf += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      buf += c;
    } else if (c === ",") {
      parts.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  parts.push(buf);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

const indentOf = (line: string): number => line.length - line.trimStart().length;

/** Analyse un bloc de lignes de meme indentation : map, liste de maps, ou liste de scalaires. */
function parseBlock(lines: string[], start: number, end: number, indent: number): unknown {
  const first = lines.slice(start, end).find((l) => l.trim() !== "");
  if (first !== undefined && first.trimStart().startsWith("- ")) {
    return parseSeq(lines, start, end, indent);
  }
  const map: Frontmatter = {};
  let i = start;
  while (i < end) {
    const line = lines[i]!;
    if (line.trim() === "" || indentOf(line) !== indent) {
      i += 1;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon < 0) {
      i += 1;
      continue;
    }
    const key = line.slice(indentOf(line), colon).trim();
    const rest = line.slice(colon + 1).trim();
    i += 1;
    if (rest !== "") {
      map[key] = parseScalar(rest);
      continue;
    }
    // Valeur vide : le bloc indente qui suit porte la valeur.
    const from = i;
    while (i < end && (lines[i]!.trim() === "" || indentOf(lines[i]!) > indent)) i += 1;
    const child = lines.slice(from, i).find((l) => l.trim() !== "");
    map[key] = child === undefined ? null : parseBlock(lines, from, i, indentOf(child));
  }
  return map;
}

/** Une liste de tirets. Chaque element est un scalaire ou une map indentee. */
function parseSeq(lines: string[], start: number, end: number, indent: number): unknown[] {
  const out: unknown[] = [];
  let i = start;
  while (i < end) {
    const line = lines[i]!;
    if (line.trim() === "" || indentOf(line) !== indent || !line.trimStart().startsWith("- ")) {
      i += 1;
      continue;
    }
    const head = line.trimStart().slice(2);
    const from = i;
    i += 1;
    while (i < end && (lines[i]!.trim() === "" || indentOf(lines[i]!) > indent)) i += 1;
    if (head.includes(":") && !/^["']/.test(head.trim())) {
      // "- question: ..." : la premiere paire vit sur la ligne du tiret, les
      // suivantes sont indentees dessous. On reconstruit le bloc a plat.
      const block = [" ".repeat(indent + 2) + head, ...lines.slice(from + 1, i)];
      out.push(parseBlock(block, 0, block.length, indent + 2));
    } else {
      out.push(parseScalar(head));
    }
  }
  return out;
}

/**
 * Separe le front matter du corps.
 *
 * Sans delimiteur d'ouverture, le fichier est rendu tel quel avec un front
 * matter vide : la validation dira alors ce qui manque, ce qui est plus utile
 * qu'une exception sans message.
 */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return { frontmatter: {}, body: text };
  const close = text.indexOf("\n---", 3);
  if (close < 0) return { frontmatter: {}, body: text };
  const head = text.slice(4, close + 1).split("\n");
  const body = text.slice(close + 4).replace(/^\n/, "");
  return { frontmatter: parseBlock(head, 0, head.length, 0) as Frontmatter, body };
}

/* ------------------------------------------------------------------ */
/* Ecriture                                                            */
/* ------------------------------------------------------------------ */

const quote = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** Une date reste NUE, comme dans les 96 articles : pubDate: 2026-06-19. */
const isBareDate = (v: unknown): boolean => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function emit(key: string, value: unknown, out: string[]): void {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean" || typeof value === "number") {
    out.push(`${key}: ${value}`);
  } else if (Array.isArray(value)) {
    if (value.length === 0) return;
    if (value.every((v) => typeof v === "string")) {
      out.push(`${key}: [${value.map((v) => quote(String(v))).join(", ")}]`);
    } else {
      out.push(`${key}:`);
      for (const item of value) {
        const entries = Object.entries(item as Frontmatter);
        entries.forEach(([k, v], idx) => {
          out.push(`${idx === 0 ? "  - " : "    "}${k}: ${quote(String(v))}`);
        });
      }
    }
  } else if (typeof value === "object") {
    out.push(`${key}:`);
    for (const [k, v] of Object.entries(value as Frontmatter)) out.push(`  ${k}: ${quote(String(v))}`);
  } else if (isBareDate(value)) {
    out.push(`${key}: ${value}`);
  } else {
    out.push(`${key}: ${quote(String(value))}`);
  }
}

/** Reconstruit le fichier complet. Le corps se termine toujours par une seule fin de ligne. */
export function stringifyPost(fm: Frontmatter, body: string): string {
  const out: string[] = [];
  for (const key of FIELD_ORDER) if (key in fm) emit(key, fm[key], out);
  for (const key of Object.keys(fm)) if (!FIELD_ORDER.includes(key)) emit(key, fm[key], out);
  const clean = body.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return `---\n${out.join("\n")}\n---\n${clean}\n`;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Le slug : minuscules ASCII, chiffres et traits d'union simples.
 *
 * Il devient le nom du fichier ET l'adresse publique de l'article. Une
 * majuscule ou un accent ici, et l'URL differe selon le systeme de fichiers
 * qui la sert : le lien marche en local et casse en production.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;
}

/**
 * Les tirets cadratin et demi-cadratin sont interdits par la maison.
 *
 * Ce n'est pas une preference d'affichage : ils sont la signature typographique
 * d'un texte ecrit par une machine, et le journal de alohapixel.com se lit
 * comme ecrit par quelqu'un. Le refus est donc en amont du commit, pas une
 * relecture apres coup.
 */
const DASHES = /[\u2014\u2013]/;

function scanDashes(value: unknown, where: string, errors: string[]): void {
  if (typeof value === "string") {
    if (DASHES.test(value)) errors.push(`tiret cadratin ou demi-cadratin interdit dans ${where}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scanDashes(v, `${where}[${i}]`, errors));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Frontmatter)) scanDashes(v, `${where}.${k}`, errors);
  }
}

const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * Toutes les raisons de refuser, d'un coup.
 *
 * La liste est rendue ENTIERE et non a la premiere erreur : corriger un
 * article a l'aveugle, une erreur par aller-retour, est ce qui fait qu'on
 * finit par contourner la validation.
 */
export function validatePost(slug: string, fm: Frontmatter, body: string): string[] {
  const e: string[] = [];

  if (!isValidSlug(slug)) e.push("slug invalide : minuscules, chiffres et traits d'union seulement");
  if (!isNonEmpty(fm.title)) e.push("title manquant");
  if (!isNonEmpty(fm.description)) e.push("description manquante");

  const date = fm.pubDate;
  const iso = date instanceof Date ? date.toISOString().slice(0, 10) : String(date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(iso) || Number.isNaN(Date.parse(iso))) {
    e.push("pubDate manquante ou hors format ISO (AAAA-MM-JJ)");
  }

  if (!isNonEmpty(fm.author)) e.push("author manquant");
  else if (!isValidSlug(String(fm.author))) e.push("author invalide : c'est un slug de fiche auteur");

  if (!isNonEmpty(fm.category)) e.push("category manquante");
  else if (!(CATEGORIES as readonly string[]).includes(String(fm.category))) {
    e.push(`category inconnue : ${String(fm.category)}`);
  }

  if (!Array.isArray(fm.tags)) e.push("tags manquants : au minimum une liste vide");
  else {
    for (const tag of fm.tags) {
      if (!(TAGS as readonly string[]).includes(String(tag))) e.push(`etiquette inconnue : ${String(tag)}`);
    }
  }

  // L'image est OBLIGATOIRE dans le schema du site : un article sans elle ne
  // compile pas. Le chemin est relatif au fichier Markdown, comme dans les 96
  // articles existants, parce que c'est cette forme que le helper image()
  // d'Astro sait resoudre.
  const image = fm.image as { src?: unknown; alt?: unknown } | undefined;
  if (!image || typeof image !== "object") e.push("image manquante : { src, alt } est obligatoire");
  else {
    if (!isNonEmpty(image.src)) e.push("image.src manquante");
    else if (!String(image.src).startsWith("../")) {
      e.push("image.src doit etre un chemin relatif, comme ../../../assets/blog/mon-image.webp");
    }
    if (!isNonEmpty(image.alt)) e.push("image.alt manquante : une image sans alternative est inaccessible");
  }

  if (fm.faq !== undefined) {
    if (!Array.isArray(fm.faq)) e.push("faq doit etre une liste");
    else {
      for (const [i, item] of fm.faq.entries()) {
        const q = item as { question?: unknown; answer?: unknown };
        if (!q || typeof q !== "object" || !isNonEmpty(q.question) || !isNonEmpty(q.answer)) {
          e.push(`faq[${i}] doit porter question et answer`);
        }
      }
    }
  }

  if (fm.draft !== undefined && typeof fm.draft !== "boolean") e.push("draft doit valoir true ou false");

  scanDashes(fm, "le front matter", e);
  if (DASHES.test(body)) e.push("tiret cadratin ou demi-cadratin interdit dans le corps de l'article");
  if (body.trim().length < 200) e.push("corps trop court : un article fait au moins 200 caracteres");

  return e;
}
