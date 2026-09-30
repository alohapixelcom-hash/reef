// src/frontal/version.ts - la version du contenu publie, lue dans la base du moteur (D1) en une requete : elle entre dans la cle du cache, et une publication la change.
//
// LE PRINCIPE (patron CACHE-PUBLICATION d'Explorissima). Le cache ne se purge
// jamais : sa cle porte la version du contenu. Publier une section, renommer
// un lien de menu, changer le nom du site, ajouter une redirection change la
// version, donc la cle, et la page suivante est rendue a neuf par le moteur.
// Les anciennes copies ne sont plus jamais demandees et s'effacent seules au
// bout de leur conservation. Rien a purger, et la Cache API, propre a chaque
// centre de donnees, n'a pas besoin de l'etre.
//
// CE QUE LA VERSION RESUME, table par table (EmDash 0.38) :
//   - chaque collection (ec_<slug>, liste lue dans _emdash_collections) :
//     nombre d'entrees, derniere modification, nombre de publiees, derniere
//     date de publication (une publication programmee faite par le cron la
//     change aussi) ;
//   - les revisions (chaque enregistrement d'une entree en cree une) ;
//   - les reglages du site (options "site:*", par leur revision) ;
//   - les menus et chacun de leurs liens (libelle, adresse, ordre, classes :
//     renommer un lien ne touche aucune date) ;
//   - les redirections, le SEO des entrees, la mediatheque, les taxonomies ;
//   - la boutique, quand le site en a une : les reglages de vente (TTC ou HT,
//     TVA, devise : boutique_reglages) et le stock (boutique_stock). Une vente
//     qui epuise un produit ou un passage en HT change donc la version. Ces
//     tables ne sont lues que si elles existent (signature du schema), une
//     table absente ferait echouer toute la requete.
// Une requete, un aller-retour vers D1, qui est fortement coherente : une
// ecriture validee se lit a la requete suivante (KV, lui, met 30 a 60 s).
//
// SI LA LECTURE ECHOUE (une table absente, la base injoignable), la version
// vaut null et le frontal sert la page du moteur sans cache : un defaut de
// cache ne doit jamais montrer une page perimee.

export interface Base {
  prepare(requete: string): { first<T = Record<string, unknown>>(): Promise<T | null> };
}

export interface Version {
  /** L'empreinte courte de tout ce que la page peut afficher. */
  cle: string;
  /** La plus recente date lue (millisecondes), ou 0 : le frontal ne garde aucune copie juste apres un changement. */
  derniere: number;
}

/** Les slugs de collection sont des noms de table : seuls lettres minuscules, chiffres et soulignes passent. */
const SLUG = /^[a-z0-9_]+$/;

/** Les tables de la boutique que la version sait resumer, et ce qu'elle en lit. */
const TABLES_DE_LA_BOUTIQUE: Record<string, string> = {
  boutique_reglages: "(SELECT COUNT(*) || '.' || IFNULL(MAX(maj), '') FROM boutique_reglages) AS boutique_reglages",
  boutique_stock:
    "(SELECT COUNT(*) || '.' || IFNULL(MAX(maj), '') || '.' || IFNULL(SUM(IFNULL(quantite, -1) * 2 + precommande), 0) FROM boutique_stock) AS boutique_stock",
};

const SCHEMA = `(IFNULL((SELECT group_concat(slug || '@' || IFNULL(updated_at, ''), ',') FROM (SELECT slug, updated_at FROM _emdash_collections ORDER BY slug)), '') || '#' || IFNULL((SELECT group_concat(name, ',') FROM (SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${Object.keys(
  TABLES_DE_LA_BOUTIQUE,
)
  .map((t) => `'${t}'`)
  .join(", ")}) ORDER BY name)), ''))`;

/** La requete qui resume la base, pour ces collections et ces tables de la boutique. */
export function requeteDeLaVersion(collections: readonly string[], tables: readonly string[] = []): string {
  const parCollection = collections
    .filter((slug) => SLUG.test(slug))
    .map(
      (slug) =>
        `(SELECT COUNT(*) || '.' || IFNULL(MAX(updated_at), '') || '.' || IFNULL(SUM(status = 'published'), 0) || '.' || IFNULL(MAX(published_at), '') FROM "ec_${slug}") AS "c_${slug}"`,
    );
  return [
    "SELECT",
    [
      `${SCHEMA} AS schema`,
      ...parCollection,
      "(SELECT COUNT(*) || '.' || IFNULL(MAX(created_at), '') FROM revisions) AS revisions",
      "(SELECT group_concat(name || '=' || IFNULL(revision, ''), ',') FROM options WHERE name LIKE 'site:%') AS reglages",
      "(SELECT COUNT(*) || '.' || IFNULL(MAX(updated_at), '') FROM _emdash_menus) AS menus",
      "(SELECT group_concat(id || '|' || IFNULL(sort_order, '') || '|' || IFNULL(parent_id, '') || '|' || IFNULL(label, '') || '|' || IFNULL(custom_url, '') || '|' || IFNULL(reference_id, '') || '|' || IFNULL(css_classes, '') || '|' || IFNULL(target, '') || '|' || IFNULL(locale, ''), ',') FROM _emdash_menu_items) AS liens",
      "(SELECT COUNT(*) || '.' || IFNULL(MAX(updated_at), '') || '.' || IFNULL(SUM(enabled), 0) FROM _emdash_redirects) AS redirections",
      "(SELECT COUNT(*) || '.' || IFNULL(MAX(updated_at), '') FROM _emdash_seo) AS seo",
      "(SELECT COUNT(*) || '.' || IFNULL(MAX(created_at), '') || '.' || IFNULL(SUM(length(IFNULL(alt, '')) + IFNULL(focal_x, 0) * 1000 + IFNULL(focal_y, 0)), 0) FROM media) AS medias",
      "(SELECT COUNT(*) FROM taxonomies) || '.' || (SELECT COUNT(*) FROM content_taxonomies) AS taxonomies",
      ...tables.filter((t) => Object.hasOwn(TABLES_DE_LA_BOUTIQUE, t)).map((t) => TABLES_DE_LA_BOUTIQUE[t]!),
    ].join(",\n  "),
  ].join("\n  ");
}

/** Les collections nommees par la signature du schema ("sections@2026-...,site@...#boutique_stock"). */
export function collectionsDuSchema(schema: string | null | undefined): string[] {
  if (!schema) return [];
  return (schema.split("#")[0] ?? "")
    .split(",")
    .map((morceau) => morceau.split("@")[0] ?? "")
    .filter((slug) => SLUG.test(slug));
}

/** Les tables de la boutique presentes, nommees apres le "#" de la signature. */
export function tablesDuSchema(schema: string | null | undefined): string[] {
  const apres = schema?.split("#")[1] ?? "";
  return apres.split(",").filter((t) => Object.hasOwn(TABLES_DE_LA_BOUTIQUE, t));
}

const DATE = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g;

/** La plus recente date ecrite dans les valeurs lues (SQLite ecrit "2026-09-28 17:17:04" en UTC, EmDash l'ISO avec Z). */
export function plusRecente(valeurs: readonly unknown[]): number {
  let max = 0;
  for (const valeur of valeurs) {
    if (typeof valeur !== "string") continue;
    for (const brute of valeur.match(DATE) ?? []) {
      const iso = brute.replace(" ", "T");
      const t = Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
      if (Number.isFinite(t) && t > max) max = t;
    }
  }
  return max;
}

/** Une empreinte courte (SHA-256, 16 caracteres hexadecimaux) d'une ligne lue. */
export async function empreinte(ligne: Record<string, unknown>): Promise<string> {
  const texte = JSON.stringify(Object.keys(ligne).sort().map((cle) => [cle, ligne[cle]]));
  const octets = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)));
  return [...octets.slice(0, 8)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

// La requete est construite une fois par isolat, puis refaite quand la
// signature du schema change (une collection ajoutee dans le back office).
let requete: { schema: string; sql: string } | null = null;

/** Lit la version dans la base : une requete, deux quand le schema vient de changer. null si la lecture echoue. */
export async function lireLaVersion(base: Base): Promise<Version | null> {
  try {
    if (!requete) {
      const tete = await base.prepare(`SELECT ${SCHEMA} AS schema`).first<{ schema: string | null }>();
      const schema = tete?.schema ?? "";
      requete = { schema, sql: requeteDeLaVersion(collectionsDuSchema(schema), tablesDuSchema(schema)) };
    }
    let ligne = await base.prepare(requete.sql).first<Record<string, unknown>>();
    if (ligne && ligne.schema !== requete.schema) {
      const schema = typeof ligne.schema === "string" ? ligne.schema : "";
      requete = { schema, sql: requeteDeLaVersion(collectionsDuSchema(schema), tablesDuSchema(schema)) };
      ligne = await base.prepare(requete.sql).first<Record<string, unknown>>();
    }
    if (!ligne) return null;
    return { cle: await empreinte(ligne), derniere: plusRecente(Object.values(ligne)) };
  } catch {
    requete = null;
    return null;
  }
}
