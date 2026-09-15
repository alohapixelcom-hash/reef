// github-editorial.ts - lecture GitHub du back office Aloha, isolee par configuration de site.
import type { Langue, SiteEditorial, ServicesEditoriaux } from "./contrat.ts";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";
import type { References } from "./validation-reef.ts";

export type Article = { slug: string; extension: "md" | "mdx"; sha: string; frontmatter: Frontmatter; body: string };
type Entree = { name: string; type: string; oid: string; object?: { text?: string } };

export class ErreurGithub extends Error {
  readonly status: number;
  constructor(status: number) { super(`GitHub ${status}`); this.status = status; }
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
  if (data.errors?.length || !entries) throw new ErreurGithub(502);
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
  if (data.errors?.length || !data.data?.repository?.object?.text) throw new ErreurGithub(502);
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

/** Le SHA de blob rend un conflit visible ; un ancien formulaire n'ecrase pas un nouveau fichier. */
export async function enregistrerArticle(site: SiteEditorial, services: ServicesEditoriaux, langue: Langue,
  slug: string, extension: "md" | "mdx", texte: string, sha?: string): Promise<{ sha: string; commit: string }> {
  const bytes = new TextEncoder().encode(texte);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const path = `${site.dossierArticles}/${langue}/${slug}.${extension}`;
  const res = await services.github(`/repos/${site.depot}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message: `Article ${slug} depuis le back office Aloha`, content: btoa(binary), branch: site.branche, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new ErreurGithub(res.status);
  const data = await res.json() as { content?: { sha?: string }; commit?: { sha?: string } };
  if (!data.content?.sha || !data.commit?.sha) throw new ErreurGithub(502);
  return { sha: data.content.sha, commit: data.commit.sha };
}
