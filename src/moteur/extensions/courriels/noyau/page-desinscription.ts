// src/moteur/extensions/courriels/noyau/page-desinscription.ts - la page de confirmation de la desinscription (lien du pied d'un courriel de la lettre).
//
// DECIDE : le lien du pied ne desinscrit
// plus d'un seul clic. Un antivirus de messagerie qui "ouvre" chaque lien pour
// le verifier desinscrivait l'abonne a son insu. Le lien mene a cette page :
// une phrase, un bouton "Me desinscrire" (un formulaire POST, que les robots
// ne soumettent pas) et un lien pour garder son abonnement. Le bouton des
// messageries (RFC 8058, POST List-Unsubscribe=One-Click) reste direct.
//
// Une page autonome, sans feuille externe ni script : elle sert tous les sites
// qui ont une lettre, dans la langue de l'abonne, claire ou sombre selon le
// reglage de l'appareil, lisible a 390 px.

/** Les phrases de la page, dans le catalogue de la lettre (`desinscription`). */
export interface TextesDeLaPage {
  titre: string;
  phrase: (site: string, adresse: string) => string;
  bouton: string;
  garder: string;
}

const echapper = (v: string): string => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** L'adresse a demi masquee (c***@exemple.fr) : le lien a pu etre transfere. */
export function adresseMasquee(adresse: string): string {
  const i = adresse.indexOf("@");
  if (i < 1) return "***";
  return `${adresse[0]}***${adresse.slice(i)}`;
}

/** Le champ du formulaire qui distingue le bouton de la page du POST en un clic des messageries. */
export const CHAMP_CONFIRME = "confirme";

export function pageDeDesinscription(t: TextesDeLaPage, o: { langue: "fr" | "en"; site: string; adresse: string; action: string; accueil: string }): string {
  const site = echapper(o.site);
  return `<!doctype html>
<html lang="${o.langue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${echapper(t.titre)} - ${site}</title>
<style>
:root{color-scheme:light dark;--fond:#faf7f2;--encre:#1d1d1f;--doux:#5f5f63;--bouton:#1d1d1f;--bouton-encre:#fff;--filet:#d9d4cc}
@media (prefers-color-scheme:dark){:root{--fond:#0f1a1c;--encre:#f3f1ec;--doux:#b9b6ae;--bouton:#f3f1ec;--bouton-encre:#0f1a1c;--filet:#34454a}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:var(--fond);color:var(--encre);font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{width:100%;max-width:480px}
p.site{margin:0 0 8px;color:var(--doux);font-size:15px}
h1{margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:800}
p{margin:0 0 24px}
form{margin:0 0 16px}
button{width:100%;min-height:48px;border:0;border-radius:999px;background:var(--bouton);color:var(--bouton-encre);font:inherit;font-weight:600;cursor:pointer}
button:focus-visible,a:focus-visible{outline:3px solid var(--doux);outline-offset:3px}
a{display:block;text-align:center;color:var(--encre);padding:12px 0}
</style>
</head>
<body>
<main>
<p class="site">${site}</p>
<h1>${echapper(t.titre)}</h1>
<p>${echapper(t.phrase(o.site, adresseMasquee(o.adresse)))}</p>
<form method="post" action="${echapper(o.action)}"><input type="hidden" name="${CHAMP_CONFIRME}" value="1"><button type="submit">${echapper(t.bouton)}</button></form>
<a href="${echapper(o.accueil)}">${echapper(t.garder)}</a>
</main>
</body>
</html>
`;
}
