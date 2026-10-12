// src/moteur/extensions/courriels/noyau/turnstile.ts - Cloudflare Turnstile sur les formulaires publics (contact, lettre) : la paire de cles lue dans le Worker ou la configuration du site, le jeton verifie par siteverify, la porte qui decide avant toute ecriture.
//
// FICHIER PUR : ni Astro, ni EmDash, ni plateforme. L'environnement du Worker
// et `fetch` sont passes en parametre ; courriels.selfcheck.ts et
// turnstile.selfcheck.ts rejouent chaque cas sans Worker.
//
// LA PAIRE : une cle publique et une cle secrete, du MEME widget, dans le
// compte Cloudflare du client. Plusieurs noms sont reconnus, parce que les
// sites ont ete branches a des moments differents :
//   cle publique  PUBLIC_TURNSTILE_SITE_KEY ou TURNSTILE_SITE_KEY (variable du
//                 Worker du moteur), sinon le champ `turnstile` de
//                 configuration.ts (fichier du site) ;
//   cle secrete   TURNSTILE_SECRET ou TURNSTILE_SECRET_KEY (secret du Worker,
//                 `wrangler secret put`), jamais dans un fichier.
//
// LA REGLE :
//   - les deux posees : protection active, tout envoi sans jeton valide est
//     refuse avant toute ecriture et tout envoi ;
//   - aucune des deux : rien ne change (formulaire comme avant), sauf si le
//     site exige la protection (`turnstileObligatoire` de configuration.ts) :
//     alors, en ligne, le formulaire reste inerte et la route refuse ;
//   - une seule des deux : la porte se ferme (un widget sans verification ne
//     protege rien, une verification sans widget refuserait tout le monde) ;
//     le formulaire reste inerte et l'ecran "Reglages des courriels" dit ce
//     qui manque.
// Sur la machine locale (localhost, 127.0.0.1, ::1, *.localhost), un essai
// passe sans joindre Cloudflare quand le secret manque.
//
// CE QUI EST VERIFIE : success, l'action signee par le widget (un jeton du
// formulaire de la lettre ne vaut pas pour le contact ; un widget sans action
// n'en signe pas), et le nom d'hote quand le site en declare
// (`turnstileHotes` de configuration.ts : un jeton obtenu sur un autre site ne
// vaut rien ici). Un jeton absent, trop long, refuse, ou siteverify
// injoignable : refus (400). La porte ne s'ouvre jamais par defaut.

/** Le champ que le widget pose dans le formulaire. */
export const CHAMP_TURNSTILE = "cf-turnstile-response";
export const CHAMP_JETON = CHAMP_TURNSTILE;
export const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const ADRESSE_SITEVERIFY = SITEVERIFY;
/** Le script du widget en rendu implicite (Turnstile.astro). */
export const SCRIPT_TURNSTILE = "https://challenges.cloudflare.com/turnstile/v0/api.js";
/** Le script en rendu explicite (Verification.astro) : la page choisit la langue et le theme au moment du rendu. */
export const ADRESSE_DU_SCRIPT = `${SCRIPT_TURNSTILE}?render=explicit&onload=alohaVerification`;

/** Les noms reconnus dans l'environnement du Worker, dans l'ordre de lecture. */
export const VARIABLES_CLE = ["PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SITE_KEY"] as const;
export const VARIABLES_SECRET = ["TURNSTILE_SECRET", "TURNSTILE_SECRET_KEY"] as const;
export const VARIABLE_CLE = VARIABLES_CLE[0];
export const VARIABLE_SECRET = VARIABLES_SECRET[0];
export const VARIABLE_CLE_PUBLIQUE = VARIABLES_CLE[1];
export const VARIABLE_CLE_SECRETE = VARIABLES_SECRET[1];

/** Un jeton Turnstile fait au plus 2 048 signes (documentation de siteverify). */
const LONGUEUR_JETON = 2048;
/** Au-dela, le visiteur attend trop : refus, il recommencera. */
const DELAI_MS = 8000;

export type EtatDeLaProtection = "active" | "absente" | "sans-secret" | "sans-cle";

export interface Protection {
  etat: EtatDeLaProtection;
  /** La cle publique, montree dans la page ; null quand la protection n'est pas active. */
  cle: string | null;
  /** La cle secrete, lue a l'execution, jamais rendue ni journalisee. */
  secret: string | null;
}

export const PROTECTION_ABSENTE: Protection = { etat: "absente", cle: null, secret: null };

/** Ce que configuration.ts du site peut dire de Turnstile (champs facultatifs). */
export interface ConfigurationTurnstile {
  turnstile?: unknown;
  turnstileHotes?: unknown;
  turnstileObligatoire?: unknown;
}

const valeur = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const premiere = (env: Record<string, unknown> | null | undefined, noms: readonly string[]): string | null => {
  for (const nom of noms) {
    const v = valeur(env?.[nom]);
    if (v) return v;
  }
  return null;
};

/** La protection d'apres l'environnement du Worker et la configuration du site. */
export function protectionDe(env: Record<string, unknown> | null | undefined, configuration: ConfigurationTurnstile = {}): Protection {
  const cle = premiere(env, VARIABLES_CLE) ?? valeur(configuration.turnstile);
  const secret = premiere(env, VARIABLES_SECRET);
  if (cle && secret) return { etat: "active", cle, secret };
  if (!cle && !secret) return PROTECTION_ABSENTE;
  return { etat: cle ? "sans-secret" : "sans-cle", cle: null, secret: null };
}

/** La cle et le secret quand les deux sont poses ; null sinon. */
export function reglageTurnstile(env: Record<string, unknown> | null | undefined, configuration: ConfigurationTurnstile = {}): { cle: string; secret: string } | null {
  const p = protectionDe(env, configuration);
  return p.cle && p.secret ? { cle: p.cle, secret: p.secret } : null;
}

/** Les noms d'hote declares par le site ; vide : le nom d'hote n'est pas controle. */
export function hotesDe(configuration: ConfigurationTurnstile): string[] {
  const h = configuration.turnstileHotes;
  return Array.isArray(h) ? h.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : [];
}

export const obligatoire = (configuration: ConfigurationTurnstile): boolean => configuration.turnstileObligatoire === true;

export function estLocal(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || h.endsWith(".localhost");
}

/** Le formulaire peut-il s'afficher branche ? Protection active, ou absente et non exigee, ou essai local. */
export function protectionPrete(p: Protection, url: URL, exigee = false): boolean {
  if (p.etat === "active" || estLocal(url)) return true;
  return p.etat === "absente" && !exigee;
}

/** Un nom d'hote admis : exact, ou sous-domaine (les apercus de Pages, le www). */
export function hoteAdmis(hote: string, hotes: readonly string[]): boolean {
  const h = hote.toLowerCase();
  return hotes.some((admis) => h === admis.toLowerCase() || h.endsWith(`.${admis.toLowerCase()}`));
}

/** Ce que la reponse de Cloudflare doit porter, en plus de success. Vide : pas de controle. */
export interface Attendu {
  actions?: readonly string[];
  hotes?: readonly string[];
}

export type Verdict = { ok: true } | { ok: false; raison: "sans-jeton" | "refuse" | "injoignable"; codes: string[] };

export type Recuperer = (url: string, init: { method: "POST"; body: URLSearchParams; signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/**
 * Verifie un jeton aupres de Cloudflare. Ne leve jamais. Un jeton absent ne
 * coute aucun appel. Cloudflare injoignable : refus, jamais laisse passer.
 */
export async function verifierLeJeton(jeton: unknown, secret: string, ip: string | null, recuperer: Recuperer, attendu: Attendu = {}): Promise<Verdict> {
  if (typeof jeton !== "string" || !jeton.trim() || jeton.length > LONGUEUR_JETON) return { ok: false, raison: "sans-jeton", codes: [] };
  const corps = new URLSearchParams({ secret, response: jeton.trim() });
  if (ip) corps.set("remoteip", ip);
  try {
    const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(DELAI_MS) : undefined;
    const reponse = await recuperer(SITEVERIFY, { method: "POST", body: corps, ...(signal ? { signal } : {}) });
    const lu = ((await reponse.json().catch(() => null)) ?? {}) as { success?: unknown; action?: unknown; hostname?: unknown; "error-codes"?: unknown };
    const codes = Array.isArray(lu["error-codes"]) ? lu["error-codes"].filter((c): c is string => typeof c === "string").slice(0, 5) : [];
    if (!reponse.ok || lu.success !== true) return { ok: false, raison: "refuse", codes };
    // Un widget qui signe une action ne vaut que pour elle.
    if (attendu.actions?.length && typeof lu.action === "string" && lu.action && !attendu.actions.includes(lu.action)) return { ok: false, raison: "refuse", codes: ["action"] };
    if (attendu.hotes?.length && !(typeof lu.hostname === "string" && hoteAdmis(lu.hostname, attendu.hotes))) return { ok: false, raison: "refuse", codes: ["hostname"] };
    return { ok: true };
  } catch {
    return { ok: false, raison: "injoignable", codes: [] };
  }
}

/** La meme verification, rendue en oui ou non. */
export async function verifierTurnstile(jeton: unknown, secret: string, ip: string | null, attendu: Attendu = {}, recuperer: Recuperer = (u, i) => fetch(u, i)): Promise<boolean> {
  return (await verifierLeJeton(jeton, secret, ip, recuperer, attendu)).ok;
}

export type Refus = "methode" | "indisponible" | "sans-jeton" | "sans-adresse" | "jeton-refuse";

export const STATUT_DU_REFUS: Readonly<Record<Refus, number>> = { methode: 405, indisponible: 503, "sans-jeton": 400, "sans-adresse": 400, "jeton-refuse": 400 };

export interface Demande {
  methode: string;
  url: URL;
  /** Les champs du formulaire, deja lus (chaines seulement). */
  brut: Record<string, unknown>;
  /** CF-Connecting-IP : l'adresse du visiteur vue par Cloudflare. */
  ip: string | null;
  /** L'action que le widget de ce formulaire signe ("contact" ou "lettre"). */
  action: string;
}

export interface Regle {
  protection: Protection;
  hotes?: readonly string[];
  exigee?: boolean;
}

/**
 * Le verdict de la porte : null, la demande passe ; sinon la raison du refus.
 * L'ordre coute le moins possible : rien ne part vers siteverify tant que la
 * methode, le jeton et l'adresse ne sont pas la (un jeton ne sert qu'une fois).
 */
export async function controler(d: Demande, r: Regle, recuperer: Recuperer): Promise<Refus | null> {
  if (d.methode.toUpperCase() !== "POST") return "methode";
  const p = r.protection;
  const local = estLocal(d.url);
  if (p.etat !== "active") {
    if (local || (p.etat === "absente" && !r.exigee)) return null;
    return "indisponible";
  }
  const jeton = typeof d.brut[CHAMP_JETON] === "string" ? (d.brut[CHAMP_JETON] as string).trim() : "";
  if (!jeton) return "sans-jeton";
  if (!(typeof d.brut.email === "string" && d.brut.email.trim())) return "sans-adresse";
  const verdict = await verifierLeJeton(jeton, p.secret!, d.ip, recuperer, { actions: d.action ? [d.action] : [], hotes: r.hotes ?? [] });
  if (verdict.ok) return null;
  console.warn("Courriels : verification Turnstile refusee", verdict.raison, verdict.codes.join(","));
  return "jeton-refuse";
}
