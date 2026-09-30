// src/moteur/champs-des-blocs.ts - la carte des champs de chaque bloc (generique) : ce que le theme declare dans theme.ts (CHAMPS_DES_BLOCS) pour que l'ecran d'un bloc cache les champs qui n'y font rien.
//
// POURQUOI. Tous les blocs de la collection "sections" partagent un schema :
// la photo, la video, l'image montree avant la video et la photo des elements
// s'affichent sur chaque bloc, alors que la plupart ne les lisent pas. Un
// client qui change une photo sans effet croit le site casse. Le theme dit
// ici quels champs agissent sur quel bloc (releve par la sonde :
// chaque champ change, publie, relu en visiteur) ; l'habillage du back
// office (habillage.ts, par scriptDeLaCarte ci-dessous) cache les autres dans
// l'ecran du bloc. Rien n'est retire de la base : un champ cache garde sa valeur.
//
// La carte gouverne aussi les textes (petit titre, mot en gris,
// chapeau, note...) et la liste des elements entiere, pas seulement les
// medias (mesure sur Holo : "Petit titre" et "Mot du titre ecrit en gris"
// s'affichaient sur des blocs qui ne les lisent pas). Et le script vit ici,
// pour qu'un back office qui n'a pas l'habillage du socle (celui de la
// boutique) cache les memes champs avec la meme carte.
//
// Un bloc absent de la carte garde tous ses champs (un bloc ajoute plus tard
// n'est jamais ampute) ; un site sans carte aussi.

/** La carte : les champs soumis a la carte, le libelle des sous-champs d'un element, et, par bloc, ceux qui agissent. */
export interface ChampsDesBlocs {
  /** Champs de "sections" que la carte gouverne : "image", "video", "video_poster", ou un sous-champ d'element ("arguments.image"). */
  surveilles: string[];
  /**
   * Le libelle dans la graine d'un champ que l'ecran ne nomme pas par un
   * identifiant : un sous-champ d'element, ou un texte long (l'editeur de
   * texte d'EmDash 0.38 n'a pas d'identifiant "field-<slug>"). Il est reconnu
   * a son libelle.
   */
  libelles?: Record<string, string>;
  /** Par bloc (son identifiant, le slug de l'entree), les champs surveilles qui agissent sur la page ; les autres sont caches. */
  blocs: Record<string, string[]>;
}

type ChampDeLaGraine = { slug: string; label?: string; type?: string; validation?: { subFields?: ChampDeLaGraine[] } };
type Graine = { collections: { slug: string; fields: ChampDeLaGraine[] }[] };

/** Les defauts d'une carte au regard de la graine : champ surveille absent, sous-champ sans libelle juste, bloc qui cite un champ non surveille. Liste vide : la carte est bonne. */
export function defautsDeLaCarte(carte: ChampsDesBlocs, graine: Graine): string[] {
  const defauts: string[] = [];
  const sections = graine.collections.find((c) => c.slug === "sections")?.fields ?? [];
  for (const champ of carte.surveilles) {
    const [racine, sous] = champ.split(".");
    const trouve = sections.find((f) => f.slug === racine);
    if (!trouve) {
      defauts.push(`${champ} : absent de la collection sections`);
      continue;
    }
    if (!sous) {
      const libelle = carte.libelles?.[champ];
      if (libelle !== undefined && libelle !== trouve.label) defauts.push(`${champ} : libelle different de la graine (« ${trouve.label ?? ""} »)`);
      continue;
    }
    const sousChamp = trouve.validation?.subFields?.find((f) => f.slug === sous);
    if (!sousChamp) defauts.push(`${champ} : sous-champ absent de ${racine}`);
    else if (carte.libelles?.[champ] !== sousChamp.label) defauts.push(`${champ} : libelle different de la graine (« ${sousChamp.label ?? ""} »)`);
  }
  for (const [bloc, champs] of Object.entries(carte.blocs)) {
    for (const champ of champs) if (!carte.surveilles.includes(champ)) defauts.push(`${bloc} : ${champ} n'est pas un champ surveille`);
  }
  return defauts;
}

/** Les champs surveilles caches dans l'ecran d'un bloc (vide pour un bloc absent de la carte). */
export function champsCaches(carte: ChampsDesBlocs | null | undefined, bloc: string): string[] {
  const utiles = carte?.blocs[bloc];
  return utiles ? carte.surveilles.filter((c) => !utiles.includes(c)) : [];
}

// LE SCRIPT DE L'ECRAN D'UN BLOC. Il lit l'adresse web du bloc (son slug, le
// champ que l'habillage cache mais garde), puis cache, pour chaque champ
// surveille qui n'agit pas sur ce bloc, sa ligne entiere (libelle et saisie) :
//   - un champ qui a un identifiant "field-<slug>" (texte court, image, liste
//     fermee, case) : sa ligne ;
//   - une liste d'elements (libelle "for" = "field-<slug>", sans saisie de ce
//     nom) : la liste entiere ;
//   - un texte long : la ligne dont le libelle est celui de la carte, hors des
//     elements ;
//   - un sous-champ d'element : dans la liste de son champ, chaque ligne qui
//     porte son libelle.
// Il repasse a chaque changement de la page (EmDash dessine l'ecran par
// morceaux, et un element ajoute arrive plus tard) et ne fait rien ailleurs.
/** Le script a poser dans la page du back office ; vide sans carte. */
export function scriptDeLaCarte(carte: ChampsDesBlocs | null | undefined): string {
  if (!carte?.blocs) return "";
  const CARTE = JSON.stringify(carte).replace(/</g, "\\u003c");
  return `<script data-aloha-champs-des-blocs>(function(){var CARTE=${CARTE};function nu(l){return (l.textContent||"").trim().replace(/\\((optional|facultatif)\\)$/,"").trim();}function cacher(e){if(e&&e.style.display!=="none")e.style.display="none";}function haut(l){for(var x=l.parentElement;x;x=x.parentElement){if(/\\brounded-lg\\b/.test(typeof x.className==="string"?x.className:""))return false;if(x.tagName==="FIELDSET"||x.tagName==="FORM")return true;}return true;}function passer(){prevu=false;if(!/\\/_emdash\\/admin\\/content\\/sections\\/[^/]+/.test(location.pathname))return;var labels=document.querySelectorAll("label");var slug=null;labels.forEach(function(l){var t=nu(l);if(t==="Slug"||t==="Adresse web"){var i=(l.htmlFor&&document.getElementById(l.htmlFor))||(l.parentElement&&l.parentElement.querySelector("input"));if(i)slug=i.value;}});var utiles=slug?CARTE.blocs[slug]:null;if(!utiles)return;var lib=CARTE.libelles||{};(CARTE.surveilles||[]).forEach(function(c){if(utiles.indexOf(c)!==-1)return;var p=c.indexOf(".");if(p===-1){var e=document.getElementById("field-"+c);if(e){cacher(e.tagName==="DIV"?e:e.parentElement);return;}var r=document.querySelector("label[for=\\"field-"+c+"\\"]");if(r){cacher(r.parentElement&&r.parentElement.parentElement);return;}if(lib[c])labels.forEach(function(l){if(nu(l)===lib[c]&&haut(l))cacher(l.parentElement);});return;}var nom=lib[c];var t=document.querySelector("label[for=\\"field-"+c.slice(0,p)+"\\"]");var boite=t&&t.parentElement&&t.parentElement.parentElement;if(boite&&nom)boite.querySelectorAll("label").forEach(function(l){if(nu(l)===nom)cacher(l.parentElement);});});}var prevu=false;function plus_tard(){if(!prevu){prevu=true;requestAnimationFrame(passer);}}new MutationObserver(plus_tard).observe(document.documentElement,{subtree:true,childList:true});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",passer);else passer();})();</script>`;
}
