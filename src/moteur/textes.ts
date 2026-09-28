// src/moteur/textes.ts - pose les textes rediges de la page sur la requete, pour que chaque composant les lise par useTranslations(Astro), et les proxys d'edition a cote.
//
// POURQUOI PASSER PAR Astro.locals : un composant lit sa copie avec
// useTranslations, et une page en rend une dizaine. Moteur allume, cette
// copie vient de la base (contenu.ts) et se lit une fois par requete, ici,
// dans la page ; les composants la retrouvent sur la requete au lieu de
// relire la base chacun leur tour. Moteur eteint, ce sont les textes des
// fichiers qui sont poses : le rendu ne change pas d'un octet.
//
// LES PROXYS D'EDITION voyagent de la meme facon (Astro.locals.editions) : en
// mode edition, un composant y trouve les attributs que la barre d'EmDash
// cherche (voir annotations.ts, annotationsDe). Hors edition la carte est vide.
// Le CADRE (reglages, entree site, menus) et les donnees brutes des sections
// (photos, liens, blocs masques) voyagent aussi (Astro.locals.cadre,
// .sections), lus par cadre.ts ; moteur eteint, ils sont vides et tout
// retombe sur les fichiers.
import { getLocale, type Locale } from "@i18n";
import { lireLaPage } from "@moteur/source";
import type { AstroGlobal } from "astro";
import type { Textes } from "./contenu";

/** Les textes de la page en cours, lus une fois et poses sur la requete. A appeler dans la page, avant de rendre ses composants. */
export async function textesDeLaPage(Astro: Pick<AstroGlobal, "currentLocale" | "locals">, langue?: Locale): Promise<Textes> {
  const { textes, editions, cadre, sections } = await lireLaPage(langue ?? getLocale(Astro));
  Astro.locals.textes = textes;
  Astro.locals.editions = editions;
  Astro.locals.cadre = cadre;
  Astro.locals.sections = sections;
  return textes;
}
