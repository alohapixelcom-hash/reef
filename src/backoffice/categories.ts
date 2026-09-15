// categories.ts - rubriques Reef avec validation et publication atomique sur une revision connue.
import type { Langue, ServicesEditoriaux, SiteEditorial } from "./contrat.ts";
import { lireArticles, lireDossier, lireRevision, ecrireFichier } from "./github-editorial.ts";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
type Input = { action?: string; sha?: string; frontmatter?: Record<string, unknown> };

/** Les references sont lues au meme commit que la modification ; un nouveau commit concurrent bloque la fusion. */
export async function categories(site: SiteEditorial, services: ServicesEditoriaux, langue: Langue, slug: string | undefined, input: Input, method: string): Promise<Response> {
  const head = method === "POST" ? await lireRevision(site, services) : undefined;
  const snapshot = head ? { ...site, branche: head } : site;
  const entries = await lireDossier(snapshot, services, `${site.dossierSujets}/${langue}`);
  const items = entries.filter(entry => entry.type === "blob" && entry.name.endsWith(".json")).map(entry => ({ slug: entry.name.slice(0, -5), sha: entry.oid, frontmatter: JSON.parse(entry.object?.text ?? "{}") as Record<string, unknown> }));
  const current = items.find(item => item.slug === slug);
  if (method === "GET") return slug ? current ? json(current) : json({ error: "not_found" }, 404) : json({ items });
  if (!slug) return json({ error: "slug_required" }, 400);
  if ((current && current.sha !== input.sha) || (!current && input.sha)) return json({ error: "conflict" }, 409);
  const deleting = input.action === "delete";
  if (deleting && !current) return json({ error: "not_found" }, 404);
  if (deleting) {
    const articles = await lireArticles(snapshot, services, langue);
    if (articles.some(article => article.frontmatter.topic === `${langue}/${slug}`)) return json({ error: "category_in_use" }, 422);
  }
  const data = { ...current?.frontmatter, ...input.frontmatter };
  if (!deleting && (typeof data.name !== "string" || !data.name.trim() || data.name.length > 120 || typeof data.description !== "string" || data.description.length > 2000 || !["coral", "reef", "ink"].includes(String(data.accent)) || typeof data.order !== "number" || !Number.isSafeInteger(data.order))) return json({ error: "validation", fields: ["name", "description", "accent", "order"] }, 422);
  const saved = await ecrireFichier(site, services, head!, `${site.dossierSujets}/${langue}/${slug}.json`, deleting ? null : JSON.stringify(data, null, 2) + "\n", `${deleting ? "Suppression" : "Modification"} rubrique ${slug} depuis le back office Aloha`);
  return json({ ok: true, ...saved, publication: "building", deleted: deleting });
}
