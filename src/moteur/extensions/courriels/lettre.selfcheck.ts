// src/moteur/extensions/courriels/lettre.selfcheck.ts - verifie la lettre d'information sur une vraie base SQLite : double confirmation, desinscription, parution, courriels, vue de l'ecran.
import assert from "node:assert/strict";
import type { Base, Message } from "./noyau/base.ts";
import type { Passage } from "./noyau/canal.ts";
import { abonneDuJeton, accueilDe, ATTENTE_MS, compterLesAbonnes, confirmer, demanderLInscription, desinscrire, jetonValide, liensDeLAbonne, listeDesAbonnes, parutions, SQL_LETTRE } from "./noyau/lettre.ts";
import { courrielDeLArticle, manquesDeLaLettre, publier } from "./noyau/parution.ts";
import { reglagesParDefaut } from "./noyau/regles.ts";
import { ACTIONS, choisir, lireVueDeLaLettre } from "./ecrans/lettre.ts";
import { LETTRE_EN } from "./ecrans/lettre.textes.en.ts";
import { LETTRE_FR } from "./ecrans/lettre.textes.fr.ts";

let n = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  n++;
};

// Les catalogues ont les memes cles.
is(Object.keys(LETTRE_EN).sort(), Object.keys(LETTRE_FR).sort(), "les deux catalogues de la lettre ont les memes cles");

// Ce qui manque, et l'accueil de retour.
is(manquesDeLaLettre(reglagesParDefaut(), false), ["liaison", "expediteur"], "sans liaison ni expediteur, deux manques");
is(manquesDeLaLettre({ ...reglagesParDefaut(), expediteur: "lettre@exemple.test" }, true, false), ["fournisseur"], "liaison sans fournisseur choisi");
is(accueilDe({ collection: "posts", adresse: {}, accueil: { fr: "/fr/" } }, "fr"), "/fr/", "l'accueil de la langue");
is(accueilDe({ collection: "posts", adresse: {}, accueil: { en: "//ailleurs.test" } }, "en"), "/", "une adresse hors du site retombe sur /");

// Le courriel d'un article : echappe, avec les en-tetes de desinscription.
const c = courrielDeLArticle(LETTRE_FR, { id: "a", groupe: "a", slug: "s", langue: "fr", titre: "<b>Titre</b>", resume: "Chapo", publie_le: null }, "https://x.test/fr/blog/s/", "https://x.test/_emdash/courriels/lettre/desinscrire?jeton=j", "Reef");
is(c.html.includes("&lt;b&gt;Titre&lt;/b&gt;"), true, "le titre est echappe dans le HTML");
is(c.entetes["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click", "desinscription en un clic des messageries (RFC 8058)");
is(c.entetes["List-Unsubscribe"], "<https://x.test/_emdash/courriels/lettre/desinscrire?jeton=j>", "le lien personnel dans l'en-tete");
is(c.texte.includes("Se désinscrire : https://x.test/"), true, "le lien personnel dans le texte");

// La page de confirmation de la desinscription : dans la langue, adresse masquee, un bouton POST, echappee.
{
  const { adresseMasquee, CHAMP_CONFIRME, pageDeDesinscription } = await import("./noyau/page-desinscription.ts");
  const html = pageDeDesinscription(LETTRE_FR.desinscription, { langue: "fr", site: "Reef <b>", adresse: "camille@exemple.test", action: "/_emdash/courriels/lettre/desinscrire?jeton=j", accueil: "/fr/" });
  is(adresseMasquee("camille@exemple.test"), "c***@exemple.test", "l'adresse est masquee");
  is([html.includes('lang="fr"'), html.includes("c***@exemple.test"), html.includes("camille@"), html.includes("Reef &lt;b&gt;"), html.includes(`name="${CHAMP_CONFIRME}" value="1"`), html.includes('method="post"'), html.includes("Garder mon abonnement"), html.includes("noindex")], [true, true, false, true, true, true, true, true], "page de confirmation : langue, adresse masquee, nom echappe, bouton POST, garder, noindex");
  is(pageDeDesinscription(LETTRE_EN.desinscription, { langue: "en", site: "Reef", adresse: "a@b.test", action: "/x", accueil: "/" }).includes("Unsubscribe me"), true, "page anglaise");
  is(/[\u2013\u2014]/.test(html), false, "aucun tiret long");
}

// La vue de l'ecran : un libelle retraduit, une valeur inconnue ou "Choisissez..." ne choisit rien.
const vue = lireVueDeLaLettre({ article: null, abonne: null, articles: { "Mon article": "G1" }, abonnes: { "a@b.test": "ab_1" } });
is(choisir(vue, ACTIONS.article, "Mon article").article, "G1", "le titre choisi donne le groupe de l'article");
is(choisir(vue, ACTIONS.article, LETTRE_FR.aucunArticleChoisi).article, null, "la premiere ligne ne choisit rien");
is(choisir(vue, ACTIONS.abonne, "a@b.test").abonne, "ab_1", "l'adresse choisie donne l'abonne");
is(lireVueDeLaLettre("n'importe quoi").article, null, "une vue gardee illisible repart a vide");

let sqlite: typeof import("node:sqlite") | null = null;
try {
  sqlite = await import("node:sqlite");
} catch {
  console.log("node:sqlite absent : partie SQL de la lettre ignoree.");
}
if (sqlite) {
  const db = new sqlite.DatabaseSync(":memory:");
  const base: Base = {
    lire: async <T>(sql: string, p: unknown[] = []) => db.prepare(sql).all(...(p as never[])) as T[],
    executer: async (sql: string, p: unknown[] = []) => {
      db.prepare(sql).run(...(p as never[]));
    },
  };
  db.exec(SQL_LETTRE);
  const schema = () => JSON.stringify(db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all());
  const avant = schema();
  db.exec(SQL_LETTRE);
  is(schema(), avant, "le SQL de la lettre se rejoue sans rien changer");

  let id = 0;
  const nouvelId = () => `ab_${++id}`;
  const t0 = Date.UTC(2026, 8, 29, 12);
  is((await demanderLInscription(base, { adresse: "pas une adresse", langue: "fr", page: "/fr/" }, t0, nouvelId)).etat, "invalide", "une adresse invalide est refusee");
  const d1 = await demanderLInscription(base, { adresse: " Camille@Exemple.test ", langue: "fr", page: "/fr/" }, t0, nouvelId);
  is([d1.etat, jetonValide(d1.jeton)], ["nouveau", true], "une nouvelle inscription recoit un jeton de 64 caracteres");
  const d2 = await demanderLInscription(base, { adresse: "camille@exemple.test", langue: "fr", page: "/fr/" }, t0 + 1000, nouvelId);
  is([d2.etat, d2.jeton], ["attente", d1.jeton], "une seconde demande avant confirmation renvoie le meme lien");
  is(await compterLesAbonnes(base, t0), { inscrits: 0, attente: 1, desinscrits: 0 }, "en attente tant que le lien n'est pas ouvert");
  is((await confirmer(base, "0".repeat(64), t0)).issue, "inconnu", "un jeton faux ne confirme rien");
  is((await confirmer(base, d1.jeton, t0 + 2000)).issue, "confirme", "le lien confirme l'inscription");
  is((await confirmer(base, d1.jeton, t0 + 3000)).issue, "deja", "un second clic ne change rien");
  is((await demanderLInscription(base, { adresse: "camille@exemple.test", langue: "en", page: "/" }, t0 + 4000, nouvelId)).etat, "inscrit", "deja abonne : rien ne repart");

  // Une inscription jamais confirmee est effacee au bout de 7 jours.
  await demanderLInscription(base, { adresse: "robot@exemple.test", langue: "en", page: "/" }, t0, nouvelId);
  is(await compterLesAbonnes(base, t0 + ATTENTE_MS + 1), { inscrits: 1, attente: 0, desinscrits: 0 }, "l'attente de plus de 7 jours est effacee");

  // Une parution : un courriel par abonne confirme, dans sa langue, par le canal.
  db.exec("CREATE TABLE ec_posts (id TEXT, translation_group TEXT, slug TEXT, locale TEXT, title TEXT, description TEXT, status TEXT, deleted_at TEXT, published_at TEXT)");
  db.exec("INSERT INTO ec_posts VALUES ('G1','G1','mon-article','en','My post','Lead','published',NULL,'2026-09-29'),('F1','G1','mon-article','fr','Mon article','Chapo','published',NULL,'2026-09-29')");
  const partis: { m: Message; p: Passage }[] = [];
  const poster = async (m: Message, p: Passage) => {
    partis.push({ m, p });
    return { etat: "envoye" as const, id: `cr_${partis.length}`, code: null };
  };
  const options = { collection: "posts", adresse: { en: "/blog/{slug}/", fr: "/fr/blog/{slug}/" } };
  const bilan = await publier(poster, { base, options, groupe: "G1", origine: "https://x.test", route: "/_emdash/courriels/lettre", site: "Reef", reponse: "", catalogues: { fr: LETTRE_FR, en: LETTRE_EN }, maintenant: t0 + 5000, nouvelId, par: "essai", langue: "fr" });
  is(bilan, { envoyes: 1, refuses: 0, titre: "Mon article" }, "l'article part vers l'abonne confirme");
  is(partis[0]?.m.sujet, "Mon article", "dans la langue de l'abonne");
  is(partis[0]?.m.texte.includes("https://x.test/fr/blog/mon-article/"), true, "avec le lien de l'article dans sa langue");
  is(partis[0]?.p, { origine: "lettre", plafonner: "mois" }, "une parution ne compte que le plafond du mois");
  is((await parutions(base))[0]?.envoyes, 1, "la parution est notee");
  is(await publier(poster, { base, options, groupe: "XX", origine: "https://x.test", route: "/r", site: "Reef", reponse: "", catalogues: { fr: LETTRE_FR, en: LETTRE_EN }, maintenant: t0, nouvelId, par: null, langue: "fr" }), null, "un article qui n'est plus publie ne part pas");

  // La desinscription efface la ligne.
  const jeton = new URL(liensDeLAbonne("https://x.test", "/r", d1.jeton as string).desinscrire).searchParams.get("jeton");
  is((await desinscrire(base, jeton))?.adresse, "camille@exemple.test", "le lien du pied desinscrit");
  is(await abonneDuJeton(base, jeton), null, "la ligne est effacee, pas marquee");
  is((await listeDesAbonnes(base, 10)).length, 0, "plus personne dans la liste");
}

console.log(`lettre.selfcheck : ${n} verifications passees.`);
