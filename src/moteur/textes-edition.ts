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
    lienDefaut: "(prévue par le thème)",
    adresseCorrigee: "Adresse corrigée : le bouton ouvre {a}",
    adresseRefusee: "Adresse refusée : une adresse n'a pas d'espace et commence par https:// (un autre site) ou / (une page du site). Le bouton garde son adresse.",
    ouvre: "ouvre",
    reglagesDuBloc: "Réglages du bloc",
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
    site: "Réglages de cette langue (description, e-mail, couleur, crédit)",
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
    lienDefaut: "(set by the theme)",
    adresseCorrigee: "Address corrected: the button opens {a}",
    adresseRefusee: "Address refused: an address has no space and starts with https:// (another site) or / (a page of this site). The button keeps its address.",
    ouvre: "opens",
    reglagesDuBloc: "Block settings",
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
    site: "Settings of this language (description, email, colour, credit)",
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
  valeur: "text-decoration:underline dotted;text-underline-offset:3px;cursor:text;min-width:1ch;flex-shrink:0",
  avis: "display:block;flex-basis:100%;max-width:24rem;margin-left:auto;padding:.35rem .7rem;border-radius:.6rem;background:var(--edition-fond);color:var(--edition-encre);border:1px solid var(--edition-bord);font:500 .72rem/1.35 var(--edition-police),system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:normal",
  panneau:
    "position:fixed;left:1rem;bottom:4.75rem;z-index:2147483000;width:auto;max-width:min(22rem,calc(100vw - 2rem));padding:.65rem 1rem;border-radius:1rem;background:var(--edition-fond);color:var(--edition-encre);border:1px solid var(--edition-bord);box-shadow:0 12px 40px rgba(0,0,0,.3);font:.85rem/1.45 var(--edition-police),system-ui,sans-serif",
  titre: "margin:0 0 .35rem;font:700 1rem/1.2 var(--edition-police-titre),system-ui,sans-serif",
  intro: "margin:0 0 .6rem;color:var(--edition-discret)",
  liste: "margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.25rem",
  lien: "color:var(--edition-accent);text-decoration:underline;text-underline-offset:3px",
  resume: "cursor:pointer;font:700 .85rem/1.2 var(--edition-police-titre),system-ui,sans-serif;list-style:none",
} as const;

/**
 * LE MODE EDITION A 390 PX. Les pastilles sont posees en
 * surimpression dans le coin du bloc : sur un telephone elles s'empilaient
 * sous la barre et derriere le panneau. Sous 640 px elles passent dans le
 * flux, en tete du bloc, sur toute la largeur ; le panneau se fait plus
 * etroit ; et le bas de page garde la place du panneau et de la barre, pour
 * que la derniere ligne du pied reste lisible. Mode edition seulement : cette
 * feuille n'est posee que par CadreDuSite.astro, pour un editeur connecte.
 */
export const FEUILLE_D_EDITION =
  "body{padding-bottom:7rem}" +
  "@media (max-width:640px){" +
  "[data-aloha-pastilles]{position:relative!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;justify-content:flex-start!important;max-width:none!important;margin:.5rem .75rem!important}" +
  "[data-aloha-pastilles]>span{max-width:100%!important;white-space:normal!important}" +
  // La rangee du premier ecran (posee en bas du bloc sur grand ecran) passe
  // sous la barre de navigation fixe, pas derriere.
  '[data-aloha-pastilles][style*="bottom:.75rem"]{margin-top:6rem!important}' +
  "[data-aloha-cadre=panneau]{left:.5rem!important;bottom:4.5rem!important;max-width:calc(100vw - 1rem)!important;padding:.45rem .8rem!important;font-size:.8rem!important}" +
  "[data-aloha-cadre=panneau][open]{max-height:60vh;overflow:auto}" +
  "}" +
  "[data-aloha-avis]{display:block;margin-top:.25rem;white-space:normal;font-weight:500}";

/**
 * L'ADRESSE D'UN BOUTON CORRIGEE A LA SAISIE. La barre d'EmDash
 * enregistre le texte de la pastille au blur ou sur Entree, par ses propres
 * ecouteurs poses sur l'element. Ce script ecoute AVANT elle (phase de
 * capture, sur le document) et applique la regle d'adresseDuLien (cadre.ts,
 * recopiee telle quelle par CadreDuSite.astro) : "www.exemple.fr" devient
 * "https://www.exemple.fr" avant l'enregistrement, et une phrase le dit sous
 * la pastille ; une adresse refusee remet l'ancienne (rien n'est enregistre)
 * et la phrase dit pourquoi.
 */
export function scriptDesAdresses(regle: string, mots: { adresseCorrigee: string; adresseRefusee: string }): string {
  return `(function(){var corriger=(${regle});var M=${JSON.stringify(mots)};var S=${JSON.stringify(STYLES.avis)};function avis(el,t,corrigee){var p=el.parentNode;if(!p||!p.parentNode)return;if(corrigee){var d=p.querySelector("[data-aloha-defaut]");if(d)d.style.display="none";}var n=p.nextElementSibling;if(!n||n.getAttribute("data-aloha-avis")===null){n=document.createElement("span");n.setAttribute("data-aloha-avis","");n.setAttribute("style",S);n.setAttribute("role","status");p.parentNode.insertBefore(n,p.nextSibling);}n.textContent=t;}function avant(e){var el=e.target;if(!el||!el.getAttribute||el.getAttribute("data-aloha-adresse")===null||!el.isContentEditable)return;if(e.type==="keydown"&&!(e.key==="Enter"&&!e.shiftKey))return;var v=(el.textContent||"").trim();if(v===""||v===el.getAttribute("data-aloha-adresse"))return;var r=corriger(v);if(r.refus){el.textContent=el.getAttribute("data-aloha-adresse");avis(el,M.adresseRefusee,false);}else if(r.corrigee){el.textContent=r.adresse;avis(el,M.adresseCorrigee.replace("{a}",r.adresse),true);}}document.addEventListener("keydown",avant,true);document.addEventListener("blur",avant,true);})();`;
}

/**
 * DEUX CORRECTIFS DE LA BARRE D'EMDASH 0.38, en mode edition seulement. Le
 * script de la barre lit ses reponses sans l'enveloppe { success, data } de
 * l'API (mesure, request-context.mjs) :
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

/**
 * LA BARRE D'EMDASH 0.38 EN FRANCAIS, en mode edition et quand
 * le back office est en francais. Le script de la barre ecrit ses libelles en
 * anglais, en dur (request-context.mjs : "Edit", "Publish", "No image
 * selected", "Alt text", "Upload"...), hors de tout catalogue. Ce script les
 * remplace par leur traduction au moment ou ils apparaissent, et seulement
 * dans les elements de la barre et de sa fenetre Image (classes et
 * identifiants "emdash-") : le texte du site n'est jamais touche. Un libelle
 * que la table ne connait pas reste tel quel.
 */
export const BARRE_EN_FRANCAIS: Readonly<Record<string, string>> = {
  Edit: "Modifier",
  Publish: "Publier",
  "Publishing\u2026": "Publication\u2026",
  Published: "Publié",
  "Unpublished changes": "Modifications non publiées",
  Draft: "Brouillon",
  Saved: "Enregistré",
  "Saving\u2026": "Enregistrement\u2026",
  Unsaved: "Non enregistré",
  "Save failed": "Échec de l'enregistrement",
  Image: "Photo",
  "No image selected": "Aucune photo choisie : la photo du thème s'affiche",
  "Alt text": "Description de la photo (lue aux malvoyants)",
  "Describe the image": "Décrivez la photo en quelques mots",
  Replace: "Choisir une autre photo",
  Remove: "Retirer (revenir à la photo du thème)",
  Upload: "Envoyer une photo",
  "Upload failed": "L'envoi a échoué : réessayez avec une photo JPEG ou PNG",
  "Media Library": "Médiathèque",
  Back: "Retour",
  "Loading\u2026": "Chargement\u2026",
  "No images found": "Aucune photo dans la médiathèque",
  "Failed to load media": "La médiathèque n'a pas pu s'ouvrir",
  "Hide toolbar": "Masquer la barre",
  "Toggle edit mode": "Activer ou quitter le mode édition",
  "Open in admin": "Ouvrir dans le back office",
};

export function traductionDeLaBarre(): string {
  return `(function(){var T=${JSON.stringify(BARRE_EN_FRANCAIS)};function dans(n){var e=n.nodeType===1?n:n.parentElement;return !!(e&&e.closest&&e.closest('[id^="emdash-"],[class*="emdash-"]'));}function texte(n){var v=n.nodeValue,t=v.trim();if(!t)return;var f=T[t];if(!f){var m=/^Uploading (.+)\u2026$/.exec(t);if(m)f="Envoi de "+m[1]+"\u2026";}if(f&&f!==t)n.nodeValue=v.replace(t,f);}function attributs(e){["title","placeholder","aria-label"].forEach(function(a){var v=e.getAttribute&&e.getAttribute(a);if(v&&T[v])e.setAttribute(a,T[v]);});}function passer(r){if(!dans(r))return;if(r.nodeType===3){texte(r);return;}if(r.nodeType!==1)return;attributs(r);var w=document.createTreeWalker(r,5);var n;while((n=w.nextNode())){if(n.nodeType===3)texte(n);else attributs(n);}}function tout(){document.querySelectorAll('[id^="emdash-"],[class*="emdash-"]').forEach(passer);}new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==="characterData")passer(m.target);else if(m.type==="attributes")passer(m.target);else m.addedNodes.forEach(passer);});}).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["title","placeholder","aria-label"]});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",tout);else tout();})();`;
}
