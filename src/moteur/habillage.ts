// src/moteur/habillage.ts - pose les jetons du site et l'habillage dans la page du back office, sans toucher au paquet du moteur.
//
// POURQUOI UN MIDDLEWARE : la page du back office appartient a EmDash. La
// copier pour la restyler, c'est heriter de chacune de ses mises a jour a la
// main. Ici on laisse passer sa reponse et on y ajoute une feuille de style,
// rien d'autre : le moteur se met a jour sans nous.
//
// CE QUE L'HABILLAGE A LE DROIT DE FAIRE (regle de l'editeur) : la couleur d'accent, les polices, le logo et le nom du site. Les
// fonds restent ceux du moteur, blanc en clair et noir en sombre, et
// back-office.css ne nomme plus aucune surface. Les jetons viennent de
// tokens.css LUI-MEME, relu tel quel pour qu'un rebrand suive : `@theme`
// devient `:root` (le back office n'a pas le Tailwind du site) et `.dark`
// devient le data-mode du back office. Seules ses VARIABLES entrent : une
// regle de tokens.css qui peint quelque chose sous `.dark` (le voile des
// images du site) reste au site.
//
// CE QUI EST PROPRE AU SITE vit dans habillage.site.ts, que le site possede
// et que le socle ne reecrit jamais : ses polices, son tokens.css, ses
// feuilles (back-office.css et, s'il en a, les suivantes), la marque qui
// reconnait sa feuille publique. Ce fichier-ci est le meme partout : il
// reunit les trois corrections que les depots avaient faites chacun de leur
// cote (commentaires retires, pont des polices, feuille du site retiree),
// le correctif de l'ecran Parametres d'EmDash 0.38 trouve par Swell, et
// les ecrans en mots de client, ECRANS_SIMPLES ci-dessous.
import { defineMiddleware } from "astro:middleware";
import { sansLaFeuilleDuSite } from "./feuille";
import { FEUILLES, JETONS, MARQUE_DU_SITE, POLICES } from "./habillage.site";

// LA CARTE DES CHAMPS DE CHAQUE BLOC. Tous les blocs d'un site
// partagent le schema de leur collection : "Photo du bloc", "Adresse de la
// video", "Image montree avant la video" et la photo des elements s'affichent
// sur chaque bloc, alors que la plupart ne les lisent pas (135 champs
// sans effet sur Aloha). Le theme dit, dans theme.ts
// (CHAMPS_DES_BLOCS, forme : champs-des-blocs.ts de l'extension administrable),
// quels champs agissent sur quel bloc ; l'ecran d'un bloc cache les autres. Un
// site sans carte, ou un bloc absent de la carte, garde tous ses champs. La
// carte et le script qui la lit (scriptDeLaCarte : le meme pour
// un back office qui n'a pas cet habillage, celui de la boutique) sont lus
// sans import nomme : un site qui ne les a pas se construit comme avant.
const modulesDuTheme = import.meta.glob<Record<string, unknown>>("./theme.ts", { eager: true });
const carte = Object.values(modulesDuTheme)[0]?.CHAMPS_DES_BLOCS ?? null;
const modulesDeLaCarte = import.meta.glob<{ scriptDeLaCarte?: (carte: unknown) => string }>("./champs-des-blocs.ts", { eager: true });
const SCRIPT_DE_LA_CARTE = carte ? (Object.values(modulesDeLaCarte)[0]?.scriptDeLaCarte?.(carte) ?? "") : "";

// Les commentaires de tokens.css et des feuilles s'adressent a qui lit le
// depot, pas au navigateur : ils ne partent pas dans la page.
const sansCommentaires = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n");

const jetonsNus = sansCommentaires(JETONS);

const jetons = jetonsNus
  // Une regle `.dark <descendant> { ... }` n'est pas un jeton : elle saute.
  .replace(/(^|\n)\.dark\s+[^\s{][^{]*\{[^}]*\}/g, "$1")
  .replace(/@theme(?:\s+inline)?\s*\{/g, ":root {")
  .replace(/\.dark\b/g, '[data-mode="dark"]');

// Le moteur definit lui aussi --font-sans, et il la fait dependre de
// --font-emdash : lui rendre --font-sans fermerait une boucle, et une boucle
// de variables ne vaut plus rien. Les deux piles de polices sont donc relues
// dans tokens.css et posees sous un nom que personne d'autre n'ecrit. Une
// feuille qui ne s'en sert pas n'y perd rien.
const pile = (nom: string): string =>
  new RegExp(`--font-${nom}:\\s*([^;]+);`).exec(jetonsNus)?.[1] ?? "system-ui, sans-serif";
const pont = `:root { --aloha-police-texte: ${pile("sans")}; --aloha-police-titre: ${pile("display")}; }`;

const FEUILLE = `<style data-aloha-back-office>${POLICES}\n${pont}\n${jetons}\n${FEUILLES.map(sansCommentaires).join("\n")}</style>`;

// UN CORRECTIF DE L'ECRAN PARAMETRES D'EMDASH 0.38. "Supprimer" sous le logo
// (ou la favicon, ou l'image de partage du SEO) vide le champ du formulaire,
// mais "Enregistrer" envoie alors un corps SANS ce champ, et le moteur, qui
// fusionne, garde l'ancienne image : le logo ne se retirait pas (mesure sur
// POST /_emdash/api/settings). Ce script recopie le vide
// dans l'envoi, sous la seule forme que l'API accepte ({ mediaId: "" }, une
// reference qui ne mene a aucun fichier) ; la page, qui ne trouve pas
// d'adresse, rend alors l'image du theme (cadre.ts, identite).
const CORRECTIF_PARAMETRES = `<script data-aloha-back-office>(function(){var f=window.fetch;window.fetch=function(i,o){try{var u=typeof i==="string"?i:(i&&i.url)||"";if(/\\/_emdash\\/api\\/settings$/.test(u)&&o&&(o.method||"").toUpperCase()==="POST"&&typeof o.body==="string"){var b=JSON.parse(o.body);if("title" in b||"tagline" in b){["logo","favicon"].forEach(function(k){if(!(k in b))b[k]={mediaId:""};});}if(b.seo&&typeof b.seo==="object"&&!("defaultOgImage" in b.seo))b.seo.defaultOgImage={mediaId:""};o=Object.assign({},o,{body:JSON.stringify(b)});}}catch(e){}return f.call(this,i,o);};})();</script>`;

// LES ECRANS D'EMDASH 0.38 EN MOTS DE CLIENT. Ce que le
// catalogue ne peut pas traduire, parce que le moteur l'ecrit en dur :
//   - "(optional)" apres chaque libelle (composant Label de kumo) ;
//   - les dates relatives ("15 mins ago", "9 hours ago", "just now") ;
//   - l'exemple "my-post-slug" sous l'adresse d'une page ;
//   - la version du moteur au bas du rail ("Onda v0.38.0 (8975a850)") ;
//   - les noms des taxonomies natives, que le moteur ecrit
//     depuis leur definition anglaise : "Taxonomies" (le panneau d'un
//     article) devient "Classement", "Tags" "Etiquettes", "Categories"
//     "Categories" accentue, et les trois phrases de l'ecran des etiquettes
//     qui reprennent le nom anglais ("Gerer les tags pour les posts",
//     "Ajouter Tag", "Creer un nouveau tag").
// Et, quand le site pose la feuille du rail (extension administrable, qui y
// ecrit --aloha-ecrans-simples), ce qui n'agit pas sur le site :
//   - dans Parametres, Slogan, URL du site, Articles par page, Format des
//     dates et Fuseau horaire, sauf ceux que le site dit lire dans sa feuille
//     (--aloha-parametres-lus : slogan, url, posts, dates, fuseau ; Reef lit
//     "posts", la pagination de ses billets) ;
//   - dans l'ecran d'un bloc ou des reglages de la langue (collections
//     "sections" et "site"), le slug : c'est ce qui relie le bloc a sa place
//     dans la page, le changer le detache du site ;
//   - dans chaque ecran de contenu, les panneaux Responsabilite,
//     Collaborateurs et Taxonomies, que le site ne lit pas ; Taxonomies
//     reste visible quand le site dit lire ses etiquettes
//     (--aloha-panneaux-lus: taxonomies, dans sa feuille) ;
//   - dans l'ecran d'un bloc, les champs que la carte du theme
//     dit sans effet sur ce bloc (SCRIPT_DE_LA_CARTE ci-dessus, pose apres) ;
//   - le "0" qu'EmDash ecrit dans "Place du bloc" vide : 0 vaut
//     vide pour le site (ordre-des-blocs.ts), le champ se montre donc vide tant
//     qu'on n'y ecrit pas.
// Rien n'est retire de la page : les elements sont caches, et reviennent le
// jour ou le moteur les rend utiles. Le script ne touche qu'aux textes et
// libelles qu'il connait, et ne fait rien d'autre.
const ECRANS_SIMPLES = `<script data-aloha-back-office>(function(){var fr=function(){return (document.documentElement.lang||"").slice(0,2)==="fr";};var P={"(optional)":"(facultatif)","just now":"à l'instant","Taxonomies":"Classement","Tags":"Étiquettes","Categories":"Catégories","Gérer les tags pour les posts":"Gérer les étiquettes des articles","Ajouter Tag":"Ajouter une étiquette","Créer un nouveau tag":"Créer une étiquette"};var PARAMETRES={slogan:["Slogan","Tagline"],url:["URL du site","Site URL"],posts:["Articles par page","Posts per page"],dates:["Format des dates","Date format"],fuseau:["Fuseau horaire","Timezone"]};var PANNEAUX=["Responsabilité","Ownership","Collaborateurs","Bylines","Taxonomies","Classement"];function relatif(t){var m=/^(\\d+) (min|hour|day)s? ago$/.exec(t);if(!m)return null;var n=m[1];return m[2]==="min"?"il y a "+n+" min":m[2]==="hour"?"il y a "+n+" h":"il y a "+n+" jour"+(n==="1"?"":"s");}function textes(r){var w=document.createTreeWalker(r,4);var n;while((n=w.nextNode())){var v=n.nodeValue,t=v.trim();if(!t||t.length>40)continue;var f=P[t]||relatif(t);if(f)n.nodeValue=v.replace(t,f);}r.querySelectorAll("input[placeholder=\\"my-post-slug\\"]").forEach(function(e){e.placeholder="adresse-de-la-page";});}function nu(l){return (l.textContent||"").trim().replace(/\\((optional|facultatif)\\)$/,"").trim();}function cacher(e){if(e&&e.style.display!=="none")e.style.display="none";}function ligne(l){var g=l.parentElement,r=g&&g.parentElement;var c=r&&/\\bpx-4\\b/.test(r.className)?r:g;cacher(c);var carte=c&&c.parentElement;if(carte&&Array.prototype.every.call(carte.children,function(x){return x.style.display==="none";})){cacher(carte);var t=carte.previousElementSibling;if(t&&t.querySelector&&t.querySelector("h2,h3"))cacher(t);}}function simples(){var chemin=location.pathname;document.querySelectorAll("p").forEach(function(e){if(/ v\\d+\\.\\d+\\.\\d+ \\([0-9a-f]+\\)$/.test(e.textContent||"")&&e.children.length===0)cacher(e);});if(!getComputedStyle(document.documentElement).getPropertyValue("--aloha-ecrans-simples").trim())return;var labels=document.querySelectorAll("label");if(/\\/_emdash\\/admin\\/settings(\\/general)?\\/?$/.test(chemin)){var lus=getComputedStyle(document.documentElement).getPropertyValue("--aloha-parametres-lus");var caches=[];Object.keys(PARAMETRES).forEach(function(k){if(lus.indexOf(k)===-1)caches=caches.concat(PARAMETRES[k]);});labels.forEach(function(l){if(caches.indexOf(nu(l))!==-1)ligne(l);});}if(/\\/_emdash\\/admin\\/content\\/(sections|site)\\/[^/]+/.test(chemin))labels.forEach(function(l){var t=nu(l);if(t==="Slug"||t==="Adresse web")cacher(l.parentElement);});if(/\\/_emdash\\/admin\\/content\\/[^/]+\\/[^/]+/.test(chemin)){var pl=getComputedStyle(document.documentElement).getPropertyValue("--aloha-panneaux-lus");document.querySelectorAll("h3").forEach(function(h){var t=(h.textContent||"").trim();if(PANNEAUX.indexOf(t)!==-1&&!((t==="Taxonomies"||t==="Classement")&&pl.indexOf("taxonomies")!==-1))cacher(h.closest("section"));});}}function place(){var o=document.getElementById("field-order");if(!o||!/\\/_emdash\\/admin\\/content\\/sections\\//.test(location.pathname))return;var c=o.value==="0"&&document.activeElement!==o?"transparent":"";if(o.style.color!==c)o.style.color=c;}var prevu=false;function passer(){prevu=false;if(fr())textes(document.body);simples();place();}["focusin","focusout","input"].forEach(function(n){document.addEventListener(n,place,true);});function plus_tard(){if(!prevu){prevu=true;requestAnimationFrame(passer);}}new MutationObserver(plus_tard).observe(document.documentElement,{subtree:true,childList:true,characterData:true});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",passer);else passer();})();</script>`;

export const onRequest = defineMiddleware(async (context, next) => {
  const reponse = await next();
  if (!context.url.pathname.startsWith("/_emdash/admin")) return reponse;
  if (!(reponse.headers.get("content-type") ?? "").includes("text/html")) return reponse;
  const html = await reponse.text();
  // La feuille du site sort d'abord (voir feuille.ts), l'habillage entre ensuite.
  return new Response(sansLaFeuilleDuSite(html, MARQUE_DU_SITE).replace("</head>", `${FEUILLE}${CORRECTIF_PARAMETRES}${ECRANS_SIMPLES}${SCRIPT_DE_LA_CARTE}</head>`), {
    status: reponse.status,
    headers: reponse.headers,
  });
});
