// src/moteur/habillage.ts - pose les jetons du theme et l'habillage dans la page du back office, sans toucher au paquet du moteur.
//
// POURQUOI UN MIDDLEWARE : la page du back office appartient a EmDash. La
// copier pour la restyler, c'est heriter de chacune de ses mises a jour a la
// main. Ici on laisse passer sa reponse et on y ajoute une feuille de style,
// rien d'autre : le moteur se met a jour sans nous.
//
// CE QUE L'HABILLAGE A LE DROIT DE FAIRE (regle de l'editeur, 23 septembre
// 2026) : la couleur d'accent, les polices, le logo et le nom du site. Les
// fonds restent ceux du moteur, blanc en clair et noir en sombre, et
// back-office.css ne nomme plus aucune surface. Les jetons viennent de
// tokens.css LUI-MEME, relu tel quel pour qu'un rebrand suive : `@theme`
// devient `:root` (le back office n'a pas le Tailwind du theme) et `.dark`
// devient le data-mode du back office. Seules ses VARIABLES entrent : une
// regle de tokens.css qui peint quelque chose sous `.dark` (le voile des
// images du site, par exemple) reste au site.
import { defineMiddleware } from "astro:middleware";
import grotesk from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
import instrument from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";
import habillage from "./back-office.css?raw";
import jetonsDuTheme from "../styles/tokens.css?raw";

const jetons = jetonsDuTheme
  // Une regle `.dark <descendant> { ... }` n'est pas un jeton : elle saute.
  .replace(/(^|\n)\.dark\s+[^\s{][^{]*\{[^}]*\}/g, "$1")
  .replace(/@theme(?:\s+inline)?\s*\{/g, ":root {")
  .replace(/\.dark\b/g, '[data-mode="dark"]');

const polices = `
@font-face { font-family: "Space Grotesk Variable"; font-style: normal; font-display: swap; font-weight: 300 700; src: url(${grotesk}) format("woff2-variations"); }
@font-face { font-family: "Instrument Sans Variable"; font-style: normal; font-display: swap; font-weight: 400 700; src: url(${instrument}) format("woff2-variations"); }`;

const FEUILLE = `<style data-aloha-back-office>${polices}\n${jetons}\n${habillage}</style>`;

export const onRequest = defineMiddleware(async (context, next) => {
  const reponse = await next();
  if (!context.url.pathname.startsWith("/_emdash/admin")) return reponse;
  if (!(reponse.headers.get("content-type") ?? "").includes("text/html")) return reponse;
  const html = await reponse.text();
  return new Response(html.replace("</head>", `${FEUILLE}</head>`), {
    status: reponse.status,
    headers: reponse.headers,
  });
});
