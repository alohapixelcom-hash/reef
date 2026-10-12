// src/moteur/seo/fichiers.ts - robots.txt et llms.txt saisis dans le back office : validation, lecture, enregistrement, et la reponse que le Worker sert.
//
// UNE SEULE SOURCE PAR FICHIER.
//   robots.txt : la cle robotsTxt du reglage "site:seo" d'EmDash, celle que
//                l'ecran Parametres > SEO edite deja. L'ecran SEO de la
//                maison lit et ecrit la meme valeur : les deux ecrans disent
//                toujours la meme chose.
//   llms.txt   : la ligne "llms" de aloha_seo (EmDash n'a rien pour lui).
// Sans texte saisi, le Worker sert le texte par defaut du site : le fichier
// que son build a ecrit (src/pages/robots.txt.ts, llms.txt.ts), lu dans les
// fichiers publics. L'en-tete x-aloha-seo dit lequel est parti (base ou
// defaut), pour diagnostiquer d'un curl -I.
import { type Base, ecrireLigne, ecrireRobots, effacerLigne, empreinte, lireLigne, lireRobots } from "./base.ts";

export type NomDeFichier = "robots" | "llms";
export const FICHIERS: readonly NomDeFichier[] = ["robots", "llms"];
export const CHEMINS: Record<NomDeFichier, string> = { robots: "/robots.txt", llms: "/llms.txt" };

/**
 * Plafonds de longueur. llms.txt : lisible d'un trait par un agent (regle
 * d'un grand site de la maison). robots.txt : 5 000, le plafond que le schema d'EmDash 0.38
 * pose sur seo.robotsTxt (entry-lock, z.string().max(5e3)). Au-dela, l'ecran
 * Parametres > SEO refuserait ensuite d'enregistrer tous les reglages SEO.
 */
export const LONGUEUR_MAX: Record<NomDeFichier, number> = { robots: 5_000, llms: 64_000 };

/** Tout caractere de controle sauf la tabulation et le saut de ligne (le retour chariot est normalise avant). */
const CONTROLE = /[\u0000-\u0008\u000B-\u001F\u007F]/;

export class TexteRefuse extends Error {}

/** Retours a la ligne unifies, espaces de fin de ligne retires, un seul saut de ligne final. */
export function normaliserTexte(texte: string): string {
  return `${texte
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .trim()}\n`;
}

/**
 * Le texte tel qu'il sera enregistre, ou TexteRefuse avec la raison en
 * francais. robots.txt recoit sa ligne Sitemap: absolue vers l'index quand
 * il n'en a aucune : un robots.txt saisi a la main ne doit pas perdre le plan.
 */
export function valider(nom: NomDeFichier, brut: unknown, origine: string | URL): string {
  if (typeof brut !== "string") throw new TexteRefuse("Le texte est vide.");
  const texte = normaliserTexte(brut);
  if (texte.trim() === "") throw new TexteRefuse("Le texte est vide : utilisez « Revenir au texte par défaut » pour servir celui du site.");
  if (CONTROLE.test(texte)) throw new TexteRefuse("Le texte contient un caractère invisible qui n'a rien à faire dans ce fichier (caractère de contrôle). Recopiez-le depuis un éditeur de texte simple.");
  if (nom === "llms" && !/^# \S/.test(texte)) throw new TexteRefuse("llms.txt commence par le titre du site, sur la première ligne, précédé de « # » et d'une espace (par exemple « # Aloha Pixel »).");
  const complet = nom === "robots" ? avecLePlan(texte, origine) : texte;
  const max = LONGUEUR_MAX[nom];
  if (complet.length > max) throw new TexteRefuse(`${CHEMINS[nom].slice(1)} dépasse ${max.toLocaleString("fr-FR")} caractères (${complet.length.toLocaleString("fr-FR")}${nom === "robots" ? ", ligne Sitemap comprise" : ""}) : raccourcissez-le.`);
  return complet;
}

/** robots.txt avec sa ligne Sitemap: absolue vers l'index, ajoutee seulement s'il n'en a aucune. */
export function avecLePlan(texte: string, origine: string | URL): string {
  if (/^\s*sitemap\s*:/im.test(texte)) return texte;
  return `${texte.trimEnd()}\n\nSitemap: ${new URL("/sitemap-index.xml", origine).href}\n`;
}

export interface EtatDuFichier {
  nom: NomDeFichier;
  /** Le texte saisi dans le back office, ou null : le site sert son texte par defaut. */
  texte: string | null;
  /** Derniere modification faite depuis l'ecran SEO (millisecondes), et par qui. */
  maj: number | null;
  par: string | null;
  /** robots.txt seulement : vrai quand le texte a change depuis l'ecran Parametres > SEO d'EmDash apres le dernier enregistrement d'ici. */
  modifieAilleurs: boolean;
}

export async function lireLeFichier(base: Base, nom: NomDeFichier): Promise<EtatDuFichier> {
  const ligne = await lireLigne(base, nom);
  if (nom === "llms") return { nom, texte: ligne?.contenu ?? null, maj: ligne?.maj ?? null, par: ligne?.maj_par ?? null, modifieAilleurs: false };
  const texte = await lireRobots(base);
  const trace = ligne?.empreinte ?? null;
  const actuelle = texte === null ? null : empreinte(texte);
  return { nom, texte, maj: ligne?.maj ?? null, par: ligne?.maj_par ?? null, modifieAilleurs: trace !== actuelle && !(ligne === null && texte === null) };
}

/** Enregistre un texte deja valide. Rend "conflit" si robots.txt a ete enregistre ailleurs entre la lecture et l'ecriture. */
export async function enregistrer(base: Base, nom: NomDeFichier, texte: string, qui: string, maintenant = Date.now()): Promise<"ecrit" | "conflit" | "illisible"> {
  if (nom === "llms") {
    await ecrireLigne(base, { nom, contenu: texte, empreinte: empreinte(texte), maj: maintenant, maj_par: qui });
    return "ecrit";
  }
  const issue = await ecrireRobots(base, texte);
  if (issue === "ecrit") await ecrireLigne(base, { nom, contenu: null, empreinte: empreinte(texte), maj: maintenant, maj_par: qui });
  return issue;
}

/** Revient au texte par defaut du site : le texte saisi est efface, la trace dit qui l'a fait. */
export async function revenirAuDefaut(base: Base, nom: NomDeFichier, qui: string, maintenant = Date.now()): Promise<"ecrit" | "conflit" | "illisible"> {
  if (nom === "llms") {
    await effacerLigne(base, nom);
    return "ecrit";
  }
  const issue = await ecrireRobots(base, null);
  if (issue === "ecrit") await ecrireLigne(base, { nom, contenu: null, empreinte: null, maj: maintenant, maj_par: qui });
  return issue;
}

/** Les fichiers publics du build (liaison ASSETS), reduits a ce qui est appele. */
export interface Fichiers {
  fetch(requete: Request): Promise<Response>;
}

/** Le texte par defaut du site : le fichier que son build a ecrit, ou null. */
export async function texteParDefaut(fichiers: Fichiers | null | undefined, nom: NomDeFichier, origine: string | URL): Promise<string | null> {
  if (!fichiers) return null;
  try {
    const r = await fichiers.fetch(new Request(new URL(CHEMINS[nom], origine).href, { method: "GET" }));
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

const enTetes = (source: "base" | "defaut"): Record<string, string> => ({
  "content-type": "text/plain; charset=utf-8",
  // Cinq minutes : un enregistrement se voit vite, et un robot qui relit le fichier ne reveille pas la base a chaque fois.
  "cache-control": "public, max-age=300",
  "x-aloha-seo": source,
});

/**
 * La reponse a /robots.txt ou /llms.txt : le texte de la base, sinon le
 * texte par defaut du site. Base muette (panne, liaison absente) : le texte
 * par defaut, jamais une erreur pour un robot.
 */
export async function servirLeFichier(request: Request, nom: NomDeFichier, base: Base | null, fichiers: Fichiers | null | undefined, rendu?: Fichiers | null): Promise<Response> {
  const url = new URL(request.url);
  const tete = request.method === "HEAD";
  let texte: string | null = null;
  if (base) {
    try {
      texte = nom === "llms" ? ((await lireLigne(base, "llms"))?.contenu ?? null) : await lireRobots(base);
    } catch {
      texte = null;
    }
  }
  if (texte !== null) {
    const corps = nom === "robots" ? avecLePlan(texte, url.origin) : texte;
    return new Response(tete ? null : corps, { status: 200, headers: enTetes("base") });
  }
  // Le texte par defaut : le fichier fige par le build, sinon la route du
  // site rendue a la demande (llms.txt d'alohapixel.com se rend a chaque
  // requete pour lister les articles publies).
  for (const source of [fichiers, rendu]) {
    if (!source) continue;
    try {
      const r = await source.fetch(new Request(new URL(CHEMINS[nom], url.origin).href, { method: "GET", headers: request.headers }));
      if (r.ok) return new Response(tete ? null : await r.text(), { status: 200, headers: enTetes("defaut") });
    } catch {
      // Cette source ne repond pas : la suivante, puis le texte minimal ci-dessous.
    }
  }
  // Ni base ni fichier : robots.txt minimal qui laisse tout lire et annonce le plan ; llms.txt n'existe pas.
  if (nom === "robots") return new Response(tete ? null : avecLePlan("User-agent: *\nAllow: /\n", url.origin), { status: 200, headers: enTetes("defaut") });
  return new Response(tete ? null : "Not found\n", { status: 404, headers: { ...enTetes("defaut"), "cache-control": "no-store" } });
}

/** Ce que le site regle pour l'ecran SEO (src/moteur/seo/site.ts, export SEO). */
export interface ReglagesDuSeo {
  /** Le nom de la liaison D1 du Worker ("DB" par defaut). */
  liaison?: string;
  /** L'origine publique, quand le back office ne repond pas sous elle. */
  origine?: string;
  /** Le texte par defaut d'un fichier, quand les fichiers publics de ce Worker ne le portent pas (fichier rendu a la demande, back office separe du site) ; null : les fichiers publics. */
  texteParDefaut?: (nom: NomDeFichier) => Promise<string | null>;
}
