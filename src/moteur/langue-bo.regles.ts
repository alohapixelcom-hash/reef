// src/moteur/langue-bo.regles.ts - les regles pures de la langue du back office : la langue par defaut posee dans le Worker, le cookie du moteur, et le choix entre les deux dictionnaires du site.
//
// CE QUE FAIT LE MOTEUR TOUT SEUL. L'administration d'EmDash est traduite (28
// langues, dont le francais) et choisit sa langue a chaque requete : le cookie
// `emdash-locale` (le choix de la personne, pose par le selecteur de langue de
// ses reglages), sinon l'entete Accept-Language du navigateur, sinon
// l'anglais.
//
// CE QU'AJOUTE LE SITE. Une langue PAR DEFAUT pour le site, le francais sauf
// si ALOHA_BO_LANGUE dit autre chose (voir moteur.config.mjs et langue-bo.ts) :
// elle passe devant le navigateur, jamais devant le choix de la personne. Les
// textes que le theme ajoute au back office (la page "Tout deployer", la carte
// du tableau de bord) suivent la meme langue, avec deux dictionnaires :
// francais, et anglais pour tout le reste. Ce que le moteur laisse en anglais
// dans son propre catalogue est complete ailleurs, par catalogue-bo.ts.
//
// OU POSER LA LANGUE PAR DEFAUT : DANS LE WORKER. langueDuBackOffice, plus
// bas, vient d'alohapixel.com (et Koa et Nalu faisaient la meme chose dans
// leur worker.moteur.ts) : la requete de la page du back office entre dans
// Astro avec la langue du site pour Accept-Language, sans rien ecrire dans le
// navigateur. alohapixel.com a mesure que la reecriture
// de la requete DANS un middleware Astro (ce que fait encore langue-bo.ts)
// faisait echouer sous workerd les pages du back office arrivees a plusieurs
// ("Cannot perform I/O on behalf of a different request"). langue-bo.ts reste
// le temps que chaque site appelle langueDuBackOffice depuis son Worker.

/** Le cookie que pose et que lit l'administration d'EmDash. */
export const COOKIE_DE_LANGUE = "emdash-locale";

/** Les deux dictionnaires que le site ecrit pour le back office. */
export type LangueDesTextes = "fr" | "en";

/** "fr", "pt-BR", "zh-CN" : la forme d'un code de langue. Le moteur verifie lui-meme qu'il le connait. */
const CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

/** Lit ALOHA_BO_LANGUE. Une valeur vide ou mal formee vaut "pas de langue par defaut". */
export function langueParDefaut(brut: string | undefined): string | null {
  const valeur = (brut ?? "").trim();
  return CODE.test(valeur) ? valeur : null;
}

/** La valeur du cookie de langue, ou null. */
export function cookieDeLangue(entete: string | null): string | null {
  for (const morceau of (entete ?? "").split(";")) {
    const [cle, ...reste] = morceau.trim().split("=");
    if (cle === COOKIE_DE_LANGUE) return reste.join("=").trim() || null;
  }
  return null;
}

/** L'entete Cookie de la requete, avec la langue par defaut ajoutee. */
export function avecLeCookie(entete: string | null, langue: string): string {
  const pose = `${COOKIE_DE_LANGUE}=${langue}`;
  return entete ? `${entete}; ${pose}` : pose;
}

/** Le Set-Cookie, ecrit comme le selecteur de langue du moteur l'ecrit : meme nom, meme chemin, meme duree. */
export function poserLeCookie(langue: string, https: boolean): string {
  return `${COOKIE_DE_LANGUE}=${langue}; Path=/_emdash; SameSite=Lax; Max-Age=31536000${https ? "; Secure" : ""}`;
}

/** La premiere langue d'Accept-Language, par poids decroissant. */
function premiereLangue(entete: string | null): string | null {
  const classees = (entete ?? "")
    .split(",")
    .map((morceau) => {
      const [code = "", ...params] = morceau.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { code: code.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((entree) => entree.code !== "" && entree.code !== "*" && entree.q > 0)
    .sort((a, b) => b.q - a.q);
  return classees[0]?.code ?? null;
}

/**
 * Le dictionnaire du theme pour cette requete, dans le meme ordre que le
 * moteur : le choix de la personne, la langue par defaut du site, le
 * navigateur. Tout ce qui n'est pas du francais lit l'anglais.
 */
export function langueDesTextes(requete: Request, parDefaut: string | null): LangueDesTextes {
  const choisie =
    cookieDeLangue(requete.headers.get("cookie")) ?? parDefaut ?? premiereLangue(requete.headers.get("accept-language"));
  return choisie?.toLowerCase().split("-")[0] === "fr" ? "fr" : "en";
}

/** Vrai des que la personne a deja choisi une langue, quelle qu'elle soit : le cookie que pose le selecteur du back office. */
const LANGUE_DEJA_CHOISIE = /(?:^|;\s*)emdash-locale=/;

/** Le prefixe des pages du back office ; l'API du moteur ne rend aucune interface et n'est pas touchee. */
const BACK_OFFICE = "/_emdash/admin";

/**
 * La requete telle que le moteur doit la lire, a appeler dans le Worker AVANT
 * Astro : la meme, sauf que la page du back office demandee sans cookie de
 * langue annonce la langue par defaut du site. Toute autre requete sort telle
 * quelle, sans copie.
 */
export function langueDuBackOffice(request: Request, langue: string | null): Request {
  if (langue === null || request.method !== "GET") return request;
  if (!new URL(request.url).pathname.startsWith(BACK_OFFICE)) return request;
  if (LANGUE_DEJA_CHOISIE.test(request.headers.get("cookie") ?? "")) return request;
  const entetes = new Headers(request.headers);
  entetes.set("accept-language", langue);
  return new Request(request, { headers: entetes });
}
