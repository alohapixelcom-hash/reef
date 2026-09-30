// src/moteur/palette.selfcheck.ts - self-check de la couleur de la marque (generique) : chaque nom dit sa teinte, la remontee d'une rotation est juste, et une recette qui ment est vue.
import assert from "node:assert/strict";
import { CHOIX_DE_COULEUR, COULEUR_D_ORIGINE, COULEURS, contraste, couleursIllisibles, couleursQuiMentent, feuilleDeLaPalette, garantirLeContraste, teinteAvantRotation, teinteDe, teinteDuHexa } from "./palette.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

// Chaque nom tombe dans la bonne region de la roue (bleus 190-250, vert 120-170, rouge 330-360, orange 15-40).
const regions: Record<string, [number, number]> = {
  "Bleu océan": [190, 225],
  "Bleu nuit": [215, 250],
  "Vert émeraude": [135, 170],
  "Rouge framboise": [330, 359],
  "Orange soleil": [15, 40],
};
for (const [nom, [min, max]] of Object.entries(regions)) {
  const t = teinteDe(nom)!;
  is(t >= min && t <= max, true, `${nom} (${t}) n'est pas dans ${min}-${max}`);
}
is(Object.keys(COULEURS).sort(), Object.keys(regions).sort(), "chaque couleur a sa region");
is(teinteDe("Violet"), null, "un nom inconnu ne donne rien");
is(teinteDe(undefined), null, "une valeur vide ne donne rien");

// La remontee d'une rotation : la rampe tournee retombe sur la teinte visible.
is(teinteAvantRotation(208, 250), 318, "Swell : 208 visible, accent 318");
is((teinteAvantRotation(25, 192) + 192) % 360, 25, "une rotation remontee puis redescendue");
is(teinteDuHexa("#0000ff"), 240, "bleu pur");
is(teinteDuHexa("#ff0000"), 0, "rouge pur");
is(teinteDuHexa("#808080"), null, "un gris n'a pas de teinte");

// Une recette juste ne ment pas ; un accent tourne de 250 sans remonter ment.
const hexa = (h: number) => {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
is(couleursQuiMentent((t) => ({ "--visible": hexa(t) }), "--visible"), [], "une recette qui pose la teinte recue ne ment pas");
is(couleursQuiMentent((t) => ({ "--visible": hexa((t + 250) % 360) }), "--visible").length, 5, "une rotation oubliee est vue");
is(feuilleDeLaPalette("", () => ({})), null, "vide : aucune feuille");
is(feuilleDeLaPalette("Bleu océan", (t) => ({ "--x": String(t) })), ":root{--x:208}", "la feuille porte la teinte nommee");

// La couleur d'origine : premier choix de la liste, sans feuille.
is(CHOIX_DE_COULEUR[0], COULEUR_D_ORIGINE, "la couleur d'origine vient en premier");
is(CHOIX_DE_COULEUR.length, Object.keys(COULEURS).length + 1, "l'origine plus les cinq couleurs");
is(teinteDe(COULEUR_D_ORIGINE), null, "la couleur d'origine ne donne aucune teinte");
is(feuilleDeLaPalette(COULEUR_D_ORIGINE, (t) => ({ "--x": String(t) })), null, "la couleur d'origine : aucune feuille, la palette du theme");

// Le contraste des boutons : WCAG, puis la garantie.
is(Math.round(contraste("#ffffff", "#000000") * 100) / 100, 21, "blanc sur noir : 21");
is(Math.round(contraste("#23f6af", "#ffffff") * 100) / 100, 1.41, "le vert emeraude du testeur sous du blanc : 1,41");
const recette = (t: number) => ({ "--b-400": hexa(t), "--b-600": hexa(t), "--b-700": hexa(t), "--b-300": hexa(t), "--n-950": "#0a0a0f" });
const regles = [{ fond: "--b-600", encre: "#ffffff" }, { fond: "--b-400", encre: "--n-950" }];
is(couleursIllisibles(recette, regles).length > 0, true, "une recette sans garantie laisse des boutons illisibles");
const garantie = (t: number) => garantirLeContraste(recette(t), regles);
is(couleursIllisibles(garantie, regles), [], "avec la garantie, chaque couleur se lit a 4,5:1 au moins");
for (const nom of Object.keys(COULEURS) as (keyof typeof COULEURS)[]) {
  const v = garantie(COULEURS[nom]);
  const ecart = Math.abs((teinteDuHexa(v["--b-600"]!) ?? -99) - COULEURS[nom]);
  is(Math.min(ecart, 360 - ecart) <= 3, true, `${nom} : la garantie garde la teinte`);
  is(contraste(v["--b-700"]!, "#ffffff") >= contraste(v["--b-600"]!, "#ffffff"), true, `${nom} : le palier 700 reste plus sombre que le 600`);
}
const deja = { "--b-600": "#3b0764", "--b-400": "#f5f5f5", "--n-950": "#0a0a0f" };
is(garantirLeContraste(deja, regles), deja, "une couleur qui se lit deja n'est pas touchee");

console.log(`palette.selfcheck : ${checks} verifications passees.`);
