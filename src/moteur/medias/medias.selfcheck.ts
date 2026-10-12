// src/moteur/medias/medias.selfcheck.ts - self-check de l'extension Medias : reconnaissance, dimensions, decision, conversion par un faux liant, aiguillage devant un faux EmDash, lot sur une vraie base SQLite.
// Lancer : node src/moteur/medias/medias.selfcheck.ts (Node 22.18 ou plus). Aucun reseau.
//
// Le faux liant Images rend des octets choisis : il prouve le chemin et les
// regles, pas la qualite d'encodage de Cloudflare (voir LISEZMOI.md, essai reel).
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { aiguillerLesMedias } from "./aiguillage.ts";
import { type Base, candidats, derniers, mettreAJourLaFiche, reserver, RESERVATION_MS, restantes } from "./base.ts";
import { ACTION_OPTIMISER, composer } from "./carte.ts";
import { convertir, type Images } from "./conversion.ts";
import { PREFIXE_DES_ORIGINAUX } from "./identite.mjs";
import { type MetadonneesKV, optimiserUnLot, type Seau, seauDe } from "./lot.ts";
import { decider, dimensionsDe, dimensionsReduites, essaiRetenu, nomAvecExtension, poids, sorteAnnoncee, sorteDe, webpAnime } from "./regles.ts";
import { FR } from "./textes.fr.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

// ---- Fabriques d'en-tetes minimaux, assez pour la reconnaissance et les dimensions.
const octets = (...p: (number[] | string | Uint8Array)[]) => {
  const parts = p.map((x) => (typeof x === "string" ? new TextEncoder().encode(x) : x instanceof Uint8Array ? x : Uint8Array.from(x)));
  const r = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of parts) r.set(x, (i += x.length) - x.length);
  return r;
};
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const remplir = (o: Uint8Array, taille: number) => octets(o, new Uint8Array(Math.max(0, taille - o.length)));
const jpeg = (l: number, h: number, t = 0) => remplir(octets([0xff, 0xd8, 0xff, 0xe0, 0, 16], "JFIF\0", new Array(9).fill(0), [0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, l >> 8, l & 255], new Array(12).fill(0), [0xff, 0xd9]), t);
const png = (l: number, h: number, t = 0) => remplir(octets([0x89], "PNG\r\n\x1a\n", be32(13), "IHDR", be32(l), be32(h), [8, 6, 0, 0, 0]), t);
const webp = (l: number, h: number, t = 0, anime = false) => remplir(octets("RIFF", [0, 0, 0, 0], "WEBP", "VP8X", [10, 0, 0, 0, anime ? 0x02 : 0, 0, 0, 0], le24(l - 1), le24(h - 1)), t);
const ispe = (l: number, h: number) => octets(be32(20), "ispe", [0, 0, 0, 0], be32(l), be32(h));
const heif = (marque: string, l: number, h: number, t = 0) => remplir(octets(be32(24), "ftyp", marque, [0, 0, 0, 0], "mif1", marque, ispe(512, 512), ispe(l, h)), t);
const gif = octets("GIF89a", [10, 0, 10, 0]);
const svg = octets('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>');

// ---- 1. Les octets font foi.
is([jpeg(1, 1), png(1, 1), webp(1, 1), heif("heic", 1, 1), heif("avif", 1, 1), gif, svg, octets("%PDF-1.7")].map(sorteDe), ["jpeg", "png", "webp", "heic", "avif", "gif", "svg", "autre"], "sorte lue a la signature");
is(sorteAnnoncee("", "IMG_0001.HEIC"), "heic", "un HEIC sans type annonce se reconnait a son nom");
is(sorteAnnoncee("image/heif", ""), "heic", "image/heif est un HEIC");
is(sorteAnnoncee("video/mp4", "film.mp4"), "autre", "une video n'est pas une photo");
is(dimensionsDe(jpeg(4032, 3024)), { largeur: 4032, hauteur: 3024 }, "dimensions d'un JPEG (SOF0)");
is(dimensionsDe(png(640, 480)), { largeur: 640, hauteur: 480 }, "dimensions d'un PNG (IHDR)");
is(dimensionsDe(webp(2560, 1707)), { largeur: 2560, hauteur: 1707 }, "dimensions d'un WebP (VP8X)");
is(dimensionsDe(heif("heic", 4032, 3024)), { largeur: 4032, hauteur: 3024 }, "HEIC en tuiles : la plus grande boite ispe");
is(dimensionsDe(gif), { largeur: 10, hauteur: 10 }, "dimensions d'un GIF");
is([webpAnime(webp(10, 10, 0, true)), webpAnime(webp(10, 10))], [true, false], "WebP anime reconnu");
is(dimensionsReduites({ largeur: 4032, hauteur: 3024 }), { largeur: 2560, hauteur: 1920 }, "reduction a 2560 px");
is(dimensionsReduites({ largeur: 800, hauteur: 600 }), { largeur: 800, hauteur: 600 }, "jamais d'agrandissement");

// ---- 2. La decision.
const entree = (o: Uint8Array, anime = false) => ({ sorte: sorteDe(o), taille: o.length, dimensions: dimensionsDe(o), anime });
is(decider(entree(jpeg(4032, 3024, 3e6))), { action: "convertir", formats: ["webp"], grandCote: 2560 }, "photo d'iPhone : au-dela de 1200 px, WebP seul");
is(decider(entree(jpeg(800, 600, 3e5))), { action: "convertir", formats: ["avif", "webp"], grandCote: 800 }, "petite photo : AVIF puis WebP");
is(decider(entree(jpeg(800, 600, 3e5)), { avif: false }).action === "convertir" && decider(entree(jpeg(800, 600, 3e5)), { avif: false }), { action: "convertir", formats: ["webp"], grandCote: 800 }, "avif: false ne demande que le WebP");
is(decider(entree(heif("heic", 4032, 3024, 2e6))).action, "convertir", "HEIC d'iPhone converti");
for (const [o, raison] of [[gif, "gif"], [svg, "svg"], [heif("avif", 900, 600, 1e5), "avif"], [webp(2000, 1500, 5e5), "webp-leger"], [octets("%PDF"), "pas-une-image"]] as const) {
  is(decider(entree(o)), { action: "passer", raison }, `passe tel quel : ${raison}`);
}
is(decider(entree(webp(10, 10, 100, true), true)), { action: "passer", raison: "anime" }, "WebP anime passe tel quel");
is(decider(entree(webp(2000, 1500, 2e6))).action, "convertir", "WebP trop lourd repris");
is(decider(entree(webp(4000, 3000, 5e5))).action, "convertir", "WebP trop grand repris");
is(decider({ sorte: "jpeg", taille: 21 * 1024 * 1024, dimensions: null, anime: false }), { action: "passer", raison: "trop-lourd" }, "au-dela des 20 Mo du liant, l'original passe");
is(essaiRetenu({ sorte: "jpeg", taille: 1000 }, { demande: "avif", recue: "avif", taille: 400 }), true, "AVIF plus leger retenu");
is(essaiRetenu({ sorte: "png", taille: 1000 }, { demande: "avif", recue: "avif", taille: 1200 }), false, "AVIF plus lourd refuse");
is(essaiRetenu({ sorte: "jpeg", taille: 1000 }, { demande: "avif", recue: "webp", taille: 300 }), false, "repli de Cloudflare (AVIF demande, WebP rendu) : pas retenu");
is(essaiRetenu({ sorte: "png", taille: 1000 }, { demande: "webp", recue: "webp", taille: 1100 }), false, "PNG : un WebP plus lourd ne remplace pas l'original");
is(essaiRetenu({ sorte: "jpeg", taille: 1000 }, { demande: "webp", recue: "webp", taille: 1100 }), true, "JPEG : la position GPS part, meme pour quelques octets de plus");
is([nomAvecExtension("IMG_1234.HEIC", "webp"), nomAvecExtension("a.b.jpg", "avif"), nomAvecExtension(".jpg", "webp"), nomAvecExtension("C:\\x\\vue", "webp")], ["IMG_1234.webp", "a.b.avif", "photo.webp", "vue.webp"], "nom a la bonne extension");
is([poids(4.1 * 1024 * 1024), poids(612 * 1024), poids(612 * 1024, "en")], ["4,1 Mo", "612 Ko", "612 KB"], "poids en mots du client");

// ---- 3. La conversion, par un faux liant.
type Reglage = Record<string, Uint8Array | Error>;
function fauxLiant(r: Reglage): Images & { appels: string[] } {
  const appels: string[] = [];
  return {
    appels,
    input: () => ({
      transform: (t) => {
        assert.deepEqual(t, { width: 2560, height: 2560, fit: "scale-down" });
        return {
          output: async ({ format }) => {
            appels.push(format);
            const v = r[format];
            if (!v || v instanceof Error) throw v ?? new Error("9520 format");
            return { contentType: () => format, image: () => new Response(v.slice()).body as ReadableStream<Uint8Array> };
          },
        };
      },
    }),
  };
}
const petite = jpeg(800, 600, 50_000);
let c = await convertir(petite, "vue.jpg", fauxLiant({ "image/avif": heif("avif", 800, 600, 9_000), "image/webp": webp(800, 600, 12_000) }));
is(c.etat === "converti" && [c.format, c.nom, c.type, c.apres, c.dimensions], ["avif", "vue.avif", "image/avif", 9_000, { largeur: 800, hauteur: 600 }], "petite photo en AVIF, dimensions relues dans la sortie");
let l = fauxLiant({ "image/avif": new Error("9422 limite"), "image/webp": webp(800, 600, 12_000) });
c = await convertir(petite, "vue.jpg", l);
is([c.etat === "converti" && c.format, l.appels], ["webp", ["image/avif", "image/webp"]], "AVIF en echec : repli WebP");
c = await convertir(petite, "vue.jpg", fauxLiant({ "image/avif": webp(800, 600, 8_000), "image/webp": webp(800, 600, 12_000) }));
is(c.etat === "converti" && c.format, "webp", "AVIF demande mais WebP rendu : on redemande un vrai WebP, l'extension ne ment pas");
c = await convertir(png(800, 600, 1_000), "logo.png", fauxLiant({ "image/avif": heif("avif", 800, 600, 2_000), "image/webp": webp(800, 600, 1_500) }));
is(c.etat === "passe" && c.raison, "plus-lourd", "PNG deja leger : l'original passe");
c = await convertir(jpeg(4032, 3024, 3e6), "IMG.jpg", null);
is(c.etat === "passe" && c.raison, "sans-liaison", "sans liant : l'original passe");
c = await convertir(jpeg(4032, 3024, 3e6), "IMG.jpg", fauxLiant({}));
is(c.etat, "echec", "liant en echec : resultat echec, sans exception");
l = fauxLiant({ "image/webp": webp(10, 10) });
c = await convertir(gif, "anim.gif", l);
is([c.etat, l.appels.length], ["passe", 0], "GIF : aucune transformation facturee");

// ---- 4. L'aiguillage devant un faux EmDash.
type Recu = { chemin: string; fichier?: File; largeur?: string | null; champs?: string[] };
function fauxEmDash(o: { role?: number; refuseLesTypes?: string[] } = {}) {
  const recus: Recu[] = [];
  const suite = async (r: Request): Promise<Response> => {
    const chemin = new URL(r.url).pathname;
    if (chemin === "/_emdash/api/auth/me") {
      recus.push({ chemin });
      return o.role === undefined ? Response.json({ error: { code: "NOT_AUTHENTICATED" } }, { status: 401 }) : Response.json({ data: { role: o.role } });
    }
    const f = await r.formData();
    const fichier = f.get("file") as File;
    recus.push({ chemin, fichier, largeur: f.get("width") as string | null, champs: [...f.keys()] });
    if (o.refuseLesTypes?.includes(fichier.type)) return Response.json({ error: { code: "INVALID_TYPE" } }, { status: 400 });
    return Response.json({ success: true, data: { item: { id: `m${recus.length}`, filename: fichier.name } } }, { status: 201 });
  };
  return { recus, suite };
}
function sqlite(): Base {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER, width INTEGER, height INTEGER,
    alt TEXT, caption TEXT, storage_key TEXT NOT NULL, content_hash TEXT, created_at TEXT, author_id TEXT, status TEXT NOT NULL DEFAULT 'ready')`);
  return {
    lire: async <T>(sql: string, p: unknown[] = []) => db.prepare(sql).all(...(p as never[])) as T[],
    executer: async (sql: string, p: unknown[] = []) => Number(db.prepare(sql).run(...(p as never[])).changes),
  };
}
const envoi = (fichier: File, extra: Record<string, string> = {}, cookie = "session=1") => {
  const f = new FormData();
  f.append("file", fichier);
  f.append("width", "4032");
  for (const [k, v] of Object.entries(extra)) f.append(k, v);
  return new Request("https://site.test/_emdash/api/media", { method: "POST", body: f, headers: { cookie, "x-emdash-request": "1" } });
};
const T0 = Date.UTC(2026, 9, 11, 9, 0, 0);
const iphone = new File([heif("heic", 4032, 3024, 2_000_000)], "IMG_0042.HEIC", { type: "image/heic" });
{
  const base = sqlite();
  const e = fauxEmDash({ role: 20 });
  const liant = fauxLiant({ "image/webp": webp(2560, 1920, 400_000) });
  const adresse = (type: string, nom: string, images: Images | null) =>
    aiguillerLesMedias(new Request("https://site.test/_emdash/api/media/upload-url", { method: "POST", body: JSON.stringify({ contentType: type, filename: nom, size: 9 }) }), { images, base, suite: e.suite, maintenant: () => T0 });
  is((await adresse("image/heic", "IMG.HEIC", liant))?.status, 501, "photo : l'envoi en deux temps est decline, l'admin passe a l'envoi en un temps");
  is(await adresse("video/mp4", "film.mp4", liant), null, "video : l'envoi en deux temps reste celui d'EmDash");
  is(await adresse("image/jpeg", "a.jpg", null), null, "sans liant : rien n'est decline");
  is((await derniers(base, 5))[0]?.detail, "sans-liaison", "sans liant : c'est inscrit au journal");

  const r = await aiguillerLesMedias(envoi(iphone, { folderId: "unfiled" }), { images: liant, base, suite: e.suite, maintenant: () => T0 + 1 });
  const recu = e.recus.at(-1)!;
  is([r?.status, recu.fichier?.name, recu.fichier?.type, recu.fichier?.size, recu.largeur], [201, "IMG_0042.webp", "image/webp", 400_000, "2560"], "HEIC d'iPhone : EmDash recoit le WebP, son nom, son type et ses dimensions");
  is(recu.champs?.includes("folderId"), true, "les autres champs du formulaire restent");
  const [j] = await derniers(base, 1);
  is([j.media_id, j.etat, j.format, j.avant, j.apres], ["m2", "fait", "webp", 2_000_000, 400_000], "journal : la photo creee, avant et apres");

  const anonyme = fauxEmDash();
  const l2 = fauxLiant({ "image/webp": webp(10, 10) });
  await aiguillerLesMedias(envoi(iphone), { images: l2, base, suite: anonyme.suite });
  is([anonyme.recus.at(-1)?.fichier?.name, l2.appels.length], ["IMG_0042.HEIC", 0], "sans session : aucune transformation, EmDash recoit l'original (et le refuse lui-meme)");

  const pdf = fauxEmDash({ role: 50 });
  await aiguillerLesMedias(envoi(new File([octets("%PDF-1.7")], "devis.pdf", { type: "application/pdf" })), { images: liant, base, suite: pdf.suite });
  is(pdf.recus.map((x) => x.chemin), ["/_emdash/api/media"], "PDF : ni question a EmDash, ni transformation");

  const champ = fauxEmDash({ role: 30, refuseLesTypes: ["image/webp"] });
  const r2 = await aiguillerLesMedias(envoi(new File([jpeg(4032, 3024, 3e6)], "a.jpg", { type: "image/jpeg" })), { images: liant, base, suite: champ.suite });
  is([r2?.status, champ.recus.at(-1)?.fichier?.type, (await derniers(base, 1))[0].detail], [201, "image/jpeg", "champ-refuse-webp"], "champ qui refuse le WebP : l'original passe, c'est note");

  const casse = fauxEmDash({ role: 20 });
  await aiguillerLesMedias(envoi(new File([jpeg(4032, 3024, 3e6)], "b.jpg", { type: "image/jpeg" })), { images: fauxLiant({}), base, suite: casse.suite });
  is([casse.recus.at(-1)?.fichier?.name, (await derniers(base, 1))[0].etat], ["b.jpg", "echec"], "liant en echec : l'original passe, l'echec est note");
  is(await aiguillerLesMedias(new Request("https://site.test/_emdash/api/media"), { images: liant, base, suite: e.suite }), null, "une lecture de la mediatheque n'est pas aiguillee");
}

// ---- 5. Le lot, sur une base SQLite aux colonnes d'EmDash 0.38 et un faux seau.
{
  const base = sqlite();
  const objets = new Map<string, { corps: Uint8Array; type?: string; cache?: string }>();
  let pendantLEcriture: ((cle: string) => void) | null = null;
  const seau: Seau = {
    get: async (k) => {
      const o = objets.get(k);
      return o ? { size: o.corps.length, arrayBuffer: async () => o.corps.slice().buffer, httpMetadata: { contentType: o.type } } : null;
    },
    head: async (k) => (objets.has(k) ? {} : null),
    put: async (k, corps, o) => {
      objets.set(k, { corps, type: o?.httpMetadata?.contentType, cache: o?.httpMetadata?.cacheControl });
      pendantLEcriture?.(k);
    },
  };
  const poser = async (id: string, nom: string, o: Uint8Array, type: string, quand: string) => {
    const d = dimensionsDe(o);
    await base.executer("INSERT INTO media (id, filename, mime_type, size, width, height, storage_key, created_at) VALUES (?,?,?,?,?,?,?,?)", [id, nom, type, o.length, d?.largeur ?? null, d?.hauteur ?? null, `${id}.${nom.split(".").pop()}`, quand]);
    objets.set(`${id}.${nom.split(".").pop()}`, { corps: o, type });
  };
  await poser("A", "plage.jpg", jpeg(4032, 3024, 3e6), "image/jpeg", "2026-01-01");
  await poser("B", "logo.webp", webp(600, 200, 20_000), "image/webp", "2026-01-02");
  await poser("C", "anim.gif", gif, "image/gif", "2026-01-03");
  await poser("D", "nuit.png", png(3000, 2000, 5e6), "image/png", "2026-01-04");
  await poser("E", "rue.jpg", jpeg(1600, 1200, 9e5), "image/jpeg", "2026-01-05");
  const liant = fauxLiant({ "image/webp": webp(2560, 1920, 500_000) });
  const t = T0;
  is(await restantes(base, t), 4, "le GIF n'est pas candidat ; JPEG, PNG et WebP le sont");
  let b = await optimiserUnLot({ base, seau, images: liant, maintenant: () => t, taille: 2 });
  is([b.examinees, b.faites, b.gardees], [2, 1, 1], "lot borne : deux photos, la plus ancienne convertie, le WebP leger garde sans lecture");
  const [a] = await base.lire<Record<string, unknown>>("SELECT * FROM media WHERE id = 'A'");
  is([a.storage_key, a.mime_type, a.size, a.width, a.height, a.filename, String(a.content_hash).startsWith("sha1:")], ["A.jpg", "image/webp", 500_000, 2560, 1920, "plage.webp", true], "fiche a jour, cle (donc adresse) inchangee");
  is([objets.get("A.jpg")?.type, objets.get("A.jpg")?.corps.length, objets.get("A.jpg")?.cache], ["image/webp", 500_000, "public, max-age=0, must-revalidate"], "octets remplaces sous la meme cle, servis en image/webp");
  is([objets.get(`${PREFIXE_DES_ORIGINAUX}A.jpg`)?.corps.length, objets.get(`${PREFIXE_DES_ORIGINAUX}A.jpg`)?.type], [3e6, "image/jpeg"], "l'original est garde sous backups/");
  is(await restantes(base, t), 2, "le lot suivant reprend ou le precedent s'est arrete");
  is(await reserver(base, "D", t), true, "reservation prise");
  is(await reserver(base, "D", t + 1000), false, "deux clics ne prennent jamais la meme photo");
  is((await candidats(base, 9, t)).map((m) => m.id), ["E"], "une photo reservee n'est pas proposee");
  is(await reserver(base, "D", t + RESERVATION_MS + 1), true, "une reservation abandonnee se reprend");
  // La photo change pendant le traitement : les octets d'origine reviennent.
  pendantLEcriture = (k) => {
    if (k === "E.jpg" && objets.get(k)?.type === "image/webp") void base.executer("UPDATE media SET mime_type = 'image/png' WHERE id = 'E'");
  };
  const plusTard = t + 2 * RESERVATION_MS + 10;
  b = await optimiserUnLot({ base, seau, images: liant, maintenant: () => plusTard });
  pendantLEcriture = null;
  is([b.faites, b.echecs], [1, 1], "D convertie, E en echec");
  is([objets.get("E.jpg")?.type, objets.get("E.jpg")?.corps.length], ["image/jpeg", 9e5], "fiche changee : l'original est remis");
  is(await restantes(base, plusTard), 0, "plus rien a examiner");
  is(await mettreAJourLaFiche(base, { id: "A", cle: "A.jpg", ancienType: "image/jpeg", nom: "x", type: "image/webp", taille: 1, largeur: 1, hauteur: 1, empreinte: "" }), 0, "jamais d'ecriture sur une fiche qui a deja change");
  const sansLiant = sqlite();
  is((await optimiserUnLot({ base: sansLiant, seau, images: null, maintenant: () => t })).examinees, 0, "base vide : rien a faire");

  // ---- 6. La carte.
  const etat = { langue: "fr" as const, textes: FR, relie: true, lotPossible: true, peutOptimiser: true, faites: 2, gagnes: 7_500_000, restantes: 3, lot: 5, journal: await derniers(base, 5) };
  const boutons = (r: ReturnType<typeof composer>) => r.blocks.filter((x) => x.type === "actions").flatMap((x) => (x.type === "actions" ? x.elements.map((e) => e.action_id) : []));
  is(boutons(composer(etat)), [ACTION_OPTIMISER], "un editeur voit le bouton");
  is(boutons(composer({ ...etat, peutOptimiser: false })), [], "un contributeur ne le voit pas");
  is(boutons(composer({ ...etat, restantes: 0 })), [], "plus rien a examiner : pas de bouton");
  is(composer({ ...etat, relie: false, lotPossible: false }).blocks[0].type, "banner", "conversion non reliee : bandeau en tete");
  const sansSeau = composer({ ...etat, lotPossible: false });
  is([sansSeau.blocks[0].type, boutons(sansSeau), sansSeau.blocks.some((x) => x.type === "context" && x.text === FR.lotIndisponible)], ["stats", [], true], "liant sans seau : pas d'alerte, la conversion a l'envoi marche ; le lot dit qu'il manque");
  const table = composer(etat).blocks.find((x) => x.type === "table");
  const ligneA = table?.type === "table" ? table.rows.find((r) => r.photo === "nuit.webp") : undefined;
  is(ligneA, { photo: "nuit.webp", resultat: "Convertie en WEBP", poids: "4,8 Mo → 488 Ko" }, "journal en mots du client");
  is(composer(etat, { examinees: 2, faites: 1, gardees: 1, echecs: 0, gagnes: 1 }).toast?.type, "success", "lot sans echec : confirmation");
}

// ---- 7. Le lot sur un espace KV (compte sans R2) : memes octets, type dans les metadonnees.
{
  is(seauDe(null), null, "aucune liaison : aucun seau");
  is(seauDe({ fetch() {} }), null, "une liaison d'une autre sorte : aucun seau");
  const r2 = { get() {}, head() {}, put() {} };
  is(seauDe(r2) === (r2 as unknown), true, "un seau R2 passe tel quel");
  const kv = new Map<string, { valeur: ArrayBuffer; metadata: MetadonneesKV | null }>();
  const espace = {
    getWithMetadata: async <M>(k: string) => {
      const o = kv.get(k);
      return { value: o ? o.valeur : null, metadata: (o?.metadata ?? null) as M | null };
    },
    put: async (k: string, v: ArrayBuffer | Uint8Array, o?: { metadata?: unknown }) => void kv.set(k, { valeur: v instanceof Uint8Array ? v.slice().buffer : v, metadata: (o?.metadata ?? null) as MetadonneesKV | null }),
  };
  const seau = seauDe(espace);
  is(seau !== null, true, "un espace KV devient un seau");
  const base = sqlite();
  const original = jpeg(4032, 3024, 3e6);
  await base.executer("INSERT INTO media (id, filename, mime_type, size, width, height, storage_key, created_at) VALUES (?,?,?,?,?,?,?,?)", ["K", "plage.jpg", "image/jpeg", original.length, 4032, 3024, "K.jpg", "2026-01-01"]);
  kv.set("K.jpg", { valeur: original.slice().buffer, metadata: { contentType: "image/jpeg", size: original.length, depose: "2026-01-01T00:00:00.000Z" } });
  const b = await optimiserUnLot({ base, seau: seau!, images: fauxLiant({ "image/webp": webp(2560, 1920, 400_000) }), maintenant: () => T0 });
  is(b.faites, 1, "photo convertie dans KV");
  const apres = kv.get("K.jpg");
  is([apres?.valeur.byteLength, apres?.metadata?.contentType, apres?.metadata?.cacheControl, apres?.metadata?.size], [400_000, "image/webp", "public, max-age=0, must-revalidate", 400_000], "meme cle, type et taille dans les metadonnees que lit le stockage KV");
  is([kv.get(`${PREFIXE_DES_ORIGINAUX}K.jpg`)?.valeur.byteLength, kv.get(`${PREFIXE_DES_ORIGINAUX}K.jpg`)?.metadata?.contentType], [3e6, "image/jpeg"], "original garde sous backups/ dans KV");
  const [k] = await base.lire<Record<string, unknown>>("SELECT mime_type, storage_key FROM media WHERE id = 'K'");
  is([k.mime_type, k.storage_key], ["image/webp", "K.jpg"], "fiche a jour, adresse inchangee");
}

console.log(`medias.selfcheck : ${checks} verifications passees`);
