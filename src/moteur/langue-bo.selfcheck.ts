// src/moteur/langue-bo.selfcheck.ts - self-check des regles de la langue du back office.
// Lancer : node src/moteur/langue-bo.selfcheck.ts
import assert from "node:assert/strict";
import { avecLeCookie, cookieDeLangue, langueDesTextes, langueParDefaut, poserLeCookie } from "./langue-bo.regles.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

const requete = (entetes: Record<string, string>) => new Request("https://exemple.test/_emdash/admin", { headers: entetes });

// ALOHA_BO_LANGUE : un code de langue, ou rien.
is(langueParDefaut(undefined), null, "variable absente : pas de langue par defaut");
is(langueParDefaut(""), null, "variable vide : pas de langue par defaut");
is(langueParDefaut(" fr "), "fr", "les espaces autour du code sont retires");
is(langueParDefaut("pt-BR"), "pt-BR", "un code regional passe tel quel");
is(langueParDefaut("fr; Path=/"), null, "une valeur qui n'est pas un code ne part pas dans un cookie");
is(langueParDefaut("FRANCAIS"), null, "un mot n'est pas un code");

// Le cookie du moteur.
is(cookieDeLangue(null), null, "sans entete, pas de cookie");
is(cookieDeLangue("session=abc; emdash-locale=de"), "de", "le cookie se lit parmi les autres");
is(cookieDeLangue("xemdash-locale=de"), null, "un autre cookie au nom voisin n'est pas lu");
is(cookieDeLangue("emdash-locale="), null, "un cookie vide ne compte pas");
is(avecLeCookie(null, "fr"), "emdash-locale=fr", "sans cookie, l'entete ne porte que la langue");
is(avecLeCookie("session=abc", "fr"), "session=abc; emdash-locale=fr", "les autres cookies sont gardes");
is(
  poserLeCookie("fr", true),
  "emdash-locale=fr; Path=/_emdash; SameSite=Lax; Max-Age=31536000; Secure",
  "le Set-Cookie est celui du selecteur de langue du moteur",
);
is(poserLeCookie("fr", false).endsWith("Max-Age=31536000"), true, "en http local, pas de Secure");

// Le dictionnaire du theme : le choix de la personne, puis le site, puis le navigateur.
is(langueDesTextes(requete({}), null), "en", "sans rien, l'anglais");
is(langueDesTextes(requete({ "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" }), null), "fr", "un navigateur francais lit le francais");
is(langueDesTextes(requete({ "accept-language": "en;q=0.4, fr-CA;q=0.9" }), null), "fr", "le poids le plus fort gagne");
is(langueDesTextes(requete({ "accept-language": "de-DE,de;q=0.9" }), null), "en", "une langue sans dictionnaire lit l'anglais");
is(langueDesTextes(requete({ "accept-language": "en-US" }), "fr"), "fr", "la langue du site passe devant le navigateur");
is(langueDesTextes(requete({ cookie: "emdash-locale=en", "accept-language": "fr" }), "fr"), "en", "le choix de la personne passe devant tout");
is(langueDesTextes(requete({ cookie: "emdash-locale=fr" }), null), "fr", "le cookie seul suffit");

console.log(`langue-bo.selfcheck: ${checks} verifications passees`);
