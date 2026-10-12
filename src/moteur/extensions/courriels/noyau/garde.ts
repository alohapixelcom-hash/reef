// src/moteur/extensions/courriels/noyau/garde.ts - la page de refus des formulaires publics (contact, lettre) et la porte sous la forme {cle, secret}, posee sur noyau/turnstile.ts.
//
// LA PORTE ELLE-MEME vit dans noyau/turnstile.ts (controler), qui lit toutes
// les cles connues et la configuration du site. Ce module garde :
//   - la page autonome rendue quand la demande ne peut pas revenir au
//     formulaire avec un avis (une adresse ouverte a la main : 405 ; une
//     protection exigee qui n'est pas posee en ligne : 503), dans la langue du
//     visiteur, avec un lien qui ramene au formulaire ;
//   - la porte sous la forme d'une paire {cle, secret} : sans secret, en
//     ligne, elle refuse (le formulaire reste inerte et l'ecran "Courriels" dit
//     ce qui manque) ; en local, un essai passe sans joindre Cloudflare.
import type { Langue } from "./regles.ts";
import * as porte from "./turnstile.ts";

export { CHAMP_JETON, estLocal, SCRIPT_TURNSTILE, SITEVERIFY, STATUT_DU_REFUS } from "./turnstile.ts";
export type { Recuperer, Refus } from "./turnstile.ts";
import { STATUT_DU_REFUS, type Recuperer, type Refus } from "./turnstile.ts";

/** Les noms des deux valeurs dans l'environnement du Worker (d'autres noms sont lus aussi : noyau/turnstile.ts). */
export const VARIABLES_TURNSTILE = { cle: "TURNSTILE_SITE_KEY", secret: "TURNSTILE_SECRET" } as const;

export interface Protection {
  cle: string | null;
  secret: string | null;
}

const enPaire = (p: Protection): porte.Protection =>
  p.cle && p.secret ? { etat: "active", cle: p.cle, secret: p.secret } : p.cle ? { etat: "sans-secret", cle: null, secret: null } : p.secret ? { etat: "sans-cle", cle: null, secret: null } : porte.PROTECTION_ABSENTE;

/** Le formulaire peut-il s'afficher branche ? En ligne : les deux valeurs posees. En local : toujours. */
export function protectionPrete(p: Protection, url: URL): boolean {
  return porte.protectionPrete(enPaire(p), url, true);
}

/** Vrai quand siteverify accepte le jeton. */
export async function verifierLeJeton(jeton: string, secret: string, ip: string | null, recuperer: Recuperer): Promise<boolean> {
  return (await porte.verifierLeJeton(jeton, secret, ip, recuperer)).ok;
}

export interface Demande {
  methode: string;
  url: URL;
  brut: Record<string, unknown>;
  ip: string | null;
}

/** Le verdict de la porte pour une paire {cle, secret} : protection exigee, sans controle d'action. */
export async function controler(d: Demande, p: Protection, recuperer: Recuperer): Promise<Refus | null> {
  const refus = await porte.controler({ ...d, action: "" }, { protection: enPaire(p), exigee: true }, recuperer);
  if (refus) return refus;
  // Une adresse vide est refusee meme quand la protection laisse passer (essai local).
  return d.methode.toUpperCase() === "POST" && !(typeof d.brut.email === "string" && d.brut.email.trim()) ? "sans-adresse" : null;
}

/** Les phrases de la page de refus : `visiteur.refus` des catalogues. */
export interface TextesDuRefus {
  titre: string;
  raisons: Readonly<Record<Refus, string>>;
  retour: string;
}

const echapper = (v: string): string => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function pageDeRefus(t: TextesDuRefus, o: { langue: Langue; refus: Refus; lien: string }): string {
  return `<!doctype html><html lang="${o.langue}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${echapper(t.titre)}</title><style>:root{color-scheme:light dark;--fond:#faf7f2;--encre:#1d1d1f;--doux:#5f5f63;--bouton:#1d1d1f;--bouton-encre:#fff}@media (prefers-color-scheme:dark){:root{--fond:#0f1a1c;--encre:#f3f1ec;--doux:#b9b6ae;--bouton:#f3f1ec;--bouton-encre:#0f1a1c}}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:var(--fond);color:var(--encre);font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}main{width:100%;max-width:480px}h1{margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:800}p{margin:0 0 24px}a{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;background:var(--bouton);color:var(--bouton-encre);font-weight:600;text-decoration:none}a:focus-visible{outline:3px solid var(--doux);outline-offset:3px}</style></head><body><main><h1>${echapper(t.titre)}</h1><p>${echapper(t.raisons[o.refus])}</p><a href="${echapper(o.lien)}">${echapper(t.retour)}</a></main></body></html>`;
}

export function reponseDuRefus(t: TextesDuRefus, o: { langue: Langue; refus: Refus; lien: string }): Response {
  const statut = STATUT_DU_REFUS[o.refus];
  const entetes: Record<string, string> = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };
  if (statut === 405) entetes.Allow = "POST";
  return new Response(pageDeRefus(t, o), { status: statut, headers: entetes });
}
