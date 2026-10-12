// src/moteur/design/api.ts - ce que la page Design lit et ecrit par l'API d'EmDash, avec la session de la personne connectee : les langues, l'entree "site" de chacune, le logo des Parametres, la mediatheque, et les champs qui manquent a une base plus ancienne.
//
// Pur navigateur, sans React : admin.tsx l'appelle. Chaque appel porte
// l'en-tete X-EmDash-Request (la garde anti-CSRF du moteur) et dit son echec
// en francais, jamais un code brut.
import { CHOIX_DE_COULEUR } from "../palette.ts";
import { CHOIX_DE_POLICE } from "../typographie.ts";
import { CHAMPS_DU_DESIGN, CHOIX_DE_RAYON, CHOIX_DE_TAILLE } from "./echelles.ts";

const API = "/_emdash/api";

export class Refus extends Error {}

async function appeler<T>(chemin: string, options: { methode?: string; corps?: unknown } = {}): Promise<T> {
  const methode = options.methode ?? (options.corps === undefined ? "GET" : "POST");
  let reponse: Response;
  try {
    reponse = await fetch(`${API}${chemin}`, {
      method: methode,
      credentials: "same-origin",
      headers: { "X-EmDash-Request": "1", ...(options.corps === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(options.corps === undefined ? {} : { body: JSON.stringify(options.corps) }),
    });
  } catch {
    throw new Refus("Le back office ne répond pas. Vérifiez la connexion, puis réessayez.");
  }
  const json = (await reponse.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!reponse.ok) {
    if (reponse.status === 401 || reponse.status === 403) throw new Refus("Votre compte n'a pas le droit de faire ce réglage. Demandez-le à l'administrateur du site.");
    throw new Refus(json?.error?.message ? `Le back office a refusé : ${json.error.message}` : `Le back office a répondu ${reponse.status}. Rechargez la page.`);
  }
  return (json?.data ?? (json as unknown)) as T;
}

/** Les valeurs que la page regle : les cinq champs du design, la couleur, la police et le logo sombre (une image de la mediatheque). */
export type Valeurs = Record<string, unknown>;

/** Un champ du site tel que le manifeste le decrit. */
interface ChampDuManifeste {
  kind: string;
}

export interface Manifeste {
  i18n?: { defaultLocale?: string; locales?: string[] };
  collections: Record<string, { fields?: Record<string, ChampDuManifeste> }>;
  plugins: Record<string, { enabled?: boolean; adminPages?: { path: string }[] }>;
}

export const lireLeManifeste = (): Promise<Manifeste> => appeler<Manifeste>("/manifest");

/** Les langues du site, la langue par defaut d'abord. */
export function languesDu(m: Manifeste): string[] {
  const parDefaut = m.i18n?.defaultLocale ?? "fr";
  const toutes = m.i18n?.locales?.length ? m.i18n.locales : [parDefaut];
  return [parDefaut, ...toutes.filter((l) => l !== parDefaut)];
}

/** Les champs que la page ecrit, leur sorte et leurs choix, pour les creer sur une base qui ne les a pas encore. */
export const CHAMPS_A_CREER: { slug: string; label: string; type: "select" | "image"; options?: readonly string[] }[] = [
  { slug: "brand_color", label: "Couleur de la marque (page Design)", type: "select", options: CHOIX_DE_COULEUR },
  { slug: "font", label: "Police du site (page Design)", type: "select", options: CHOIX_DE_POLICE },
  { slug: "logo_dark", label: "Logo pour le mode sombre (page Design)", type: "image" },
  ...CHAMPS_DU_DESIGN.map((slug) => ({
    slug,
    label: { h1_size: "Taille des titres H1 (page Design)", h2_size: "Taille des titres H2 (page Design)", h3_size: "Taille des titres H3 (page Design)", text_size: "Taille du texte (page Design)", radius: "Rayon des coins (page Design)" }[slug],
    type: "select" as const,
    options: slug === "radius" ? CHOIX_DE_RAYON : CHOIX_DE_TAILLE,
  })),
];

/** Les champs que la base du site n'a pas encore. */
export function champsManquants(m: Manifeste): string[] {
  const champs = m.collections.site?.fields ?? {};
  return CHAMPS_A_CREER.map((c) => c.slug).filter((slug) => !(slug in champs));
}

/** Cree les champs qui manquent a la collection "site" (communs aux langues). Il faut le droit de gerer le schema (administrateur). */
export async function creerLesChamps(manquants: string[]): Promise<void> {
  for (const c of CHAMPS_A_CREER.filter((x) => manquants.includes(x.slug))) {
    await appeler(`/schema/collections/site/fields`, {
      corps: { slug: c.slug, label: c.label, type: c.type, translatable: false, validation: c.options ? { options: [...c.options] } : null },
    });
  }
}

export interface EntreeDuSite {
  langue: string;
  data: Valeurs;
}

/** L'entree "site" d'une langue, ou null si cette langue n'en a pas. */
export async function lireLEntree(langue: string): Promise<EntreeDuSite | null> {
  try {
    const d = await appeler<{ item?: { data?: Valeurs } }>(`/content/site/site?locale=${encodeURIComponent(langue)}`);
    return d.item ? { langue, data: d.item.data ?? {} } : null;
  } catch {
    return null;
  }
}

/** Ecrit les valeurs dans l'entree "site" d'une langue, puis la publie : en ligne en moins d'une minute, comme depuis Reglages par langue. */
export async function publierLEntree(langue: string, valeurs: Valeurs): Promise<void> {
  const l = encodeURIComponent(langue);
  await appeler(`/content/site/site?locale=${l}`, { methode: "PUT", corps: { data: valeurs } });
  await appeler(`/content/site/site/publish?locale=${l}`, { corps: {} });
}

export interface ImageDuSite {
  id: string;
  nom: string;
  url: string;
  cle: string | null;
  largeur?: number;
  hauteur?: number;
}

/** Les images de la mediatheque, les plus recentes d'abord (100 au plus). */
export async function lireLesImages(): Promise<ImageDuSite[]> {
  const d = await appeler<{ items?: Record<string, unknown>[] }>("/media?limit=100&mimeType=image%2F");
  return (d.items ?? [])
    .filter((m) => typeof m.mimeType === "string" && (m.mimeType as string).startsWith("image/"))
    .map((m) => ({
      id: String(m.id),
      nom: String(m.filename ?? m.id),
      url: String(m.url ?? (m.storageKey ? `${API}/media/file/${m.storageKey}` : "")),
      cle: typeof m.storageKey === "string" ? m.storageKey : null,
      ...(typeof m.width === "number" ? { largeur: m.width } : {}),
      ...(typeof m.height === "number" ? { hauteur: m.height } : {}),
    }))
    .filter((m) => m.url);
}

/** La valeur d'un champ image (logo sombre), dans la forme qu'EmDash ecrit et que cadre.ts relit. */
export function valeurDImage(i: ImageDuSite): Valeurs {
  return {
    id: i.id,
    src: i.cle ? `${API}/media/file/${i.cle}` : i.url,
    alt: "",
    ...(i.largeur ? { width: i.largeur } : {}),
    ...(i.hauteur ? { height: i.hauteur } : {}),
    provider: "local",
    ...(i.cle ? { meta: { storageKey: i.cle } } : {}),
  };
}

/** L'adresse d'une image deja choisie (champ image du site), ou null. */
export function adresseDe(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const m = v as { src?: unknown; meta?: { storageKey?: unknown } };
  if (typeof m.src === "string" && m.src) return m.src;
  return typeof m.meta?.storageKey === "string" ? `${API}/media/file/${m.meta.storageKey}` : null;
}

export interface LogoDesParametres {
  url: string | null;
  mediaId: string | null;
}

export async function lireLeLogo(): Promise<LogoDesParametres> {
  const d = await appeler<{ logo?: { url?: string; mediaId?: string } }>("/settings");
  return { url: d.logo?.url || null, mediaId: d.logo?.mediaId || null };
}

/** Le logo des Parametres : le meme reglage que l'ecran Parametres ; un identifiant vide le retire (le site reprend le logo du theme). */
export const ecrireLeLogo = (mediaId: string): Promise<unknown> => appeler("/settings", { corps: { logo: { mediaId } } });

/** La feuille de l'apercu, calculee par le serveur avec le code du theme. */
export const feuilleDeLApercu = (valeurs: Valeurs): Promise<{ feuille: string }> => appeler("/plugins/aloha-design/apercu", { corps: valeurs });

export interface Listes {
  couleurs: string[];
  polices: string[];
  tailles: string[];
  rayons: string[];
}

export const lireLesListes = (): Promise<Listes> => appeler("/plugins/aloha-design/listes", { corps: {} });
