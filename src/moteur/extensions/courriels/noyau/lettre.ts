// src/moteur/extensions/courriels/noyau/lettre.ts - la lettre d'information : la liste des abonnes (double confirmation), les parutions, et les courriels qu'elle envoie.
//
// SANS SERVICE EXTERNE. La liste vit dans la base du site (table
// courriels_abonnes), les courriels partent par le meme canal que le reste
// (Courriels, liaison Cloudflare), et rien ne sort du site.
//
// CONFORME RGPD, PAR CONSTRUCTION :
//   - double confirmation : une inscription reste "en attente" tant que la
//     personne n'a pas clique le lien recu (une adresse tapee par un tiers ne
//     recoit donc jamais la lettre) ; une attente non confirmee est effacee
//     apres 7 jours ;
//   - preuve du consentement : la date de la demande, la date de la
//     confirmation et la page ou le formulaire a ete rempli ; rien d'autre
//     (ni adresse IP, ni navigateur) ;
//   - desinscription en un clic : chaque lettre porte un lien personnel et
//     l'en-tete List-Unsubscribe-Post (RFC 8058, le bouton "Se desinscrire"
//     des messageries) ; la ligne est alors EFFACEE, pas marquee ;
//   - un jeton aleatoire par abonne (256 bits) : personne ne peut desinscrire
//     ou confirmer une autre adresse en devinant un lien.
//
// Les fonctions de ce fichier ne font que lire et ecrire la base ; les
// phrases viennent de ../ecrans/lettre.textes.*.ts.
import { adresseValide, type Langue } from "./regles.ts";
import type { Base } from "./base.ts";

export const SCHEMA_LETTRE: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS courriels_abonnes (
  id TEXT PRIMARY KEY,
  adresse TEXT NOT NULL UNIQUE,
  langue TEXT NOT NULL,
  etat TEXT NOT NULL,
  jeton TEXT NOT NULL UNIQUE,
  page TEXT,
  demande_le INTEGER NOT NULL,
  confirme_le INTEGER
)`,
  "CREATE INDEX IF NOT EXISTS courriels_abonnes_etat ON courriels_abonnes (etat, confirme_le)",
  `CREATE TABLE IF NOT EXISTS courriels_parutions (
  id TEXT PRIMARY KEY,
  quand INTEGER NOT NULL,
  article TEXT NOT NULL,
  titre TEXT NOT NULL,
  envoyes INTEGER NOT NULL,
  refuses INTEGER NOT NULL,
  par TEXT
)`,
  "CREATE INDEX IF NOT EXISTS courriels_parutions_article ON courriels_parutions (article, quand)",
];

/** Le fichier SQL livre avec la version : le meme schema, rejouable sans risque. */
export const SQL_LETTRE = `-- Lettre d'information : abonnes et parutions. Idempotent : rejouer ce fichier ne change rien.\n${SCHEMA_LETTRE.map((s) => `${s};`).join("\n")}\n`;

/** Une inscription non confirmee est effacee au bout de ce delai. */
export const ATTENTE_MS = 7 * 24 * 3_600_000;

/**
 * "desinscrit" : retire de l'envoi par l'administrateur (geste de masse de
 * l'ecran "Abonnes de la lettre"), ligne gardee pour pouvoir le reinscrire.
 * La desinscription par le lien du courriel, elle, efface toujours la ligne.
 */
export type EtatAbonne = "attente" | "inscrit" | "desinscrit";

export interface Abonne {
  id: string;
  adresse: string;
  langue: Langue;
  etat: EtatAbonne;
  jeton: string;
  page: string | null;
  demande_le: number;
  confirme_le: number | null;
}

const pretes = new WeakMap<Base, Promise<void>>();

export function preparerLaLettre(base: Base): Promise<void> {
  let promesse = pretes.get(base);
  if (!promesse) {
    promesse = (async () => {
      for (const instruction of SCHEMA_LETTRE) await base.executer(instruction);
    })();
    promesse.catch(() => pretes.delete(base));
    pretes.set(base, promesse);
  }
  return promesse;
}

/** 32 octets aleatoires en hexadecimal : le jeton personnel d'un abonne. */
export function nouveauJeton(): string {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
}

/** Un jeton tel qu'il arrive dans une adresse : 64 caracteres hexadecimaux, rien d'autre. */
export const jetonValide = (valeur: unknown): valeur is string => typeof valeur === "string" && /^[0-9a-f]{64}$/.test(valeur);

function versAbonne(brut: Record<string, unknown>): Abonne {
  return {
    id: String(brut.id),
    adresse: String(brut.adresse),
    langue: brut.langue === "fr" ? "fr" : "en",
    etat: brut.etat === "inscrit" || brut.etat === "desinscrit" ? brut.etat : "attente",
    jeton: String(brut.jeton),
    page: brut.page == null ? null : String(brut.page),
    demande_le: Number(brut.demande_le),
    confirme_le: brut.confirme_le == null ? null : Number(brut.confirme_le),
  };
}

/** Efface les inscriptions jamais confirmees de plus de 7 jours. */
export async function purgerLesAttentes(base: Base, maintenant: number): Promise<void> {
  await preparerLaLettre(base);
  await base.executer("DELETE FROM courriels_abonnes WHERE etat = 'attente' AND demande_le < ?", [maintenant - ATTENTE_MS]);
}

export interface Demande {
  adresse: string;
  langue: Langue;
  page: string;
}

/**
 * Une demande d'inscription. "nouveau" et "attente" : un courriel de
 * confirmation doit partir (avec le jeton rendu) ; "inscrit" : rien ne part,
 * et le visiteur lit la meme phrase (on ne dit pas a un inconnu qui est deja
 * abonne). "invalide" : l'adresse n'en est pas une.
 */
export async function demanderLInscription(base: Base, d: Demande, maintenant: number, nouvelId: () => string): Promise<{ etat: "nouveau" | "attente" | "inscrit" | "invalide"; jeton?: string }> {
  const adresse = d.adresse.trim().toLowerCase();
  if (!adresseValide(adresse)) return { etat: "invalide" };
  await purgerLesAttentes(base, maintenant);
  const [brut] = await base.lire("SELECT * FROM courriels_abonnes WHERE adresse = ?", [adresse]);
  if (brut) {
    const a = versAbonne(brut);
    if (a.etat === "inscrit") return { etat: "inscrit" };
    await base.executer("UPDATE courriels_abonnes SET langue = ?, page = ?, demande_le = ? WHERE id = ?", [d.langue, d.page, maintenant, a.id]);
    return { etat: "attente", jeton: a.jeton };
  }
  const jeton = nouveauJeton();
  await base.executer("INSERT INTO courriels_abonnes (id, adresse, langue, etat, jeton, page, demande_le, confirme_le) VALUES (?, ?, ?, 'attente', ?, ?, ?, NULL) ON CONFLICT (adresse) DO NOTHING", [nouvelId(), adresse, d.langue, jeton, d.page, maintenant]);
  return { etat: "nouveau", jeton };
}

/** Un abonne par son jeton ; null si le jeton ne designe personne. */
export async function abonneDuJeton(base: Base, jeton: unknown): Promise<Abonne | null> {
  if (!jetonValide(jeton)) return null;
  await preparerLaLettre(base);
  const [brut] = await base.lire("SELECT * FROM courriels_abonnes WHERE jeton = ?", [jeton]);
  return brut ? versAbonne(brut) : null;
}

/** La confirmation : "confirme" la premiere fois, "deja" ensuite, "inconnu" pour un jeton efface ou faux. */
export async function confirmer(base: Base, jeton: unknown, maintenant: number): Promise<{ issue: "confirme" | "deja" | "inconnu"; abonne?: Abonne }> {
  const a = await abonneDuJeton(base, jeton);
  if (!a) return { issue: "inconnu" };
  if (a.etat === "inscrit") return { issue: "deja", abonne: a };
  await base.executer("UPDATE courriels_abonnes SET etat = 'inscrit', confirme_le = ? WHERE id = ?", [maintenant, a.id]);
  return { issue: "confirme", abonne: { ...a, etat: "inscrit", confirme_le: maintenant } };
}

/** La desinscription : la ligne est effacee. Rend l'abonne efface (pour dire ou revenir), ou null. */
export async function desinscrire(base: Base, jeton: unknown): Promise<Abonne | null> {
  const a = await abonneDuJeton(base, jeton);
  if (!a) return null;
  await base.executer("DELETE FROM courriels_abonnes WHERE id = ?", [a.id]);
  return a;
}

/** Retire un abonne depuis le back office (a sa demande, par exemple). */
export async function retirer(base: Base, id: string): Promise<boolean> {
  await preparerLaLettre(base);
  const [brut] = await base.lire<{ n: number }>("SELECT COUNT(*) AS n FROM courriels_abonnes WHERE id = ?", [id]);
  await base.executer("DELETE FROM courriels_abonnes WHERE id = ?", [id]);
  return Number(brut?.n ?? 0) > 0;
}

export async function compterLesAbonnes(base: Base, maintenant: number): Promise<{ inscrits: number; attente: number; desinscrits: number }> {
  await purgerLesAttentes(base, maintenant);
  const lignes = await base.lire<{ etat: string; n: number }>("SELECT etat, COUNT(*) AS n FROM courriels_abonnes GROUP BY etat");
  const n = (e: string) => Number(lignes.find((l) => l.etat === e)?.n ?? 0);
  return { inscrits: n("inscrit"), attente: n("attente"), desinscrits: n("desinscrit") };
}

/* --- La gestion de la liste (ecran "Abonnes de la lettre") --------------- */

export type FiltreAbonnes = EtatAbonne | "tous";

/** Une page de la liste, filtree et cherchee, et le nombre total qui correspond. */
export async function chercherDesAbonnes(base: Base, r: { filtre?: FiltreAbonnes; q?: string; depuis?: number; limite?: number }, maintenant: number): Promise<{ items: Abonne[]; suite: number | null; total: number }> {
  await purgerLesAttentes(base, maintenant);
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (r.filtre && r.filtre !== "tous") {
    conditions.push("etat = ?");
    params.push(r.filtre);
  }
  const q = (r.q ?? "").trim().toLowerCase().slice(0, 120);
  if (q) {
    conditions.push("adresse LIKE ? ESCAPE '\\'");
    params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limite = Math.min(Math.max(r.limite ?? 100, 1), 5000);
  const depuis = Math.max(r.depuis ?? 0, 0);
  const brut = await base.lire(`SELECT * FROM courriels_abonnes ${where} ORDER BY COALESCE(confirme_le, demande_le) DESC, id DESC LIMIT ? OFFSET ?`, [...params, limite + 1, depuis]);
  const [compte] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_abonnes ${where}`, params);
  return { items: brut.slice(0, limite).map(versAbonne), suite: brut.length > limite ? depuis + limite : null, total: Number(compte?.n ?? 0) };
}

export type GesteDeMasse = "desinscrire" | "reinscrire" | "supprimer";

/**
 * Un geste sur plusieurs abonnes a la fois ; rend le nombre de lignes changees.
 * Reinscrire ne vaut que pour une adresse qui avait confirme elle-meme (date
 * de confirmation) : une inscription jamais confirmee ne devient pas un
 * abonne par un clic de l'administrateur (double confirmation, RGPD).
 */
export async function gesteSurLesAbonnes(base: Base, ids: readonly string[], geste: GesteDeMasse): Promise<number> {
  const propres = ids.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 80).slice(0, 5000);
  if (!propres.length) return 0;
  await preparerLaLettre(base);
  let n = 0;
  // Par paquets de 90 : D1 limite le nombre de parametres d'une requete.
  for (let i = 0; i < propres.length; i += 90) {
    const paquet = propres.slice(i, i + 90);
    const marques = paquet.map(() => "?").join(", ");
    const condition = geste === "desinscrire" ? " AND etat = 'inscrit'" : geste === "reinscrire" ? " AND etat = 'desinscrit' AND confirme_le IS NOT NULL" : "";
    const [avant] = await base.lire<{ n: number }>(`SELECT COUNT(*) AS n FROM courriels_abonnes WHERE id IN (${marques})${condition}`, paquet);
    if (geste === "supprimer") await base.executer(`DELETE FROM courriels_abonnes WHERE id IN (${marques})`, paquet);
    else await base.executer(`UPDATE courriels_abonnes SET etat = ? WHERE id IN (${marques})${condition}`, [geste === "desinscrire" ? "desinscrit" : "inscrit", ...paquet]);
    n += Number(avant?.n ?? 0);
  }
  return n;
}

/** Les abonnes, confirmes d'abord, du plus recent au plus ancien. */
export async function listeDesAbonnes(base: Base, limite: number): Promise<Abonne[]> {
  await preparerLaLettre(base);
  const brut = await base.lire("SELECT * FROM courriels_abonnes ORDER BY etat = 'inscrit' DESC, COALESCE(confirme_le, demande_le) DESC LIMIT ?", [Math.min(Math.max(limite, 1), 500)]);
  return brut.map(versAbonne);
}

/** Tous les abonnes confirmes : les destinataires d'une parution. */
export async function abonnesConfirmes(base: Base): Promise<Abonne[]> {
  await preparerLaLettre(base);
  return (await base.lire("SELECT * FROM courriels_abonnes WHERE etat = 'inscrit' ORDER BY confirme_le")).map(versAbonne);
}

/* --- Les parutions ------------------------------------------------------- */

export interface Parution {
  id: string;
  quand: number;
  article: string;
  titre: string;
  envoyes: number;
  refuses: number;
  par: string | null;
}

export async function noterLaParution(base: Base, p: Parution): Promise<void> {
  await preparerLaLettre(base);
  await base.executer("INSERT INTO courriels_parutions (id, quand, article, titre, envoyes, refuses, par) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING", [p.id, p.quand, p.article, p.titre, p.envoyes, p.refuses, p.par]);
}

export async function parutions(base: Base, limite = 10): Promise<Parution[]> {
  await preparerLaLettre(base);
  const brut = await base.lire<Record<string, unknown>>("SELECT * FROM courriels_parutions ORDER BY quand DESC LIMIT ?", [limite]);
  return brut.map((b) => ({ id: String(b.id), quand: Number(b.quand), article: String(b.article), titre: String(b.titre), envoyes: Number(b.envoyes), refuses: Number(b.refuses), par: b.par == null ? null : String(b.par) }));
}

/* --- Les articles que la lettre peut envoyer ----------------------------- */

/** Ce que le site dit de ses articles (champ `lettre` de configuration.ts ; absent : pas de lettre). */
export interface OptionsDeLaLettre {
  /** La collection des articles ("posts" chez Reef). */
  collection: string;
  /** L'adresse d'un article par langue, {slug} remplace : { en: "/blog/{slug}/", fr: "/fr/blog/{slug}/" }. */
  adresse: Partial<Record<Langue, string>>;
  /** Les champs du titre et du resume ("title", "description" par defaut). */
  titre?: string;
  resume?: string;
  /** L'accueil de chaque langue, ou revient le visiteur apres un lien de confirmation ou de desinscription. */
  accueil?: Partial<Record<Langue, string>>;
}

/** L'accueil d'une langue (pour les retours des liens), "/" par defaut. */
export function accueilDe(o: OptionsDeLaLettre, langue: Langue): string {
  const chemin = o.accueil?.[langue] ?? o.accueil?.en ?? "/";
  return /^\/(?!\/)[^\s\\?#]{0,200}$/.test(chemin) ? chemin : "/";
}

export interface Article {
  id: string;
  groupe: string;
  slug: string;
  langue: Langue;
  titre: string;
  resume: string;
  publie_le: string | null;
}

const IDENTIFIANT = /^[a-z][a-z0-9_]{0,40}$/;

/** Les articles publies, les plus recents d'abord, chaque langue a part. Rien si les options sont mal formees. */
export async function articlesPublies(base: Base, o: OptionsDeLaLettre, limite = 60): Promise<Article[]> {
  const titre = o.titre ?? "title";
  const resume = o.resume ?? "description";
  if (![o.collection, titre, resume].every((n) => IDENTIFIANT.test(n))) return [];
  const brut = await base.lire<Record<string, unknown>>(
    `SELECT id, translation_group, slug, locale, "${titre}" AS titre, "${resume}" AS resume, published_at FROM "ec_${o.collection}" WHERE status = 'published' AND deleted_at IS NULL ORDER BY published_at DESC LIMIT ?`,
    [limite],
  );
  return brut.map((b) => ({
    id: String(b.id),
    groupe: String(b.translation_group ?? b.id),
    slug: String(b.slug ?? ""),
    langue: b.locale === "fr" ? "fr" : "en",
    titre: String(b.titre ?? ""),
    resume: String(b.resume ?? ""),
    publie_le: b.published_at == null ? null : String(b.published_at),
  }));
}

/** La version d'un article pour un abonne : celle de sa langue, sinon celle qui existe. */
export function versionPour(versions: readonly Article[], langue: Langue): Article | undefined {
  return versions.find((a) => a.langue === langue) ?? versions[0];
}

/** L'adresse publique d'un article, ou null si le site ne l'a pas decrite pour cette langue. */
export function adresseDeLArticle(o: OptionsDeLaLettre, article: Article, origine: string): string | null {
  const modele = o.adresse[article.langue] ?? o.adresse.en ?? o.adresse.fr;
  if (!modele || !article.slug) return null;
  return `${origine.replace(/\/$/, "")}${modele.replace("{slug}", encodeURIComponent(article.slug))}`;
}

/** Les deux liens personnels d'un abonne. La route est celle que le site declare (ROUTE_DE_LA_LETTRE). */
export function liensDeLAbonne(origine: string, route: string, jeton: string): { confirmer: string; desinscrire: string } {
  const base = `${origine.replace(/\/$/, "")}${route}`;
  return { confirmer: `${base}/confirmer?jeton=${jeton}`, desinscrire: `${base}/desinscrire?jeton=${jeton}` };
}
