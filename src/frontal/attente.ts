// src/frontal/attente.ts - la page d'attente du mode maintenance composee par le frontal depuis les reglages de l'ecran "Maintenance" : titre, sous-titre, photo ou video de fond, date de retour.
//
// PUR : aucune lecture de la base ici (maintenance.ts lit, ce fichier compose),
// le self-check la compose sans Worker. La page est complete et autonome :
// aucune feuille du site, aucun script, rien a charger que la photo ou la
// video choisie dans la mediatheque (servie par /_emdash/api/media/file/,
// une adresse qui passe toujours, site ferme).
//
// CE QUE LA PAGE TIENT : `noindex` dans le head (le frontal ajoute
// X-Robots-Tag et le statut 503), un seul h1, le texte saisi echappe, la
// video muette, en boucle et sans son, jamais montree a qui a demande moins
// de mouvement (elle laisse alors le fond uni).

/** Ce que l'ecran "Maintenance" enregistre, deja relu et borne par maintenance.ts. */
export interface ReglagesDeLAttente {
  titre: string;
  sousTitre: string;
  /** Le fond choisi dans la mediatheque, resolu en adresse publique ; null : fond uni. */
  fond: { sorte: "image" | "video"; adresse: string; type: string } | null;
  /** La date de retour annoncee, "AAAA-MM-JJ", ou null. */
  retour: string | null;
}

export type LangueDeLAttente = "fr" | "en";

const PHRASES: Record<LangueDeLAttente, { retour: (date: string) => string; locale: string }> = {
  fr: { retour: (date) => `Retour prévu le ${date}.`, locale: "fr-FR" },
  en: { retour: (date) => `We expect to be back on ${date}.`, locale: "en-GB" },
};

/** Echappe un texte pour le HTML (contenu et attributs entre guillemets doubles). */
export function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** La date de retour en toutes lettres ("20 octobre 2026"), ou null si elle est illisible. */
export function dateEnLettres(retour: string | null, langue: LangueDeLAttente): string | null {
  if (!retour || !/^\d{4}-\d{2}-\d{2}$/.test(retour)) return null;
  const instant = Date.parse(`${retour}T12:00:00Z`);
  if (Number.isNaN(instant)) return null;
  return new Intl.DateTimeFormat(PHRASES[langue].locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(instant));
}

const FEUILLE = [
  "*{box-sizing:border-box}",
  "html,body{margin:0;height:100%}",
  "body{min-height:100vh;display:grid;place-items:center;background:#0f1f1d;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px}",
  ".fond{position:fixed;inset:0;z-index:0}",
  ".fond img,.fond video{width:100%;height:100%;object-fit:cover;display:block}",
  ".voile{position:fixed;inset:0;z-index:1;background:rgba(8,20,19,.58)}",
  "main{position:relative;z-index:2;max-width:42rem}",
  "h1{margin:0 0 .5em;font-size:clamp(2rem,6vw,3.75rem);line-height:1.05;font-weight:800;letter-spacing:-.02em}",
  "p{margin:0 auto;font-size:clamp(1.05rem,2.4vw,1.3rem);line-height:1.55;max-width:36rem}",
  ".retour{margin-top:1.5em;font-weight:600}",
  "@media (prefers-reduced-motion:reduce){.fond video{display:none}}",
].join("");

/** La page d'attente complete, prete a partir en 503. */
export function composerLAttente(r: ReglagesDeLAttente, langue: LangueDeLAttente = "fr"): string {
  const titre = echapper(r.titre);
  const date = dateEnLettres(r.retour, langue);
  let fond = "";
  if (r.fond?.sorte === "image") fond = `<div class="fond" aria-hidden="true"><img src="${echapper(r.fond.adresse)}" alt=""></div><div class="voile" aria-hidden="true"></div>`;
  if (r.fond?.sorte === "video")
    fond = `<div class="fond" aria-hidden="true"><video autoplay muted loop playsinline preload="auto"><source src="${echapper(r.fond.adresse)}" type="${echapper(r.fond.type)}"></video></div><div class="voile" aria-hidden="true"></div>`;
  return [
    `<!doctype html><html lang="${langue}"><head><meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">`,
    `<title>${titre}</title><style>${FEUILLE}</style></head><body>`,
    fond,
    `<main><h1>${titre}</h1>`,
    r.sousTitre ? `<p>${echapper(r.sousTitre).replace(/\n/g, "<br>")}</p>` : "",
    date ? `<p class="retour">${echapper(PHRASES[langue].retour(date))}</p>` : "",
    `</main></body></html>`,
  ].join("");
}
