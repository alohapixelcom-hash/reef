// src/moteur/langue-bo.ts - donne au back office la langue par defaut du site (ALOHA_BO_LANGUE), par le cookie de langue du moteur lui-meme.
//
// POURQUOI UN MIDDLEWARE ET PAS UNE OPTION : EmDash 0.38 n'a pas d'option
// `admin.locale`. Sa page d'administration choisit sa langue a chaque requete
// (cookie `emdash-locale`, puis Accept-Language, puis l'anglais), et ce cookie
// est son contrat public : c'est celui que pose son propre selecteur de langue.
// Quand la requete n'en porte pas, on le lui ajoute, et on le pose dans la
// reponse pour les suivantes. Aucun texte n'est remplace dans la page : le
// francais affiche est celui du catalogue du moteur.
//
// La personne garde la main : des qu'elle choisit une langue dans ses reglages,
// son cookie existe et ce fichier ne fait plus rien. moteur.config.mjs ne
// l'enregistre que si la variable est posee.
import { defineMiddleware } from "astro:middleware";
import { avecLeCookie, cookieDeLangue, poserLeCookie } from "./langue-bo.regles";

export const onRequest = defineMiddleware(async (context, next) => {
  const langue = __ALOHA_BO_LANGUE__;
  if (langue === null || context.request.method !== "GET") return next();
  if (!context.url.pathname.startsWith("/_emdash/admin")) return next();
  const cookies = context.request.headers.get("cookie");
  if (cookieDeLangue(cookies) !== null) return next();

  // La meme requete, avec le cookie en plus : la page d'administration le lit
  // comme s'il venait du navigateur.
  const entetes = new Headers(context.request.headers);
  entetes.set("cookie", avecLeCookie(cookies, langue));
  const reponse = await next(new Request(context.request, { headers: entetes }));
  reponse.headers.append("Set-Cookie", poserLeCookie(langue, context.url.protocol === "https:"));
  return reponse;
});
