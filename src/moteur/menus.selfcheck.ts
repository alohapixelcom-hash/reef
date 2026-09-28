// src/moteur/menus.selfcheck.ts - self-check des menus natifs : la graine porte exactement les liens que les fichiers affichent (libelles des dictionnaires, adresses de navData), dans les deux langues.
// Lancer : node src/moteur/menus.selfcheck.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { ACTIONS, menusDeLaGraine, PRINCIPAL, TIROIR } from "./menus.ts";

register("./resolution.node.mjs", import.meta.url);
// L'adaptateur du theme lit ses fichiers par des alias : il se charge apres le crochet.
const { COLONNES_DU_PIED, MENUS, routesDesMenus } = await import("./theme.ts");
const { getFooterData, getNavData, getSiteRoutes } = await import("../config/navData.json.ts");
const { useTranslations } = await import("../i18n/index.ts");

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

const graine = JSON.parse(readFileSync(new URL("../../seed/seed.json", import.meta.url), "utf8")) as { menus: unknown[] };
const lire = (t: unknown) => (chemin: string): string => chemin.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], t) as string;

// 1. La graine est exactement la table, calculee depuis les fichiers.
const attendus = (["en", "fr"] as const).flatMap((l) => menusDeLaGraine(MENUS, l, "en", lire(useTranslations(l)), routesDesMenus(l)));
is(graine.menus, attendus, "les menus de la graine egalent la table, dans les deux langues");

// 2. La table dit la meme chose que ce que la barre et le pied des fichiers affichent.
for (const l of ["en", "fr"] as const) {
  const t = useTranslations(l);
  const routes = getSiteRoutes(l);
  const menu = (nom: string) => attendus.find((m) => m.name === nom && m.locale === l)!;
  const liens = (nom: string) => menu(nom).items.map((i) => ({ text: i.label, href: i.url }));
  is(liens(PRINCIPAL), getNavData(l), `menu principal = navData en ${l}`);
  is(liens(TIROIR), [{ text: t.nav.authors, href: routes.authors }, { text: t.nav.search, href: routes.search }], `tiroir = les deux liens ajoutes en ${l}`);
  is(menu(ACTIONS).items.map((i) => [i.label, i.url, i.cssClasses ?? null]), [[t.nav.subscribe, "#newsletter", "bouton"]], `bouton S'abonner de l'en-tete en ${l}`);
  const colonnes = getFooterData(l);
  COLONNES_DU_PIED.forEach((nom, rang) => {
    is({ title: menu(nom).label, links: liens(nom) }, colonnes[rang], `colonne ${nom} = pied de navData en ${l}`);
  });
}
is(MENUS.length, 6, "six menus");

console.log(`menus.selfcheck : ${checks} verifications passees, ${MENUS.length} menus, 2 langues`);
