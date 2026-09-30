// src/moteur/logo-sombre.selfcheck.ts - self-check du logo pour le mode sombre (generique) : un champ vide ne change rien, une image de la mediatheque donne son adresse.
// Lancer : node src/moteur/logo-sombre.selfcheck.ts
import assert from "node:assert/strict";
import { identite, type Cadre, type RepliDuSite } from "./cadre.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};
const repli: RepliDuSite = { nom: "Onda", description: "d", image: { src: "/og.jpg", alt: "a" }, email: "a@b.fr", credit: "Onda", twitter: "" };
const page = (site: Record<string, unknown>, logo?: string) => ({
  locals: { cadre: { reglages: logo ? { logo: { url: logo } } : {}, site, menus: new Map() } as unknown as Cadre },
});

// 1. Moteur eteint, ou champ vide : aucun logo sombre, le rendu du theme.
is(identite({}, repli).logoSombre, null, "moteur eteint : aucun logo sombre");
is(identite(page({}), repli).logoSombre, null, "champ absent : aucun logo sombre");
is(identite(page({ logo_dark: null }), repli).logoSombre, null, "champ vide : aucun logo sombre");
is(identite(page({ logo_dark: { id: "x" } }), repli).logoSombre, null, "une image sans fichier ne donne rien");

// 2. Une image de la mediatheque (EmDash 0.38 la range sans adresse, avec meta.storageKey).
const choisi = identite(page({ logo_dark: { id: "m1", alt: "Onda", width: 240, height: 60, meta: { storageKey: "01ABC.png" } } }, "/logo.png"), repli);
is(choisi.logoSombre, { url: "/_emdash/api/media/file/01ABC.png", alt: "Onda", width: 240, height: 60 }, "l'adresse du fichier se deduit de la cle");
is(choisi.logo?.url, "/logo.png", "le logo des reglages reste celui du mode clair");
is(identite(page({ logo_dark: { src: "https://cdn.exemple.fr/l.svg" } }), repli).logoSombre?.url, "https://cdn.exemple.fr/l.svg", "une adresse deja posee est gardee");

console.log(`logo-sombre.selfcheck : ${checks} verifications passees`);
