/**
 * Aloha Store - connexion sans mot de passe
 *
 * Copyright (c) 2026 Aloha Pixel. All rights reserved.
 *
 * Decision projet : aucun mot de passe, jamais, ni cote acheteur ni cote administrateur.
 *
 * Le code a 6 chiffres n'est PAS stocke. Il est derive par HMAC de l'adresse et
 * d'une fenetre de temps : le serveur peut le recalculer pour le verifier, mais
 * personne ne peut le lire dans la base, et il n'y a rien a purger. Deux fenetres
 * sont acceptees a la verification (la courante et la precedente) pour qu'un code
 * demande a la 9e minute reste valable le temps de le recopier.
 *
 * La session est un cookie signe, sans table : payload lisible + signature HMAC.
 * Duree courte (24 h) parce qu'une session signee ne peut pas etre revoquee.
 */

const CODE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_MS = 24 * 60 * 60 * 1000; // 24 heures
export const SESSION_COOKIE = "aloha_session";

export type Role = "admin" | "customer";

export interface Session {
  email: string;
  role: Role;
  exp: number;
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
}

// Comparaison a temps constant : une comparaison naive fuit la position du
// premier caractere faux, ce qui suffit a deviner un code a 6 chiffres.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Normalise une adresse : la casse et les espaces ne doivent jamais creer deux comptes. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(raw.trim());
}

/* ------------------------------------------------------------------ */
/* Le code a 6 chiffres                                                */
/* ------------------------------------------------------------------ */

async function codeForWindow(secret: string, email: string, window: number): Promise<string> {
  const bytes = await hmac(secret, `code:${email}:${window}`);
  // 31 bits pour rester positif, puis 6 chiffres. Distribution assez plate
  // pour l'usage : le code vit 10 minutes et le nombre d'essais est limite.
  const n =
    (((bytes[0]! & 0x7f) << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) % 1_000_000;
  return String(n).padStart(6, "0");
}

/** Le code a envoyer maintenant. */
export async function issueCode(secret: string, email: string, now: number): Promise<string> {
  return codeForWindow(secret, email, Math.floor(now / CODE_WINDOW_MS));
}

/** Vrai si le code correspond a la fenetre courante ou a la precedente. */
export async function verifyCode(
  secret: string,
  email: string,
  code: string,
  now: number,
): Promise<boolean> {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const current = Math.floor(now / CODE_WINDOW_MS);
  for (const w of [current, current - 1]) {
    if (safeEqual(clean, await codeForWindow(secret, email, w))) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* La session                                                          */
/* ------------------------------------------------------------------ */

export async function signSession(secret: string, session: Session): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(session)));
  const sig = b64url(await hmac(secret, `session:${payload}`));
  return `${payload}.${sig}`;
}

export async function readSession(secret: string, raw: string | null): Promise<Session | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = b64url(await hmac(secret, `session:${payload}`));
  if (!safeEqual(sig, expected)) return null;
  try {
    const session = JSON.parse(b64urlDecode(payload)) as Session;
    if (!session.email || !session.role || typeof session.exp !== "number") return null;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  // SameSite=Lax : le cookie survit a un retour depuis Stripe, mais pas a une
  // requete inter-site. HttpOnly : illisible en JavaScript, donc a l'abri du XSS.
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function newSession(email: string, role: Role): Session {
  return { email, role, exp: Date.now() + SESSION_MS };
}

export const SESSION_MAX_AGE = Math.floor(SESSION_MS / 1000);

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Qui a le droit d'entrer                                             */
/* ------------------------------------------------------------------ */

/**
 * Le role se deduit de deux sources et de rien d'autre :
 *   - administrateur si l'adresse figure dans ALLOWED_EMAILS (variable, pas secret,
 *     pour qu'elle soit lisible dans le back office et modifiable sans redeploiement) ;
 *   - client si l'adresse a une commande payee en base.
 * Une adresse inconnue ne recoit jamais de code : cela evite d'en faire un
 * oracle qui revele qui est client.
 */
export function isAdmin(allowedEmails: string | undefined, email: string): boolean {
  if (!allowedEmails) return false;
  return allowedEmails
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}
