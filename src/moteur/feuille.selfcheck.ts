// src/moteur/feuille.selfcheck.ts - self-check du tri de la feuille de style du back office.
// Lancer : node src/moteur/feuille.selfcheck.ts (la marque de Kai sert d'exemple).
import assert from "node:assert/strict";
import { reglesDuMoteur, sansLaFeuilleDuSite } from "./feuille.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

const chargement = "#emdash-boot-loader[data-astro-cid-x]{display:flex}";
const rotation = "@keyframes emdash-spin{to{transform:rotate(360deg)}}";
const site = ":root{--kai-background:white}.hidden{display:none}@media (min-width:40rem){.md\\:flex{display:flex}}";

is(reglesDuMoteur(chargement + site + rotation), chargement + rotation, "les regles du moteur restent, celles du site partent");
is(reglesDuMoteur(site), "", "une feuille sans regle du moteur se vide");
is(reglesDuMoteur(""), "", "une feuille vide reste vide");
is(
  reglesDuMoteur("@layer theme,base;" + chargement),
  chargement,
  "une declaration de calques posee devant une regle gardee ne la suit pas",
);
is(
  reglesDuMoteur('.a::after{content:"}"}' + chargement + ".b{background:url('data:x,{')}"),
  chargement,
  "une accolade dans une chaine ne ferme ni n'ouvre une regle",
);
is(
  reglesDuMoteur("@media (min-width:40rem){#emdash-boot-loader{display:none}}"),
  "",
  "seul l'en-tete de premier niveau compte : une regle du moteur dans un @media du site part avec lui",
);

const page = `<head><style>@font-face{font-family:"Noto"}</style><style>${chargement}${site}</style><style data-aloha-back-office>:root{--kai-background:black}</style></head>`;
is(
  sansLaFeuilleDuSite(page, "--kai-background"),
  `<head><style>@font-face{font-family:"Noto"}</style><style>${chargement}</style><style data-aloha-back-office>:root{--kai-background:black}</style></head>`,
  "seule la feuille du site est triee : ni les polices du moteur, ni l'habillage",
);
is(sansLaFeuilleDuSite("<p>rien</p>", "--kai-background"), "<p>rien</p>", "une page sans feuille est rendue telle quelle");
is(sansLaFeuilleDuSite(page, ""), page, "sans marque, rien n'est trie");

console.log(`feuille.selfcheck : ${checks} verifications passees`);
