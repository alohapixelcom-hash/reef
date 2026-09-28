// src/moteur/habillage.site.ts - ce que l'habillage du back office a de propre a ce site : ses polices, ses jetons, ses feuilles, sa marque.
//
// Fichier du SITE : le socle ne le reecrit jamais (voir socle.adaptateur.json).
// habillage.ts, lui, vient du socle et lit ces quatre valeurs.
//   POLICES : les @font-face des deux polices du site, servies par le build ;
//   JETONS : tokens.css tel quel (un rebrand suit sans rien toucher ici) ;
//   FEUILLES : l'habillage, dans l'ordre ou il entre dans la page (puis le
//     rail reduit a ce qui agit sur le site, back-office-rail.css, generique) ;
//   MARQUE_DU_SITE : un jeton que seule la feuille publique du site porte,
//     pour que feuille.ts la retire du back office ; vide, rien n'est trie.
import grotesk from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
import instrument from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";
import jetons from "../styles/tokens.css?raw";
import habillage from "./back-office.css?raw";
import rail from "./back-office-rail.css?raw";

export const POLICES = `
@font-face { font-family: "Space Grotesk Variable"; font-style: normal; font-display: swap; font-weight: 300 700; src: url(${grotesk}) format("woff2-variations"); }
@font-face { font-family: "Instrument Sans Variable"; font-style: normal; font-display: swap; font-weight: 400 700; src: url(${instrument}) format("woff2-variations"); }`;

export const JETONS: string = jetons;

export const FEUILLES: string[] = [habillage, rail];

export const MARQUE_DU_SITE = "";
