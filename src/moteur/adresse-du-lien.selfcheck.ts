// src/moteur/adresse-du-lien.selfcheck.ts - self-check des adresses saisies par un editeur (generique) : bouton corrige ou refuse, lien de menu dans la langue du menu, meme regle a la saisie qu'au rendu.
// Lancer : node src/moteur/adresse-du-lien.selfcheck.ts
import assert from "node:assert/strict";
import { adresseDuLien, cheminDansLaLangue, liensDuMenu, type Cadre } from "./cadre.ts";
import { scriptDesAdresses } from "./textes-edition.ts";

let checks = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  checks += 1;
};
const adresse = (s: string) => adresseDuLien(s).adresse;

// 1. L'adresse d'un bouton.
is(adresse("www.exemple.fr"), "https://www.exemple.fr", "un domaine recoit https:// (le cas du testeur : /fr/www.exemple.fr)");
is(adresse("exemple.fr/tarifs"), "https://exemple.fr/tarifs", "un domaine avec un chemin");
is(adresse("contact"), "/contact", "un mot sans point est une page du site");
is(adresse("tarifs.html"), "/tarifs.html", "un fichier du site n'est pas un domaine");
is(adresse("bonjour@exemple.fr"), "mailto:bonjour@exemple.fr", "une adresse de courriel");
for (const garde of ["/contact/", "#how", "?q=1", "https://a.fr", "http://a.fr", "mailto:a@b.fr", "tel:+33600000000"]) {
  is(adreseGardee(garde), true, `${garde} est garde tel quel`);
}
is(adresseDuLien("mon site").refus, "espace", "une espace refuse l'adresse");
is(adresseDuLien("javascript:alert(1)").refus, "protocole", "un autre protocole est refuse");
is(adresseDuLien("  ").refus, "vide", "vide : l'adresse du theme");
is(adresseDuLien("www.exemple.fr").corrigee, true, "la correction est signalee");

function adreseGardee(s: string): boolean {
  const lue = adresseDuLien(s);
  return lue.adresse === s && !lue.corrigee;
}

// 2. La meme regle a la saisie : le script des pastilles recopie la fonction, et la recopie donne le meme resultat.
const recopiee = new Function(`return (${adresseDuLien.toString()});`)() as typeof adresseDuLien;
for (const s of ["www.exemple.fr", "contact", "/a/", "mon site", "a@b.fr", "javascript:x"]) is(recopiee(s), adresseDuLien(s), `recopie fidele pour ${s}`);
is(scriptDesAdresses(adresseDuLien.toString(), { adresseCorrigee: "a", adresseRefusee: "b" }).includes("data-aloha-adresse"), true, "le script vise les pastilles d'adresse");

// 3. Le lien d'un menu francais sans /fr/ menait a la page anglaise.
is(cheminDansLaLangue("/contact", "fr"), "/fr/contact", "chemin interne : /fr devant");
is(cheminDansLaLangue("/", "fr"), "/fr/", "l'accueil");
is(cheminDansLaLangue("/#faq", "fr"), "/fr/#faq", "une ancre de l'accueil");
for (const garde of ["/fr/about/", "/fr", "/llms.txt", "/_emdash/admin", "https://x.fr", "#newsletter", "//cdn.x.fr/a"]) {
  is(cheminDansLaLangue(garde, "fr"), garde, `${garde} reste tel quel`);
}
is(cheminDansLaLangue("/contact", "en"), "/contact", "la langue par defaut n'a pas de prefixe");
const cadre: Cadre = { menus: new Map([["principal", { name: "principal", label: "x", locale: "fr", items: [{ label: "Nos horaires", url: "/nos-horaires", children: [] }] }]]) };
is(liensDuMenu({ locals: { cadre } }, "principal", "fr", []), [{ text: "Nos horaires", href: "/fr/nos-horaires" }], "le menu francais rend /fr/nos-horaires");
is(liensDuMenu({ locals: { cadre } }, "principal", "fr", [], "fr"), [{ text: "Nos horaires", href: "/nos-horaires" }], "un site francais a la racine : son menu francais garde /nos-horaires (univers 3.8.2)");
is(cheminDansLaLangue("/contact/", "en-us", "fr"), "/en-us/contact/", "sur ce site, l'anglais recoit /en-us");

console.log(`adresse-du-lien.selfcheck : ${checks} verifications passees`);
