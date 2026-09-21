// src/moteur/habillage.ts - pose les jetons du theme et l'habillage dans la page du back office, sans toucher au paquet du moteur.
//
// POURQUOI UN MIDDLEWARE : la page du back office appartient a EmDash. La
// copier pour la restyler, c'est heriter de chacune de ses mises a jour a la
// main. Ici on laisse passer sa reponse et on y ajoute une feuille de style,
// rien d'autre : le moteur se met a jour sans nous.
//
// Les jetons viennent de tokens.css LUI-MEME, relu tel quel : `@theme` devient
// `:root` (le back office n'a pas le Tailwind du theme) et `.dark` devient le
// data-mode du back office. Aucune couleur n'est recopiee ici.
import { defineMiddleware } from "astro:middleware";
import grotesk from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
import instrument from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";
import habillage from "./back-office.css?raw";
import jetonsDuTheme from "../styles/tokens.css?raw";

const jetons = jetonsDuTheme
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
