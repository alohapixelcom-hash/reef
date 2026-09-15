// validation-reef.ts - adapte le formulaire Aloha au schema editorial existant de Reef.
import { identifiantValide, type Langue } from "./contrat.ts";
import type { Frontmatter } from "./frontmatter.ts";

export type References = { auteurs: string[]; sujets: string[]; images: string[]; libelles?: Record<string, string> };

/** Conserve les champs inconnus et refuse les contenus qui ne peuvent pas etre compiles. */
export function validerReef(fm: Frontmatter, body: string, langue: Langue, refs: References): string[] {
  const erreurs: string[] = [];
  if (typeof fm.title !== "string" || !fm.title.trim()) erreurs.push("title");
  if (typeof fm.description !== "string" || !fm.description.trim()) erreurs.push("description");
  const dateValide = (value: unknown): boolean => typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value));
  if (!dateValide(fm.pubDate)) erreurs.push("pubDate");
  if (fm.updatedDate !== undefined && !dateValide(fm.updatedDate)) erreurs.push("updatedDate");
  const reference = (value: unknown, options: string[]): boolean => typeof value === "string" &&
    value.startsWith(`${langue}/`) && identifiantValide(value.slice(3)) && options.includes(value);
  if (!reference(fm.author, refs.auteurs)) erreurs.push("author");
  if (!reference(fm.topic, refs.sujets)) erreurs.push("topic");
  if (fm.tags !== undefined && (!Array.isArray(fm.tags) || fm.tags.some((tag) => typeof tag !== "string"))) erreurs.push("tags");
  for (const key of ["draft", "featured"]) {
    if (fm[key] !== undefined && typeof fm[key] !== "boolean") erreurs.push(key);
  }
  if (fm.cover !== undefined && (typeof fm.cover !== "string" || !refs.images.includes(fm.cover))) erreurs.push("cover");
  if (fm.cover !== undefined && (typeof fm.coverAlt !== "string" || !fm.coverAlt.trim())) erreurs.push("coverAlt");
  if (typeof body !== "string" || !body.trim() || body.length > 500_000) erreurs.push("body");
  if (Object.keys(fm).some((key) => ["__proto__", "constructor", "prototype"].includes(key))) erreurs.push("frontmatter");
  return erreurs;
}
