// src/moteur/habillage.ts - pose les jetons du site et l'habillage dans la page du back office, sans toucher au paquet du moteur.
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
// cote (commentaires retires, pont des polices, feuille du site retiree).
import { defineMiddleware } from "astro:middleware";
import { sansLaFeuilleDuSite } from "./feuille";
import { FEUILLES, JETONS, MARQUE_DU_SITE, POLICES } from "./habillage.site";

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

export const onRequest = defineMiddleware(async (context, next) => {
  const reponse = await next();
  if (!context.url.pathname.startsWith("/_emdash/admin")) return reponse;
  if (!(reponse.headers.get("content-type") ?? "").includes("text/html")) return reponse;
  const html = await reponse.text();
  // La feuille du site sort d'abord (voir feuille.ts), l'habillage entre ensuite.
  return new Response(sansLaFeuilleDuSite(html, MARQUE_DU_SITE).replace("</head>", `${FEUILLE}</head>`), {
    status: reponse.status,
    headers: reponse.headers,
  });
});
