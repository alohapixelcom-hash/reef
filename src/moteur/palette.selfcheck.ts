// src/moteur/palette.selfcheck.ts - self-check de la couleur de la marque (generique) : chaque nom dit sa teinte, la remontee d'une rotation est juste, et une recette qui ment est vue.
import assert from "node:assert/strict";
import { COULEURS, couleursQuiMentent, feuilleDeLaPalette, teinteAvantRotation, teinteDe, teinteDuHexa } from "./palette.ts";

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

// Une recette juste ne ment pas ; celle d'avant la 1.3.0 (accent tourne de 250 sans remonter) ment.
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

console.log(`palette.selfcheck : ${checks} verifications passees.`);
