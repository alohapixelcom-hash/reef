// src/moteur/typographie.selfcheck.ts - self-check de la police du site (generique) : liste fermee, origine sans feuille, feuille qui ne nomme que les jetons du theme, aucune police a telecharger.
import assert from "node:assert/strict";
import { CHOIX_DE_POLICE, POLICE_D_ORIGINE, POLICES, feuilleDeLaTypographie, policeDe, policesDuTheme } from "./typographie.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};

const variables = { texte: ["--font-sans"], titre: ["--font-display"] };

is(CHOIX_DE_POLICE[0], POLICE_D_ORIGINE, "l'origine est le premier choix");
is(CHOIX_DE_POLICE.length, Object.keys(POLICES).length + 1, "l'origine plus chaque police");
is(new Set(CHOIX_DE_POLICE).size, CHOIX_DE_POLICE.length, "aucun choix en double");
is(feuilleDeLaTypographie(undefined, variables), null, "champ vide : aucune feuille");
is(feuilleDeLaTypographie("", variables), null, "chaine vide : aucune feuille");
is(feuilleDeLaTypographie(POLICE_D_ORIGINE, variables), null, "origine : aucune feuille");
is(feuilleDeLaTypographie("Comic Sans", variables), null, "un nom inconnu : aucune feuille");
is(policesDuTheme(undefined), true, "champ vide : les polices du theme restent prechargees");
is(policesDuTheme(POLICE_D_ORIGINE), true, "origine : les polices du theme restent prechargees");

for (const nom of Object.keys(POLICES)) {
  const feuille = feuilleDeLaTypographie(nom, variables);
  is(typeof feuille === "string" && feuille.startsWith(":root{") && feuille.endsWith("}"), true, `${nom} : une regle :root`);
  is(feuille?.includes("--font-sans:") && feuille.includes("--font-display:"), true, `${nom} : les deux jetons du theme`);
  // Une pile du systeme : aucune adresse, aucune regle qui telechargerait un fichier.
  is(/url\(|@import|@font-face|[{}]\s*[{}]/.test(feuille!.slice(6, -1)), false, `${nom} : rien a telecharger`);
  is(/[;{}]/.test(policeDe(nom)!.texte + policeDe(nom)!.titre), false, `${nom} : une pile ne peut pas fermer la regle`);
  is(/(sans-serif|serif)$/.test(policeDe(nom)!.texte) && /(sans-serif|serif)$/.test(policeDe(nom)!.titre), true, `${nom} : une famille generique en dernier recours`);
  is(policesDuTheme(nom), false, `${nom} : les polices du theme ne sont plus prechargees`);
}
is(feuilleDeLaTypographie("Classique, à empattements", { texte: [], titre: [] }), null, "un theme sans jeton : aucune feuille");
is(feuilleDeLaTypographie("Titres classiques, texte sans empattements", variables)?.match(/--font-display:ui-serif/)?.length, 1, "titres a empattements");
is(feuilleDeLaTypographie("Titres classiques, texte sans empattements", variables)?.match(/--font-sans:system-ui/)?.length, 1, "texte sans empattements");

console.log(`typographie.selfcheck : ${checks} verifications`);
