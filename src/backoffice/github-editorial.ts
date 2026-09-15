// github-editorial.ts - lecture GitHub du back office Aloha, isolee par configuration de site.
import type { Langue, SiteEditorial, ServicesEditoriaux } from "./contrat.ts";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";
import type { References } from "./validation-reef.ts";

export type Article = { slug: string; extension: "md" | "mdx"; sha: string; frontmatter: Frontmatter; body: string };
type Entree = { name: string; type: string; oid: string; object?: { text?: string } };

export class ErreurGithub extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code = "http") { super(`GitHub ${status}`); this.status = status; this.code = code; }
}

/** L'API GraphQL lit un dossier en une requete, comme dans posts.ts du service interne. */
export async function lireDossier(site: SiteEditorial, services: ServicesEditoriaux, dossier: string): Promise<Entree[]> {
  const [owner, name] = site.depot.split("/");
  const res = await services.github("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query: `query($owner:String!,$name:String!,$expr:String!){repository(owner:$owner,name:$name){object(expression:$expr){... on Tree{entries{name type oid object{... on Blob{text}}}}}}}`,
      variables: { owner, name, expr: `${site.branche}:${dossier}` },
    }),
  });
  if (!res.ok) throw new ErreurGithub(res.status);
  const data = await res.json() as { errors?: unknown[]; data?: { repository?: { object?: { entries?: Entree[] } } } };
  const entries = data.data?.repository?.object?.entries;
  if (data.errors?.length || !entries) throw new ErreurGithub(502, data.errors?.length ? "graphql_errors" : "directory_missing");
  return entries;
}

export async function lireArticles(site: SiteEditorial, services: ServicesEditoriaux, langue: Langue): Promise<Article[]> {
  const entries = await lireDossier(site, services, `${site.dossierArticles}/${langue}`);
  return entries.filter((entry) => entry.type === "blob" && /\.(md|mdx)$/.test(entry.name)).map((entry) => ({
    slug: entry.name.replace(/\.(md|mdx)$/, ""),
    extension: entry.name.endsWith(".mdx") ? "mdx" : "md",
    sha: entry.oid,
    ...parseFrontmatter(entry.object?.text ?? ""),
  }));
}

/** Les photos generees au build sont listees dans le meme manifeste que covers.mjs. */
async function lireImages(site: SiteEditorial, services: ServicesEditoriaux): Promise<Entree[]> {
  if (!site.fichierImages) return lireDossier(site, services, site.dossierImages);
  const [owner, name] = site.depot.split("/");
  const response = await services.github("/graphql", { method: "POST", body: JSON.stringify({
    query: `query($owner:String!,$name:String!,$expr:String!){repository(owner:$owner,name:$name){object(expression:$expr){... on Blob{text}}}}`,
    variables: { owner, name, expr: `${site.branche}:${site.fichierImages}` },
  }) });
  if (!response.ok) throw new ErreurGithub(response.status);
  const data = await response.json() as { errors?: unknown[]; data?: { repository?: { object?: { text?: string } } } };
  if (data.errors?.length || !data.data?.repository?.object?.text) throw new ErreurGithub(502, data.errors?.length ? "graphql_errors" : "manifest_missing");
  const manifest = JSON.parse(data.data.repository.object.text) as Record<string, unknown>;
  return Object.keys(manifest).filter(path => /^covers\/[a-z0-9-]+\.(webp|avif|png|jpe?g)$/i.test(path))
    .map(path => ({ name: path.slice("covers/".length), type: "blob", oid: "" }));
}

export async function lireReferences(site: SiteEditorial, services: ServicesEditoriaux, langue: Langue): Promise<References> {
  const [authors, topics, images] = await Promise.all([
    lireDossier(site, services, `${site.dossierAuteurs}/${langue}`),
    lireDossier(site, services, `${site.dossierSujets}/${langue}`),
    lireImages(site, services),
  ]);
  const ids = (entries: Entree[]) => entries.filter((entry) => entry.type === "blob" && entry.name.endsWith(".json"))
    .map((entry) => `${langue}/${entry.name.slice(0, -5)}`);
  const from = `${site.dossierArticles}/${langue}`.split("/");
  const to = site.dossierImages.split("/");
  while (from.length && to.length && from[0] === to[0]) { from.shift(); to.shift(); }
  const relative = [...from.map(() => ".."), ...to].join("/");
  const libelles: Record<string, string> = {};
  for (const entry of [...authors, ...topics].filter(entry => entry.type === "blob" && entry.name.endsWith(".json"))) {
    try {
      const data = JSON.parse(entry.object?.text ?? "{}");
      if (typeof data.name === "string") libelles[`${langue}/${entry.name.slice(0, -5)}`] = data.name;
    } catch { /* La reference reste disponible par son identifiant. */ }
  }
  return { auteurs: ids(authors), sujets: ids(topics), images: images
    .filter((entry) => entry.type === "blob" && /\.(webp|avif|png|jpe?g)$/i.test(entry.name))
    .map((entry) => `${relative}/${entry.name}`), libelles };
}


async function git(services: ServicesEditoriaux, path: string, method = "GET", body?: unknown): Promise<{ sha?: string; object?: { sha?: string }; tree?: { sha?: string } }> {
  const response = await services.github(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw new ErreurGithub(response.status);
  return response.json();
}
const branchePath = (site: SiteEditorial) => site.branche.split("/").map(encodeURIComponent).join("/");

/** Toutes les lectures d'une mutation portent sur cette revision immuable. */
export async function lireRevision(site: SiteEditorial, services: ServicesEditoriaux): Promise<string> {
  const data = await git(services, `/repos/${site.depot}/git/ref/heads/${branchePath(site)}`);
  const sha = data.object?.sha;
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha)) throw new ErreurGithub(502);
  return sha;
}

/** Le deplacement non force de la branche refuse tout commit concurrent, meme sur un autre fichier. */
export async function ecrireFichier(site: SiteEditorial, services: ServicesEditoriaux, revision: string, path: string, text: string | null, message: string): Promise<{ sha: string | null; commit: string }> {
  const base = `/repos/${site.depot}`;
  const parent = await git(services, `${base}/git/commits/${revision}`);
  if (typeof parent.tree?.sha !== "string") throw new ErreurGithub(502);
  const tree = await git(services, `${base}/git/trees`, "POST", { base_tree: parent.tree.sha, tree: [{ path, mode: "100644", type: "blob", ...(text === null ? { sha: null } : { content: text }) }] });
  if (typeof tree.sha !== "string") throw new ErreurGithub(502);
  const commit = await git(services, `${base}/git/commits`, "POST", { message, tree: tree.sha, parents: [revision] });
  if (typeof commit.sha !== "string") throw new ErreurGithub(502);
  try { await git(services, `${base}/git/refs/heads/${branchePath(site)}`, "PATCH", { sha: commit.sha, force: false }); }
  catch (error) { if (error instanceof ErreurGithub && [409, 422].includes(error.status)) throw new ErreurGithub(409); throw error; }
  let sha: string | null = null;
  if (text !== null) {
    const bytes = new TextEncoder().encode(text);
    const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const blob = new Uint8Array(header.length + bytes.length); blob.set(header); blob.set(bytes, header.length);
    sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", blob)), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return { sha, commit: commit.sha };
}

export async function enregistrerArticle(site: SiteEditorial, services: ServicesEditoriaux, langue: Langue,
  slug: string, extension: "md" | "mdx", texte: string, revision: string): Promise<{ sha: string; commit: string }> {
  const saved = await ecrireFichier(site, services, revision, `${site.dossierArticles}/${langue}/${slug}.${extension}`, texte, `Article ${slug} depuis le back office Aloha`);
  return { sha: saved.sha!, commit: saved.commit };
}

export async function supprimerArticle(site: SiteEditorial, services: ServicesEditoriaux, langue: Langue,
  slug: string, extension: "md" | "mdx", revision: string): Promise<string> {
  return (await ecrireFichier(site, services, revision, `${site.dossierArticles}/${langue}/${slug}.${extension}`, null, `Suppression article ${slug} depuis le back office Aloha`)).commit;
}
