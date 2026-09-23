// scripts/moteur-import.mjs - verse les billets Markdown de src/data/posts dans la base du moteur, une fois, par l'API.
//
// POURQUOI PAR L'API ET PAS PAR LE SEED : le seed decrit le SCHEMA et voyage
// dans le build ; le contenu, lui, appartient a la base. Passer par l'API fait
// subir a chaque billet importe la meme validation qu'a un billet saisi a la
// main, et l'import d'un site client (WordPress, Markdown) prend le meme chemin.
//
// Rejouable : un billet deja present (meme slug, meme langue) est saute.
//   node scripts/moteur-import.mjs --url http://localhost:4321
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EmDashClient, devBypassInterceptor, tokenInterceptor } from "emdash/client";
import { parse } from "yaml";

const RACINE = fileURLToPath(new URL("../", import.meta.url));
const DOSSIER = path.join(RACINE, "src/data/posts");
const COLLECTION = "posts";
const LANGUE_SOURCE = "en";

const args = process.argv.slice(2);
const url = args[args.indexOf("--url") + 1] ?? "http://localhost:4321";
const jeton = process.env.EMDASH_TOKEN;

const client = new EmDashClient({
  baseUrl: url,
  interceptors: [jeton ? tokenInterceptor(jeton) : devBypassInterceptor(url)],
});

/** Coupe le frontmatter du corps. Un fichier sans frontmatter est une erreur : on le dit. */
function lire(source, fichier) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`Frontmatter introuvable dans ${fichier}`);
  return { meta: parse(m[1]), corps: m[2] };
}

/**
 * Recolle les lignes d'un meme paragraphe.
 *
 * Les fiches sont ecrites a 80 colonnes, et le convertisseur du client lit le
 * Markdown LIGNE PAR LIGNE : sans ce passage, chaque ligne devenait un
 * paragraphe et une description de trois paragraphes en affichait douze. En
 * Markdown, un saut de ligne simple vaut une espace ; on l'ecrit donc ainsi.
 * Titres, listes, citations, tableaux et blocs de code gardent leurs lignes.
 *
 * Une ligne qui commence par "17. " au milieu d'un paragraphe est une fin de
 * phrase, pas une liste : comme en Markdown, seule "1. " peut interrompre un
 * paragraphe. La cire tiede ("cool for 12 to / 17. Above 22 it drags") y a
 * gagne une liste numerotee le temps d'un essai.
 */
function deplier(markdown) {
  const BLOC = /^(#{1,6} |> |[-*+] |\d+\. |\||```)/;
  const COUPE_UN_PARAGRAPHE = /^(#{1,6} |> |[-*+] |1\. |\||```)/;
  const sortie = [];
  let dansLeCode = false;
  let dansUnParagraphe = false;
  for (const ligne of markdown.split(/\r?\n/)) {
    if (ligne.startsWith("```")) dansLeCode = !dansLeCode;
    const vide = ligne.trim() === "";
    const suite = dansUnParagraphe && !dansLeCode && !vide && !COUPE_UN_PARAGRAPHE.test(ligne);
    if (suite) sortie[sortie.length - 1] = `${sortie.at(-1)} ${ligne.trim()}`;
    else sortie.push(ligne);
    dansUnParagraphe = suite || (!dansLeCode && !vide && !BLOC.test(ligne));
  }
  return sortie.join("\n");
}

/** Applique une retouche au texte d'un Markdown, jamais a son code (blocs et code en ligne). */
function horsDuCode(markdown, retouche) {
  let dansLeCode = false;
  return markdown
    .split(/\r?\n/)
    .map((ligne) => {
      const cloture = ligne.startsWith("```");
      if (cloture) dansLeCode = !dansLeCode;
      if (dansLeCode || cloture) return ligne;
      return ligne
        .split(/(`[^`]*`)/)
        .map((bout) => (bout.startsWith("`") ? bout : retouche(bout)))
        .join("");
    })
    .join("\n");
}

/**
 * Deux ecarts entre un billet lu d'un fichier et le meme billet verse en base,
 * corriges ici une fois pour toutes.
 *
 * L'italique a un seul asterisque (*mot*) n'est pas lu par le convertisseur du
 * client, qui ne connait que _mot_ : les asterisques sortaient tels quels.
 *
 * L'apostrophe typographique, qu'Astro pose tout seul en rendant un fichier
 * Markdown, n'est posee par personne sur un texte riche : on l'ecrit donc
 * juste. Seule l'apostrophe entre deux lettres est touchee.
 */
const fidele = (markdown) =>
  horsDuCode(markdown, (texte) =>
    texte
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1_$2_")
      .replace(/(\p{L})'(?=\p{L})/gu, "$1\u2019"),
  );

const sansLangue = (ref) => String(ref).replace(/^[a-z]{2}\//, "");

async function dejaLa(locale) {
  const vus = new Map();
  for await (const item of client.listAll("posts", { locale })) vus.set(item.slug, item.id);
  return vus;
}

const couvertures = new Map();
async function couverture(chemin, alt, fichier) {
  if (!chemin) return undefined;
  const absolu = path.resolve(path.dirname(fichier), chemin);
  if (!couvertures.has(absolu)) {
    const octets = await readFile(absolu);
    const media = await client.mediaUpload(new Uint8Array(octets), path.basename(absolu), { alt });
    couvertures.set(absolu, media);
  }
  const media = couvertures.get(absolu);
  return { id: media.id, alt: alt ?? "", width: media.width, height: media.height };
}

/**
 * Rend non traduisibles les champs que le seed declare ainsi.
 *
 * POURQUOI ICI : EmDash 0.38 lit `translatable: false` a la creation d'un
 * champ par l'API, mais l'ignore quand le champ vient du seed, et refuse
 * ensuite de le changer ("requires a manual content migration"). Tant que la
 * collection est vide, le champ est donc recree a l'identique, a la meme
 * place, avec le bon reglage. C'est ce reglage qui fait qu'un prix change sur
 * la fiche anglaise vaut aussitot pour la fiche francaise.
 *
 * Collection deja remplie : on ne touche a rien et on le dit. Le jour ou le
 * moteur lira ce reglage dans le seed, cette fonction ne trouvera plus rien a
 * faire.
 */
async function alignerLeSchema(langues) {
  const seed = JSON.parse(await readFile(path.join(RACINE, "seed/seed.json"), "utf8"));
  const voulus = seed.collections.find((c) => c.slug === COLLECTION)?.fields ?? [];
  const enBase = new Map((await client.collection(COLLECTION)).fields.map((f) => [f.slug, f]));
  const aCorriger = voulus
    .map((champ, rang) => ({ champ, rang }))
    .filter(({ champ }) => champ.translatable === false && enBase.get(champ.slug)?.translatable !== false);
  if (aCorriger.length === 0) return;

  let remplie = false;
  for (const langue of langues) if ((await dejaLa(langue)).size > 0) remplie = true;
  if (remplie) {
    const noms = aCorriger.map(({ champ }) => champ.slug).join(", ");
    console.warn(`Schema : ${noms} restent traduisibles, la collection contient deja des billets.`);
    return;
  }
  for (const { champ, rang } of aCorriger) {
    if (enBase.has(champ.slug)) await client.deleteField(COLLECTION, champ.slug);
    await client.createField(COLLECTION, { ...champ, validation: champ.validation ?? null, sortOrder: rang });
    console.log(`~ champ ${champ.slug} : non traduisible`);
  }
}

const langues = (await readdir(DOSSIER, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
// La langue source d'abord : une traduction se rattache a un billet qui existe.
langues.sort((a, b) => (a === LANGUE_SOURCE ? -1 : b === LANGUE_SOURCE ? 1 : a.localeCompare(b)));

await alignerLeSchema(langues);

const sources = new Map();
let crees = 0;
let sautes = 0;

for (const langue of langues) {
  const presents = await dejaLa(langue);
  const fichiers = (await readdir(path.join(DOSSIER, langue))).filter((f) => /\.mdx?$/.test(f)).sort();
  for (const nom of fichiers) {
    const fichier = path.join(DOSSIER, langue, nom);
    const slug = nom.replace(/\.mdx?$/, "");
    if (presents.has(slug)) {
      if (langue === LANGUE_SOURCE) sources.set(slug, presents.get(slug));
      sautes += 1;
      continue;
    }
    const { meta, corps } = lire(await readFile(fichier, "utf8"), fichier);
    const item = await client.create("posts", {
      slug,
      locale: langue,
      translationOf: langue === LANGUE_SOURCE ? undefined : sources.get(slug),
      // L'API cree toujours un brouillon : publier est un geste a part,
      // le meme que celui du bouton du back office.
      status: "draft",
      data: {
        title: meta.title,
        description: meta.description,
        // Le client convertit le Markdown en Portable Text a l'ecriture.
        content: fidele(deplier(corps)),
        cover: await couverture(meta.cover, meta.coverAlt, fichier),
        topic: sansLangue(meta.topic),
        author: sansLangue(meta.author),
        tags: meta.tags ?? [],
        featured: meta.featured === true,
        pub_date: new Date(meta.pubDate).toISOString(),
        updated_date: meta.updatedDate ? new Date(meta.updatedDate).toISOString() : undefined,
      },
    });
    if (meta.draft !== true) await client.publish("posts", item.id);
    if (langue === LANGUE_SOURCE) sources.set(slug, item.id);
    crees += 1;
    console.log(`+ ${langue}/${slug}`);
  }
}

console.log(`Import termine : ${crees} billet(s) cree(s), ${sautes} deja present(s).`);
