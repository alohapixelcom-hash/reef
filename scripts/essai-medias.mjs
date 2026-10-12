#!/usr/bin/env node
// scripts/essai-medias.mjs - essai reel de la conversion des photos en local : le vrai code de l'extension, le liant Images de wrangler (sharp), une base D1 et un seau R2 locaux, jetes a la fin.
//
// CE QUE L'ESSAI PROUVE : le chemin entier (aiguillage d'un envoi, lot des
// photos deja en base) avec un vrai encodeur, de vraies tailles mesurees, une
// vraie base SQLite et un vrai seau. CE QU'IL NE PROUVE PAS : le comportement
// de Cloudflare en ligne. En local, wrangler remplace le liant par sharp
// ("A low-fidelity offline version", developers.cloudflare.com/images/
// optimization/binding/) : il ignore la qualite, ne lit pas le HEIC (sharp
// livre sans decodeur HEVC) et ne tourne pas l'image selon l'EXIF. Ces trois
// points ne se prouvent qu'en ligne, avec une vraie photo d'iPhone.
//
// Lancer depuis un site qui a wrangler et sharp dans ses dependances :
//   node scripts/essai-medias.mjs [--dossier src/moteur/medias] [--depuis <dossier du site>]
// Rien n'est ecrit hors d'un dossier temporaire ; aucun reseau.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const arg = (nom, defaut) => {
  const i = process.argv.indexOf(nom);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
};
const DOSSIER = resolve(arg("--dossier", "src/moteur/medias"));
const DEPUIS = resolve(arg("--depuis", process.cwd()));
const exiger = createRequire(join(DEPUIS, "package.json"));
const { getPlatformProxy } = await import(pathToFileURL(exiger.resolve("wrangler")).href);
const sharp = (await import(pathToFileURL(exiger.resolve("sharp")).href)).default;
const module = (nom) => import(pathToFileURL(join(DOSSIER, nom)).href);
const { aiguillerLesMedias } = await module("aiguillage.ts");
const { d1De, derniers } = await module("base.ts");
const { optimiserUnLot } = await module("lot.ts");
const { dimensionsDe, poids, sorteDe } = await module("regles.ts");

let echecs = 0;
const constat = (ok, texte) => {
  console.log(`${ok ? "ok   " : "ECHEC"} ${texte}`);
  if (!ok) echecs += 1;
};

const temporaire = mkdtempSync(join(tmpdir(), "essai-medias-"));
writeFileSync(join(temporaire, "w.js"), "export default { fetch() { return new Response(null, { status: 404 }); } };\n");
writeFileSync(
  join(temporaire, "wrangler.jsonc"),
  JSON.stringify({
    name: "essai-medias",
    main: "w.js",
    compatibility_date: "2026-09-01",
    images: { binding: "IMAGES" },
    d1_databases: [{ binding: "DB", database_name: "essai", database_id: "00000000-0000-0000-0000-000000000000" }],
    r2_buckets: [{ binding: "MEDIA", bucket_name: "essai" }],
  }),
);
// wrangler ecrit son dossier .wrangler dans le dossier courant : on le met dans le dossier jete.
process.chdir(temporaire);
const plateforme = await getPlatformProxy({ configPath: join(temporaire, "wrangler.jsonc"), persist: false });
const { IMAGES, MEDIA } = plateforme.env;
const base = d1De(plateforme.env, "DB");

try {
  // La table media d'EmDash 0.38 (migrations 001 et 002), colonnes lues et ecrites par l'extension.
  await base.executer(`CREATE TABLE media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER,
    width INTEGER, height INTEGER, storage_key TEXT NOT NULL, content_hash TEXT, created_at TEXT, status TEXT NOT NULL DEFAULT 'ready')`);

  // Les photos d'essai, fabriquees par sharp : une photo d'appareil (EXIF, orientation 6, position GPS), un PNG transparent, une petite photo, un GIF.
  const fond = (l, h, couleur) => sharp({ create: { width: l, height: h, channels: 3, background: couleur } }).composite([
    { input: Buffer.from(`<svg width="${l}" height="${h}"><circle cx="${l / 3}" cy="${h / 3}" r="${h / 4}" fill="#f6a"/><rect x="${l / 2}" y="${h / 2}" width="${l / 3}" height="${h / 4}" fill="#135"/></svg>`) },
  ]);
  const gps = { IFD0: { Copyright: "essai" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 18/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "0/1 22/1 0/1" } };
  const appareil = await sharp(await fond(4032, 3024, "#3a7").jpeg({ quality: 92 }).toBuffer()).withExif(gps).withMetadata({ orientation: 6 }).jpeg({ quality: 92 }).toBuffer();
  const transparent = await sharp({ create: { width: 1600, height: 900, channels: 4, background: { r: 20, g: 60, b: 90, alpha: 0.4 } } }).png().toBuffer();
  const petite = await fond(800, 600, "#e85").jpeg({ quality: 90 }).toBuffer();
  const gif = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#fc0" } }).gif().toBuffer();
  const meta = await sharp(appareil).metadata();
  constat(meta.orientation === 6 && Boolean(meta.exif), `photo d'essai : orientation EXIF ${meta.orientation}, EXIF ${meta.exif?.length ?? 0} octets (position GPS comprise)`);

  // Un faux EmDash minimal : qui est connecte, et l'envoi en un temps qui range le fichier comme EmDash 0.38 (cle = identifiant + extension du nom).
  let numero = 0;
  const suite = async (requete) => {
    const chemin = new URL(requete.url).pathname;
    if (chemin === "/_emdash/api/auth/me") return Response.json({ data: { role: 50 } });
    const f = await requete.formData();
    const fichier = f.get("file");
    const id = `envoi${(numero += 1)}`;
    const cle = `${id}${fichier.name.match(/\.[^.]+$/)?.[0] ?? ""}`;
    const octets = new Uint8Array(await fichier.arrayBuffer());
    await MEDIA.put(cle, octets, { httpMetadata: { contentType: fichier.type } });
    await base.executer("INSERT INTO media (id, filename, mime_type, size, width, height, storage_key, created_at) VALUES (?,?,?,?,?,?,?,?)", [
      id, fichier.name, fichier.type, octets.length, Number(f.get("width")) || null, Number(f.get("height")) || null, cle, new Date().toISOString(),
    ]);
    return Response.json({ success: true, data: { item: { id, filename: fichier.name } } }, { status: 201 });
  };
  const envoyer = (octets, nom, type) => {
    const f = new FormData();
    f.append("file", new File([octets], nom, { type }));
    return aiguillerLesMedias(new Request("https://essai.local/_emdash/api/media", { method: "POST", body: f, headers: { cookie: "essai=1" } }), { images: IMAGES, base, suite });
  };

  console.log("\n1. Envoi de photos neuves");
  for (const [octets, nom, type] of [[appareil, "IMG_0001.JPG", "image/jpeg"], [transparent, "fond.png", "image/png"], [petite, "vignette.jpg", "image/jpeg"], [gif, "pastille.gif", "image/gif"]]) {
    const reponse = await envoyer(octets, nom, type);
    const [ligne] = await base.lire("SELECT * FROM media ORDER BY rowid DESC LIMIT 1");
    const objet = await MEDIA.get(ligne.storage_key);
    const rendu = new Uint8Array(await objet.arrayBuffer());
    const lu = await sharp(rendu).metadata();
    const d = dimensionsDe(rendu);
    console.log(`     ${nom} (${poids(octets.length)}) > ${ligne.filename}, ${ligne.mime_type}, ${poids(rendu.length)}, ${d?.largeur}x${d?.hauteur}, cle ${ligne.storage_key}`);
    constat(reponse?.status === 201, `${nom} : EmDash a recu l'envoi (201)`);
    if (type === "image/gif") {
      constat(ligne.mime_type === "image/gif" && rendu.length === octets.length, `${nom} : passe tel quel`);
      continue;
    }
    constat(ligne.mime_type === `image/${sorteDe(rendu)}` && objet.httpMetadata?.contentType === ligne.mime_type, `${nom} : type de la fiche = octets = type range dans R2`);
    constat(ligne.storage_key.endsWith(`.${sorteDe(rendu)}`) && ligne.filename.endsWith(`.${sorteDe(rendu)}`), `${nom} : nom et cle a la bonne extension`);
    constat(Math.max(d.largeur, d.hauteur) <= 2560 && ligne.width === d.largeur && ligne.height === d.hauteur, `${nom} : 2560 px au plus, dimensions de la fiche exactes`);
    constat(!lu.exif, `${nom} : aucune metadonnee EXIF dans la sortie (GPS compris)`);
    constat(rendu.length < octets.length, `${nom} : plus leger (${poids(octets.length)} > ${poids(rendu.length)}, mesure locale)`);
  }

  console.log("\n2. Optimisation des photos deja en base");
  const anciennes = [["ancienne1", "plage.jpg", appareil, "image/jpeg"], ["ancienne2", "affiche.png", transparent, "image/png"]];
  for (const [id, nom, octets, type] of anciennes) {
    const d = dimensionsDe(new Uint8Array(octets));
    await MEDIA.put(`${id}.${nom.split(".").pop()}`, octets, { httpMetadata: { contentType: type } });
    await base.executer("INSERT INTO media (id, filename, mime_type, size, width, height, storage_key, created_at) VALUES (?,?,?,?,?,?,?,?)", [id, nom, type, octets.length, d.largeur, d.hauteur, `${id}.${nom.split(".").pop()}`, "2026-01-01"]);
  }
  const bilan = await optimiserUnLot({ base, seau: MEDIA, images: IMAGES, maintenant: Date.now });
  console.log(`     lot : ${JSON.stringify(bilan)}`);
  for (const [id, nom, octets, type] of anciennes) {
    const cle = `${id}.${nom.split(".").pop()}`;
    const [ligne] = await base.lire("SELECT * FROM media WHERE id = ?", [id]);
    const objet = await MEDIA.get(cle);
    const original = await MEDIA.get(`backups/aloha-medias/${cle}`);
    constat(ligne.storage_key === cle, `${nom} : cle inchangee (${cle}), donc adresse inchangee`);
    constat(objet.httpMetadata?.contentType === ligne.mime_type && ligne.mime_type !== type, `${nom} : ${type} devenu ${ligne.mime_type}, ${poids(octets.length)} > ${poids(ligne.size)}`);
    constat(original && original.size === octets.length, `${nom} : original garde sous backups/aloha-medias/`);
  }
  const relance = await optimiserUnLot({ base, seau: MEDIA, images: IMAGES, maintenant: Date.now });
  constat(relance.examinees === 0, "un second clic ne reprend aucune photo deja traitee");
  console.log("\n3. Journal (aloha_medias)");
  for (const l of await derniers(base, 10)) console.log(`     ${l.origine} ${l.etat} ${l.nom} ${l.format ?? ""} ${l.avant ?? ""} > ${l.apres ?? ""} ${l.detail ?? ""}`);
} finally {
  await plateforme.dispose();
  rmSync(temporaire, { recursive: true, force: true });
}
console.log(echecs ? `\nessai-medias : ${echecs} echec(s)` : "\nessai-medias : tout est conforme");
process.exit(echecs ? 1 : 0);
