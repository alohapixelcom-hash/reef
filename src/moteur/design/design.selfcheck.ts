// src/moteur/design/design.selfcheck.ts - self-check de la page Design : les listes fermees, la feuille (vide pour Standard, un cran sinon), le controle des jetons, et, dans un site, ses feuilles face aux jetons de la maison.
// Lancer : node --experimental-strip-types src/moteur/design/design.selfcheck.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { CHAMPS_DU_DESIGN, CHOIX_DE_RAYON, CHOIX_DE_TAILLE, designDuTheme, feuilleDuDesign, JETONS_DE_LA_MAISON, jetonsInfideles, type JetonsDuDesign, multiplier, RAYON_D_ORIGINE, RAYONS, TAILLES_DES_TITRES, TAILLES_DU_TEXTE } from "./echelles.ts";

let checks = 0;
const ok = (v: unknown, m: string) => {
  assert.ok(v, m);
  checks += 1;
};
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

// --- Les listes ---------------------------------------------------------------
is(CHOIX_DE_TAILLE, ["Standard", "Compacte", "Généreuse"], "Standard d'abord, puis les deux crans");
is(CHOIX_DE_RAYON, [RAYON_D_ORIGINE, "Net", "Doux", "Arrondi"], "le rayon d'origine d'abord");
is([TAILLES_DES_TITRES.Standard, TAILLES_DU_TEXTE.Standard], [1, 1], "Standard ne change rien");
ok(TAILLES_DES_TITRES.Compacte < 1 && TAILLES_DES_TITRES["Généreuse"] > 1, "les crans des titres encadrent l'origine");
ok(16 * TAILLES_DU_TEXTE.Compacte >= 15, "le texte compact garde 15 px au moins sur une racine de 16 px");
ok(Object.values(RAYONS).every((r) => Number.parseFloat(r.petit) < Number.parseFloat(r.grand)), "un panneau est toujours plus arrondi qu'une carte");
is(CHAMPS_DU_DESIGN, ["h1_size", "h2_size", "h3_size", "text_size", "radius"], "cinq champs : H1, H2, H3, texte, rayon");

// --- Vide, Standard ou inconnu : aucune feuille --------------------------------
is(feuilleDuDesign(null), null, "aucune entree : le rendu d'origine");
is(feuilleDuDesign({}), null, "entree vide : le rendu d'origine");
is(feuilleDuDesign({ h1_size: "Standard", h2_size: "Standard", h3_size: "Standard", text_size: "Standard", radius: RAYON_D_ORIGINE }), null, "tout en Standard : aucune balise");
is(feuilleDuDesign({ h1_size: "Énorme", radius: "Pointu", text_size: 18 }), null, "une valeur inconnue vaut vide, jamais une page cassee");
ok(designDuTheme({ radius: "" }), "un rayon vide garde le theme");
ok(!designDuTheme({ radius: "Net" }), "un rayon choisi change le theme");

// --- Une feuille par choix ------------------------------------------------------
is(multiplier(" clamp(1rem, 2vw, 3rem) ", 1.125), "calc(clamp(1rem, 2vw, 3rem) * 1.125)", "la valeur d'origine garde son clamp, multipliee");
is(feuilleDuDesign({ h1_size: "Généreuse" }), "h1{zoom:1.16}", "H1 genereux : la balise H1 seule");
const tout = feuilleDuDesign({ h1_size: "Compacte", h2_size: "Généreuse", h3_size: "Standard", text_size: "Généreuse", radius: "Net" })!;
is(tout, ":root{--radius-card:0.25rem;--radius-panel:0.5rem}html{font-size:calc(clamp(1rem, 0.95rem + 0.25vw, 1.125rem) * 1.125)}h1{zoom:0.86}h2{zoom:1.16}", "rayons, racine, puis un cran par balise");
ok(!tout.includes("h3"), "H3 Standard : sa balise n'est pas ecrite");
is(feuilleDuDesign({ text_size: "Compacte" }, { ...JETONS_DE_LA_MAISON, racine: null }), "html{font-size:calc(100% * 0.9375)}", "un theme sans racine part de la taille du navigateur");
is(feuilleDuDesign({ radius: "Arrondi" }, { racine: null, rayons: { "--radius-box": "petit" } }), ":root{--radius-box:1.5rem}", "un theme qui declare ses propres rayons");
ok(!/[<>]/.test(tout), "la feuille ne peut pas fermer la balise style");
ok(!tout.includes("--radius-pill"), "les boutons restent des pilules");

// --- Le controle des jetons ----------------------------------------------------
const TOKENS = "@theme {\n  --radius-card: 0.875rem;\n  --radius-panel: 1.25rem;\n}\n@theme inline {\n  --color-background: var(--x);\n}";
const GLOBALE = "@layer base {\n  html {\n    scroll-behavior: smooth;\n    font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);\n  }\n}";
is(jetonsInfideles(JETONS_DE_LA_MAISON, TOKENS, GLOBALE), [], "des feuilles fideles ne remontent rien");
is(jetonsInfideles(JETONS_DE_LA_MAISON, TOKENS, GLOBALE.replace("0.95rem", "1vw")).length, 1, "une racine qui a change est relevee");
is(jetonsInfideles(JETONS_DE_LA_MAISON, TOKENS.replace("--radius-panel", "--radius-plaque"), GLOBALE).length, 1, "un rayon absent est releve");
is(jetonsInfideles(JETONS_DE_LA_MAISON, TOKENS.replace("@theme {", "@theme inline {"), GLOBALE).length, 2, "un rayon en @theme inline est releve");
is(jetonsInfideles({ racine: null, rayons: {} }, "", ""), [], "un theme sans racine ni rayon n'a rien a prouver");

// --- Dans un site : ses feuilles face aux jetons qu'il declare ou a ceux de la maison
const themeDuSite = new URL("../theme.ts", import.meta.url);
const tokensDuSite = new URL("../../styles/tokens.css", import.meta.url);
const globaleDuSite = new URL("../../styles/global.css", import.meta.url);
if (existsSync(themeDuSite) && existsSync(tokensDuSite) && existsSync(globaleDuSite)) {
  // Les alias de tsconfig.json (theme.ts importe "@config/...") : le crochet du moteur.
  if (existsSync(new URL("../resolution.node.mjs", import.meta.url))) register("../resolution.node.mjs", import.meta.url);
  const theme = (await import(themeDuSite.href)) as { JETONS_DU_DESIGN?: JetonsDuDesign };
  const jetons = theme.JETONS_DU_DESIGN ?? JETONS_DE_LA_MAISON;
  const ecarts = jetonsInfideles(jetons, readFileSync(tokensDuSite, "utf8"), readFileSync(globaleDuSite, "utf8"));
  is(ecarts, [], `les jetons de la page Design disent la verite des feuilles du site :\n${ecarts.join("\n")}\n(un theme qui s'ecarte de la maison declare JETONS_DU_DESIGN dans theme.ts)`);
}

console.log(`design.selfcheck : ${checks} verifications passees`);
