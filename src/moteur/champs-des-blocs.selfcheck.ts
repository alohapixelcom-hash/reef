// src/moteur/champs-des-blocs.selfcheck.ts - self-check de la carte des champs de chaque bloc (generique, socle 1.7.0) : un bloc absent garde tout, un bloc connu ne garde que ses champs, une carte fausse est dite.
// Lancer : node src/moteur/champs-des-blocs.selfcheck.ts
import assert from "node:assert/strict";
import { champsCaches, defautsDeLaCarte, type ChampsDesBlocs } from "./champs-des-blocs.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};
const graine = {
  collections: [
    {
      slug: "sections",
      fields: [
        { slug: "image", type: "image" },
        { slug: "video", type: "string" },
        { slug: "video_poster", type: "image" },
        { slug: "arguments", type: "repeater", validation: { subFields: [{ slug: "image", label: "Photo (vide : celle du thème)", type: "image" }] } },
      ],
    },
  ],
};
const carte: ChampsDesBlocs = {
  surveilles: ["image", "video", "video_poster", "arguments.image"],
  libelles: { "arguments.image": "Photo (vide : celle du thème)" },
  blocs: { hero: ["image"], film: ["video", "video_poster"], faq: [] },
};

// 1. Ce que l'ecran cache.
is(champsCaches(carte, "hero"), ["video", "video_poster", "arguments.image"], "le bandeau garde sa photo seulement");
is(champsCaches(carte, "film"), ["image", "arguments.image"], "le film garde sa video et son image d'attente");
is(champsCaches(carte, "faq"), ["image", "video", "video_poster", "arguments.image"], "un bloc sans media les cache tous");
is(champsCaches(carte, "bloc-ajoute"), [], "un bloc absent de la carte garde tous ses champs");
is(champsCaches(null, "hero"), [], "un site sans carte garde tous ses champs");

// 2. La carte au regard de la graine.
is(defautsDeLaCarte(carte, graine), [], "une carte juste n'a aucun defaut");
is(defautsDeLaCarte({ ...carte, surveilles: [...carte.surveilles, "galerie"] }, graine), ["galerie : absent de la collection sections"], "un champ inconnu est dit");
is(defautsDeLaCarte({ ...carte, libelles: { "arguments.image": "Photo" } }, graine).length, 1, "un libelle faux est dit (l'ecran ne trouverait pas le champ)");
is(defautsDeLaCarte({ ...carte, blocs: { hero: ["cta"] } }, graine), ["hero : cta n'est pas un champ surveille"], "un bloc qui cite un champ non surveille est dit");

console.log(`champs-des-blocs.selfcheck : ${checks} verifications passees`);
