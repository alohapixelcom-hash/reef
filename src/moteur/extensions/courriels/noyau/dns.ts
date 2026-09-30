// src/moteur/extensions/courriels/noyau/dns.ts - les enregistrements DNS qu'attend Cloudflare Email Sending, et leur verification par une requete DNS sur HTTPS.
//
// CE QUI EST ATTENDU (documentation Cloudflare, email-service/configuration/
// domains, relue) : inscrire un domaine a Email Sending
// pose quatre enregistrements, tous sur le sous-domaine cf-bounce sauf DMARC :
//   MX   cf-bounce.<domaine>              route1, route2, route3.mx.cloudflare.net
//   TXT  cf-bounce.<domaine>              v=spf1 include:_spf.mx.cloudflare.net ~all
//   TXT  cf-bounce._domainkey.<domaine>   v=DKIM1; ... p=<cle publique fournie par Cloudflare>
//   TXT  _dmarc.<domaine>                 v=DMARC1; p=...
// Un nom ne porte qu'UN enregistrement SPF et le domaine qu'UN DMARC : deux
// enregistrements se contredisent, et les messageries retiennent le pire.
//
// COMMENT ON VERIFIE : une question par enregistrement a cloudflare-dns.com,
// au format JSON (application/dns-json), avec un delai court. La lecture de la
// reponse est pure (analyser) et verifiee par `pnpm test` ; l'appel reseau est
// isole dans `interroger`, qui recoit `fetch` en parametre.

export type CleDns = "mx" | "spf" | "dkim" | "dmarc";
export type EtatDns = "ok" | "absent" | "faux" | "double" | "injoignable";

export interface Attendu {
  cle: CleDns;
  nom: string;
  type: "MX" | "TXT";
  /** La valeur a poser, telle que Cloudflare la pose. */
  valeur: string;
}

export interface Verdict {
  cle: CleDns;
  etat: EtatDns;
  /** Ce qui a ete lu, en clair, pour que l'ecran le montre. */
  lu: string[];
}

export const SERVEUR_DOH = "https://cloudflare-dns.com/dns-query";
const DELAI_MS = 5000;

export function attendus(domaine: string): Attendu[] {
  return [
    { cle: "mx", nom: `cf-bounce.${domaine}`, type: "MX", valeur: "route1.mx.cloudflare.net, route2.mx.cloudflare.net, route3.mx.cloudflare.net" },
    { cle: "spf", nom: `cf-bounce.${domaine}`, type: "TXT", valeur: "v=spf1 include:_spf.mx.cloudflare.net ~all" },
    { cle: "dkim", nom: `cf-bounce._domainkey.${domaine}`, type: "TXT", valeur: "v=DKIM1; h=sha256; k=rsa; p=(cle fournie par Cloudflare)" },
    { cle: "dmarc", nom: `_dmarc.${domaine}`, type: "TXT", valeur: "v=DMARC1; p=reject;" },
  ];
}

/** Une reponse DoH au format JSON, reduite a ce qu'on lit. */
export interface ReponseDoh {
  Status?: number;
  Answer?: { type?: number; data?: string }[];
}

const TYPE_NUMERO = { MX: 15, TXT: 16 } as const;

/**
 * Les valeurs d'une reponse. Un TXT arrive entre guillemets et parfois coupe en
 * morceaux de 255 caracteres ("v=DKIM1; ..." "suite") : on les recolle. Un MX
 * arrive precede de sa priorite ("10 route1.mx.cloudflare.net.") : on la retire.
 */
export function valeursDe(reponse: ReponseDoh, type: "MX" | "TXT"): string[] {
  if (!reponse || reponse.Status !== 0 || !Array.isArray(reponse.Answer)) return [];
  return reponse.Answer.filter((r) => r.type === TYPE_NUMERO[type] && typeof r.data === "string").map((r) => {
    const data = String(r.data).trim();
    if (type === "MX") return data.replace(/^\d+\s+/, "").replace(/\.$/, "").toLowerCase();
    const morceaux = data.match(/"((?:[^"\\]|\\.)*)"/g);
    return morceaux ? morceaux.map((m) => m.slice(1, -1).replace(/\\(.)/g, "$1")).join("") : data;
  });
}

/** Le verdict d'un enregistrement, a partir des valeurs lues sur son nom. */
export function analyser(cle: CleDns, valeurs: string[]): Verdict {
  const commence = (prefixe: string) => valeurs.filter((v) => v.toLowerCase().startsWith(prefixe));
  switch (cle) {
    case "mx": {
      if (valeurs.length === 0) return { cle, etat: "absent", lu: [] };
      const ok = valeurs.some((v) => v.endsWith(".mx.cloudflare.net"));
      return { cle, etat: ok ? "ok" : "faux", lu: valeurs };
    }
    case "spf": {
      const spf = commence("v=spf1");
      if (spf.length === 0) return { cle, etat: "absent", lu: [] };
      if (spf.length > 1) return { cle, etat: "double", lu: spf };
      return { cle, etat: spf[0]!.includes("include:_spf.mx.cloudflare.net") ? "ok" : "faux", lu: spf };
    }
    case "dkim": {
      const dkim = commence("v=dkim1");
      if (dkim.length === 0) return { cle, etat: "absent", lu: [] };
      return { cle, etat: dkim.some((v) => /(?:^|;)\s*p=[A-Za-z0-9+/=]{16,}/.test(v)) ? "ok" : "faux", lu: dkim.map(abreger) };
    }
    case "dmarc": {
      const dmarc = commence("v=dmarc1");
      if (dmarc.length === 0) return { cle, etat: "absent", lu: [] };
      return { cle, etat: dmarc.length > 1 ? "double" : "ok", lu: dmarc };
    }
  }
}

/** Une cle DKIM fait 400 caracteres : l'ecran n'en montre que le debut. */
function abreger(valeur: string): string {
  return valeur.length > 60 ? `${valeur.slice(0, 57)}...` : valeur;
}

type Fetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Pose les quatre questions en parallele. Une question sans reponse vaut "injoignable", jamais "absent". */
export async function interroger(domaine: string, recuperer: Fetch): Promise<Verdict[]> {
  return Promise.all(
    attendus(domaine).map(async (a): Promise<Verdict> => {
      try {
        const url = `${SERVEUR_DOH}?name=${encodeURIComponent(a.nom)}&type=${a.type}`;
        const reponse = await recuperer(url, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(DELAI_MS) });
        if (!reponse.ok) return { cle: a.cle, etat: "injoignable", lu: [] };
        return analyser(a.cle, valeursDe((await reponse.json()) as ReponseDoh, a.type));
      } catch {
        return { cle: a.cle, etat: "injoignable", lu: [] };
      }
    }),
  );
}
