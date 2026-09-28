// src/moteur/textes-edition.ts - les libelles et les styles des pastilles et du panneau "Cadre du site" (generique), dans la langue du back office (francais par defaut, anglais sinon).
//
// Ces mots ne sont vus que par un editeur connecte, en mode edition : ils ne
// sont pas dans les dictionnaires du site (qui parlent au visiteur) et
// n'entrent jamais dans le HTML anonyme. La langue est celle du back office :
// le cookie emdash-locale que le moteur pose (voir langue-bo.ts), sinon la
// langue par defaut du back office, sinon le francais.
//
// Pur, sans importation : le scan de Tailwind ignore src/moteur/.

export type LangueDuBackOffice = "fr" | "en";

/** La langue du back office pour cette requete, lue sur le cookie du moteur, sinon la langue par defaut du site. */
export function langueDuBackOffice(cookie: string | undefined, defaut: string | null | undefined): LangueDuBackOffice {
  const choisie = (cookie ?? defaut ?? "fr").toLowerCase();
  return choisie.startsWith("fr") ? "fr" : "en";
}

/** Les mots des pastilles et du panneau. */
export const MOTS = {
  fr: {
    lien: "Adresse du bouton :",
    lienSecondaire: "Adresse du 2e bouton :",
    lienDefaut: "(celle du thème)",
    photo: "Photo",
    photoDefaut: "Photo : celle du thème",
    video: "Vidéo :",
    capture: "Capture du téléphone",
    captureDefaut: "Capture du téléphone : celle du thème",
    choisie: "image choisie",
    enAvant: "Offre mise en avant",
    pasEnAvant: "Mettre cette offre en avant",
    affiche: "Affiche de la vidéo",
    afficheDefaut: "Affiche : celle du thème",
    partage: "Image de partage",
    partageDefaut: "Image de partage : celle du thème",
    avatar: "Photo",
    avatarDefaut: "Photo : les initiales",
    masquer: "Masquer ce bloc",
    masque: "Bloc masqué : les visiteurs ne le voient pas",
    panneau: "Cadre du site",
    panneauIntro: "Ce que la barre ne touche pas se règle ici, dans le back office :",
    menus: "Menus de cette langue",
    reglages: "Réglages du site (nom, logo, favicon, réseaux, image de partage)",
    site: "Réglages par langue (description, e-mail, crédit)",
    entete: "Textes de l'en-tête",
    pied: "Textes du pied de page",
    redirections: "Redirections",
    medias: "Médiathèque",
    pages: "Pages libres",
    fermer: "Fermer",
    menuAbsent: "(à créer : les liens des fichiers s'affichent)",
  },
  en: {
    lien: "Button address:",
    lienSecondaire: "2nd button address:",
    lienDefaut: "(the theme's)",
    photo: "Photo",
    photoDefaut: "Photo: the theme's",
    video: "Video:",
    capture: "Phone screenshot",
    captureDefaut: "Phone screenshot: the theme's",
    choisie: "chosen image",
    enAvant: "Featured plan",
    pasEnAvant: "Feature this plan",
    affiche: "Video poster",
    afficheDefaut: "Poster: the theme's",
    partage: "Share image",
    partageDefaut: "Share image: the theme's",
    avatar: "Photo",
    avatarDefaut: "Photo: the initials",
    masquer: "Hide this block",
    masque: "Hidden block: visitors do not see it",
    panneau: "Site frame",
    panneauIntro: "What the bar cannot reach is set here, in the back office:",
    menus: "Menus of this language",
    reglages: "Site settings (name, logo, favicon, social links, share image)",
    site: "Per-language settings (description, email, credit)",
    entete: "Header texts",
    pied: "Footer texts",
    redirections: "Redirects",
    medias: "Media library",
    pages: "Free pages",
    fermer: "Close",
    menuAbsent: "(to create: the file links are shown)",
  },
} as const;

/**
 * Les styles en ligne des pastilles et du panneau : aucune classe du theme,
 * rien dans la feuille de style du site. Les couleurs et les polices sont des
 * variables --edition-*, que l'adaptateur du theme relie a ses jetons
 * (theme.ts, VARIABLES_D_EDITION) et que CadreDuSite.astro pose en mode
 * edition.
 */
export const STYLES = {
  rangee: "position:absolute;top:.75rem;right:.75rem;z-index:40;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.4rem;max-width:min(90%,40rem);pointer-events:auto",
  pastille:
    "display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;border-radius:999px;background:var(--edition-accent);color:var(--edition-accent-encre);font:600 .72rem/1.2 var(--edition-police),system-ui,sans-serif;letter-spacing:.01em;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;max-width:24rem;overflow:hidden;text-overflow:ellipsis",
  pastilleDefaut: "opacity:.85",
  rangeeEnLigne: "position:relative;z-index:40;display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0",
  etiquette: "opacity:.8;font-weight:500",
  valeur: "text-decoration:underline dotted;text-underline-offset:3px;cursor:text;min-width:1ch",
  panneau:
    "position:fixed;left:1rem;bottom:4.75rem;z-index:2147483000;width:auto;max-width:min(22rem,calc(100vw - 2rem));padding:.65rem 1rem;border-radius:1rem;background:var(--edition-fond);color:var(--edition-encre);border:1px solid var(--edition-bord);box-shadow:0 12px 40px rgba(0,0,0,.3);font:.85rem/1.45 var(--edition-police),system-ui,sans-serif",
  titre: "margin:0 0 .35rem;font:700 1rem/1.2 var(--edition-police-titre),system-ui,sans-serif",
  intro: "margin:0 0 .6rem;color:var(--edition-discret)",
  liste: "margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.25rem",
  lien: "color:var(--edition-accent);text-decoration:underline;text-underline-offset:3px",
  resume: "cursor:pointer;font:700 .85rem/1.2 var(--edition-police-titre),system-ui,sans-serif;list-style:none",
} as const;

/**
 * DEUX CORRECTIFS DE LA BARRE D'EMDASH 0.38, en mode edition seulement. Le
 * script de la barre lit ses reponses sans l'enveloppe { success, data } de
 * l'API (mesure du 28 septembre 2026, request-context.mjs) :
 *   - mediatheque (/_emdash/api/media) : il cherche `item` et `items` a la
 *     racine, donc "Upload" repondait "Upload failed" et "Replace" montrait
 *     une mediatheque vide ;
 *   - entree (GET /_emdash/api/content/<collection>/<id>) : il cherche
 *     `data[champ]` a la racine, donc la fenetre "Image" disait "No image
 *     selected" et n'offrait pas "Remove" sur une photo choisie. Le moteur
 *     range une image sans son adresse (seulement meta.storageKey) : elle est
 *     ajoutee, comme cadre.ts le fait pour la page.
 * Ce script, pose avant celui de la barre, remet ces seules reponses JSON a
 * la forme que la barre lit. Le jour ou EmDash lit l'enveloppe, les conditions
 * ne jouent plus et rien ne change.
 */
export const CORRECTIF_DE_LA_BARRE = `(function(){var f=window.fetch;function img(v){if(v&&typeof v==="object"&&!v.src&&(!v.provider||v.provider==="local")&&v.meta&&v.meta.storageKey){v.src="/_emdash/api/media/file/"+v.meta.storageKey;}return v;}window.fetch=function(i,o){var u=typeof i==="string"?i:(i&&i.url)||"";var m=((o&&o.method)||(i&&i.method)||"GET").toUpperCase();var p=f.apply(this,arguments);var media=u.indexOf("/_emdash/api/media")!==-1;var entree=m==="GET"&&/\\/_emdash\\/api\\/content\\/[^/?#]+\\/[^/?#]+$/.test(u);if(!media&&!entree)return p;return p.then(function(r){if((r.headers.get("content-type")||"").indexOf("application/json")===-1)return r;return r.clone().json().then(function(j){if(!j||j.success!==true||!j.data||typeof j.data!=="object")return r;var n=null;if(media&&!("item" in j)&&!("items" in j))n=Object.assign({},j,j.data);if(entree&&j.data.item&&j.data.item.data){n=Object.assign({},j.data.item);Object.keys(n.data).forEach(function(k){img(n.data[k]);});}return n?new Response(JSON.stringify(n),{status:r.status,statusText:r.statusText,headers:r.headers}):r;},function(){return r;});});};})();`;
