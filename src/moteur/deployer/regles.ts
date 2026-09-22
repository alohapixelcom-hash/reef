// src/moteur/deployer/regles.ts - les regles pures du bouton "Tout deployer" : la garde d'une minute, l'adresse du hook, l'heure lisible dans le fuseau du site.
//
// POURQUOI UN FICHIER A PART : ces trois regles ne touchent ni la base ni le
// reseau. Sorties ici, elles se verifient par `pnpm test` (regles.selfcheck.ts)
// sans demarrer le moteur, et le reste de l'extension ne porte plus que des
// effets.

/** Un declenchement de build par minute au plus : un double clic ne lance pas deux builds. */
export const DELAI_MS = 60_000;

/** Millisecondes a attendre avant le prochain declenchement permis ; 0 quand la voie est libre. */
export function attente(dernier: number | null, maintenant: number): number {
  if (dernier === null) return 0;
  return Math.max(0, dernier + DELAI_MS - maintenant);
}

export type Hook = { etat: "pret"; url: string } | { etat: "absent" } | { etat: "invalide" };

/**
 * Lit ALOHA_DEPLOY_HOOK. Un Deploy Hook de Cloudflare est une adresse https ;
 * tout le reste est refuse, pour qu'une faute de frappe dans le secret ne
 * parte pas en requete. `dev` ouvre http sur la machine locale seulement : c'est
 * ce qui permet de prouver le bouton contre un faux hook, sans compte Cloudflare.
 */
export function lireLeHook(brut: string | undefined, dev: boolean): Hook {
  const valeur = (brut ?? "").trim();
  if (valeur === "") return { etat: "absent" };
  let url: URL;
  try {
    url = new URL(valeur);
  } catch {
    return { etat: "invalide" };
  }
  if (url.protocol === "https:") return { etat: "pret", url: url.href };
  const locale = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (dev && url.protocol === "http:" && locale) return { etat: "pret", url: url.href };
  return { etat: "invalide" };
}

// Un Worker tourne en UTC : sans fuseau explicite, le journal afficherait deux
// heures de moins que la montre de qui a clique. Le fuseau est celui du site
// (ALOHA_BO_FUSEAU, Europe/Paris par defaut), la forme de la date celle de la
// langue du lecteur.
export const FUSEAU_PAR_DEFAUT = "Europe/Paris";

/** Lit ALOHA_BO_FUSEAU : un fuseau que la plateforme connait, sinon celui par defaut. */
export function lireLeFuseau(brut: string | undefined): string {
  const valeur = (brut ?? "").trim();
  if (valeur === "") return FUSEAU_PAR_DEFAUT;
  try {
    new Intl.DateTimeFormat("en", { timeZone: valeur });
    return valeur;
  } catch {
    return FUSEAU_PAR_DEFAUT;
  }
}

const FORMATS = new Map<string, Intl.DateTimeFormat>();

function format(langue: "fr" | "en", fuseau: string): Intl.DateTimeFormat {
  const cle = `${langue}|${fuseau}`;
  let existant = FORMATS.get(cle);
  if (!existant) {
    const locale = langue === "fr" ? "fr-FR" : "en-GB";
    existant = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium", timeZone: fuseau });
    FORMATS.set(cle, existant);
  }
  return existant;
}

/** "2026-09-21T19:45:12.000Z" -> "21 sept. 2026, 21:45:12" a Paris, en francais. Une date illisible est rendue telle quelle. */
export function heure(iso: string, langue: "fr" | "en" = "fr", fuseau: string = FUSEAU_PAR_DEFAUT): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : format(langue, fuseau).format(date);
}

/**
 * 42 300 ms -> "43 s". Une attente s'arrondit vers le haut, pour ne jamais
 * inviter a recliquer trop tot ; un temps ecoule s'arrondit vers le bas, pour
 * que "il y a 17 s" et "dans 43 s" fassent bien une minute.
 */
export function secondes(ms: number, arrondi: "haut" | "bas" = "haut"): string {
  return `${arrondi === "haut" ? Math.ceil(ms / 1000) : Math.floor(ms / 1000)} s`;
}
