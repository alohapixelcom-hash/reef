// src/moteur/extensions/gestion/gestion.selfcheck.ts - verifie la gestion des listes : CSV, inscriptions suspectes, messages (garde, classement, suppression, reponse), gestes de masse sur les abonnes, journal (recherche, suppression), sur une vraie base SQLite.
import assert from "node:assert/strict";
import type { Base, Message } from "../courriels/noyau/base.ts";
import { SQL_IDEMPOTENT } from "../courriels/noyau/base.ts";
import type { Passage } from "../courriels/noyau/canal.ts";
import { recevoirContact } from "../courriels/noyau/envoi.ts";
import { chercherDesAbonnes, compterLesAbonnes, confirmer, demanderLInscription, gesteSurLesAbonnes, SQL_LETTRE } from "../courriels/noyau/lettre.ts";
import { classer, compterLesMessages, garderLeMessage, identifiants, listeDesMessages, SQL_MESSAGES, supprimerDesMessages } from "../courriels/noyau/messages.ts";
import { reglagesParDefaut } from "../courriels/noyau/regles.ts";
import { EN } from "../courriels/ecrans/textes.en.ts";
import { FR } from "../courriels/ecrans/textes.fr.ts";
import { boiteLocale, sujetDeLaReponse, texteDeLaReponse } from "./boite.ts";
import { pagesDuSite } from "./identite.mjs";
import { chercherDansLeJournal, effacerDuJournal } from "./journal.ts";
import { cellule, csv, localAleatoire, nomDuFichier, suspects } from "./regles.ts";

let n = 0;
const is = (a: unknown, b: unknown, m: string) => {
  assert.deepEqual(a, b, m);
  n++;
};

// Le CSV : point-virgule, guillemets, formules desamorcees, BOM, CRLF.
is(cellule('Il a dit "oui"; puis'), '"Il a dit ""oui""; puis"', "guillemets doubles et point-virgule entre guillemets");
is(cellule("=SOMME(A1)"), "'=SOMME(A1)", "une formule est desamorcee");
is(cellule(null), "", "une valeur absente est vide");
is(csv(["a", "b"], [[1, "x\ny"]]), '﻿a;b\r\n1;"x\ny"\r\n', "BOM, CRLF et saut de ligne cite");
is(nomDuFichier("abonnes", Date.UTC(2026, 8, 30, 23, 30)), "abonnes-2026-10-01.csv", "la date du nom est celle de Paris");

// Les pages du rail.
is(pagesDuSite({ messages: true, lettre: true }).map((p) => p.path), ["/messages", "/abonnes", "/journal"], "un site avec formulaire et lettre a les trois pages");
is(pagesDuSite({ messages: false, lettre: false }).map((p) => p.path), ["/journal"], "un site sans formulaire garde le journal");

// Les inscriptions suspectes.
const H = 3_600_000;
const t = Date.UTC(2026, 8, 30, 12);
is(localAleatoire("xk7q2m9z4w8p@exemple.test"), true, "une suite tiree au hasard est reperee");
is(localAleatoire("camille.durand@exemple.test"), false, "un vrai nom ne l'est pas");
const rafale = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, adresse: `nom${i}@robot.test`, etat: "attente", demande_le: t - 10 * 60_000, confirme_le: null }));
const liste = suspects(
  [
    { id: "a", adresse: "camille@exemple.test", etat: "inscrit", demande_le: t - 100 * H, confirme_le: t - 99 * H },
    { id: "b", adresse: "lent@exemple.test", etat: "attente", demande_le: t - 30 * H, confirme_le: null },
    { id: "c", adresse: "x@yopmail.com", etat: "attente", demande_le: t - H, confirme_le: null },
    { id: "d", adresse: "frais@exemple.test", etat: "attente", demande_le: t - H, confirme_le: null },
    ...rafale,
  ],
  t,
);
is(liste.find((s) => s.abonne.id === "a"), undefined, "un abonne confirme n'est jamais suspect");
is(liste.find((s) => s.abonne.id === "b")?.raisons, ["jamais-confirme"], "jamais confirme depuis plus de 24 heures");
is(liste.find((s) => s.abonne.id === "c")?.raisons, ["jetable"], "domaine jetable");
is(liste.find((s) => s.abonne.id === "d"), undefined, "une attente fraiche n'est pas suspecte");
is(liste.filter((s) => s.raisons.includes("rafale")).length, 10, "dix inscriptions du meme domaine dans l'heure");

// La reponse a un message.
is(sujetDeLaReponse("Devis"), "Re : Devis", "Re : devant le sujet");
is(sujetDeLaReponse("RE: Devis"), "RE: Devis", "sans empiler les Re");
is(texteDeLaReponse("Merci !", { nom: "Camille", recu_le: t, message: "Ligne 1\nLigne 2" }).includes("> Ligne 1\n> Ligne 2"), true, "le message d'origine est cite");
is(identifiants(["a", "a", 3, "", "b"]), ["a", "b"], "identifiants propres, sans doublon");

let sqlite: typeof import("node:sqlite") | null = null;
try {
  sqlite = await import("node:sqlite");
} catch {
  console.log("node:sqlite absent : partie SQL de la gestion ignoree.");
}
if (sqlite) {
  const db = new sqlite.DatabaseSync(":memory:");
  const base: Base = {
    lire: async <T>(sql: string, p: unknown[] = []) => db.prepare(sql).all(...(p as never[])) as T[],
    executer: async (sql: string, p: unknown[] = []) => {
      db.prepare(sql).run(...(p as never[]));
    },
  };
  for (const s of [SQL_IDEMPOTENT, SQL_LETTRE, SQL_MESSAGES]) db.exec(s);
  const schema = () => JSON.stringify(db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all());
  const avant = schema();
  db.exec(SQL_MESSAGES);
  is(schema(), avant, "le SQL des messages se rejoue sans rien changer");

  // Le formulaire garde le message AVANT la notification, meme si elle echoue.
  const partis: { m: Message; p: Passage }[] = [];
  const refuse = async (m: Message, p: Passage) => {
    partis.push({ m, p });
    return { etat: "refuse" as const, id: "j1", code: "SANS_LIAISON" };
  };
  let k = 0;
  const accueil = await recevoirContact(refuse, reglagesParDefaut(), { nom: "Camille", adresse: "camille@exemple.test", sujet: "Devis", message: "Bonjour", piege: "", langue: "fr" }, {
    nom: "Reef",
    langue: "fr",
    catalogues: { fr: FR, en: EN },
    garder: (m) => garderLeMessage(base, { ...m, page: "/contact/" }, t, `m${++k}`),
  });
  is(accueil, "garde", "la notification refusee est gardee au journal");
  is((await listeDesMessages(base, {})).items.map((m) => [m.nom, m.statut, m.page]), [["Camille", "nouveau", "/contact/"]], "le message est garde, non lu, avec sa page");
  await recevoirContact(refuse, reglagesParDefaut(), { nom: "Robot", adresse: "r@x.test", sujet: "", message: "spam", piege: "rempli", langue: "en" }, { nom: "Reef", langue: "fr", catalogues: { fr: FR, en: EN }, garder: (m) => garderLeMessage(base, { ...m, page: null }, t, `m${++k}`) });
  is((await listeDesMessages(base, { filtre: "tous" })).total, 1, "le champ piege ne garde rien");

  // Classement et suppression de masse, au-dela d'un paquet de 90.
  for (let i = 0; i < 150; i++) await garderLeMessage(base, { nom: `Visiteur ${i}`, adresse: `v${i}@exemple.test`, sujet: i % 2 ? "Question" : "Devis 50%", message: "Texte", langue: "fr", page: null }, t + i, `x${i}`);
  is((await listeDesMessages(base, { q: "50%" })).total, 75, "la recherche cherche % tel quel");
  const ids = Array.from({ length: 150 }, (_, i) => `x${i}`);
  is(await classer(base, ids, "archive", t), 150, "150 messages archives d'un geste");
  is((await compterLesMessages(base)).archive, 150, "compteur des archives");
  is((await listeDesMessages(base, {})).total, 1, "la boite ne montre pas les archives");
  is(await classer(base, ids, "archive", t), 0, "reclasser ne change rien");
  is(await supprimerDesMessages(base, ids.slice(0, 120)), 120, "120 messages supprimes d'un geste");
  const page1 = await listeDesMessages(base, { filtre: "tous", limite: 20 });
  is([page1.items.length, page1.suite, page1.total], [20, 20, 31], "pagination par decalage");

  // La boite locale : lire marque lu, repondre passe par le canal.
  const envoye = async (m: Message, p: Passage) => {
    partis.push({ m, p });
    return { etat: "envoye" as const, id: "j2", code: null };
  };
  const boite = boiteLocale(base, envoye, async () => ({ ...reglagesParDefaut(), reponse: "contact@reef.test" }));
  is((await boite.detail("m1"))?.statut, "lu", "ouvrir un message le marque lu");
  is(await boite.nonLus(), 0, "plus de non lu");
  const r = await boite.repondre("m1", "Merci, voici le devis.", "admin@reef.test");
  is([r.ok, partis.at(-1)?.m.a, partis.at(-1)?.m.sujet, partis.at(-1)?.p.plafonner, partis.at(-1)?.p.reponse], [true, ["camille@exemple.test"], "Re : Devis", "mois", "contact@reef.test"], "la reponse part vers le visiteur, repondre a l'adresse du site");
  is((await boite.detail("m1"))?.statut, "repondu", "le message passe en repondu");
  is((await boiteLocale(base, refuse, async () => reglagesParDefaut()).repondre("m1", "Encore", "a")).ok, false, "une reponse refusee le dit");

  // Les abonnes : desinscrire, reinscrire (seulement qui avait confirme), supprimer.
  let a = 0;
  const nouvelId = () => `ab${++a}`;
  const j1 = await demanderLInscription(base, { adresse: "un@exemple.test", langue: "fr", page: "/" }, t, nouvelId);
  await confirmer(base, j1.jeton, t);
  await demanderLInscription(base, { adresse: "deux@exemple.test", langue: "en", page: "/" }, t, nouvelId);
  is(await gesteSurLesAbonnes(base, ["ab1", "ab2"], "desinscrire"), 1, "seul l'abonne confirme se desinscrit");
  is(await compterLesAbonnes(base, t), { inscrits: 0, attente: 1, desinscrits: 1 }, "un desinscrit, une attente");
  is(await gesteSurLesAbonnes(base, ["ab1", "ab2"], "reinscrire"), 1, "seul qui avait confirme se reinscrit");
  is((await chercherDesAbonnes(base, { q: "deux@" }, t)).items.map((x) => x.adresse), ["deux@exemple.test"], "recherche par adresse");
  is(await gesteSurLesAbonnes(base, ["ab1", "ab2", "inconnu"], "supprimer"), 2, "supprimer rend le nombre efface");

  // Le journal : recherche et suppression.
  db.exec("INSERT INTO courriels_journal (id, quand, formulaire, destinataire, sujet, fournisseur, etat) VALUES ('l1', 1, 'contact', 'a@b.test', 'Bonjour', 'cloudflare', 'envoye'), ('l2', 2, 'lettre', 'c@d.test', 'Lettre', 'cloudflare', 'refuse')");
  is((await chercherDansLeJournal(base, { q: "c@d" })).items.map((l) => l.id), ["l2"], "recherche dans le journal");
  is((await chercherDansLeJournal(base, { etat: "envoye" })).total, 1, "filtre par etat");
  is(await effacerDuJournal(base, ["l1", "l2"]), 2, "deux lignes effacees du journal");
}

console.log(`gestion.selfcheck : ${n} verifications passees.`);
