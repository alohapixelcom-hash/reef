// src/moteur/extensions/courriels/courriels.selfcheck.ts - self-check de l'extension Courriels : plafonds, masquage, compteur du mois, SQL idempotent, canal d'EmDash (fournisseur et journal), renvoi, DNS, absence d'adresse en dur.
// Lancer : node --experimental-strip-types src/moteur/extensions/courriels/courriels.selfcheck.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bilanDuCycle, echecsEnAttente, lignes, preparer, SQL_IDEMPOTENT, type Base } from "./noyau/base.ts";
import { analyser, interroger, valeursDe } from "./noyau/dns.ts";
import { type Canal, type Evenement, fournisseur, journaliste, poster } from "./noyau/canal.ts";
import { type Contexte, erreurEnClair, essai, manques, recevoirContact, renvoyer } from "./noyau/envoi.ts";
import { cheminDeRetour, debutDuCycle, origineDeLaSource, finDuCycle, langueDeLaRequete, lireReglages, masquer, plafondAtteint, reglagesParDefaut, type Reglages } from "./noyau/regles.ts";
import { appliquer, rangee, VUE_PAR_DEFAUT } from "./ecrans/journal.ts";
import { carte } from "./ecrans/tableau.ts";
import { versReglages } from "./ecrans/reglages.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// --- Masquage ---------------------------------------------------------------
is(masquer("jeanne.dupont@exemple.test"), "j***t@exemple.test", "masque la partie locale, garde le domaine");
is(masquer("jo@exemple.test"), "j*@exemple.test", "une partie locale courte ne se devine pas");
is(masquer("a@x.test, bob@y.test"), "a*@x.test, b***b@y.test", "une liste se masque adresse par adresse");
is(masquer("pas-une-adresse"), "***", "ce qui n'est pas une adresse ne sort pas en clair");

// --- Reglages ---------------------------------------------------------------
const defaut = reglagesParDefaut();
is([defaut.expediteur, defaut.destinataires.contact, defaut.reponse], ["", "", ""], "aucune adresse par defaut");
const lu = lireReglages({ expediteur: " Contact@Exemple.TEST ", destinataires: { contact: "a@x.test; b@x.test,a@x.test" }, plafonds: { heure: "12" }, cycle: 15 });
is(lu.erreurs, [], "des reglages propres passent");
is([lu.reglages.expediteur, lu.reglages.destinataires.contact, lu.reglages.plafonds.heure, lu.reglages.cycle], ["contact@exemple.test", "a@x.test, b@x.test", 12, 15], "adresses rognees, en minuscules, sans doublon");
const refus = lireReglages({ expediteur: "pas bon", destinataires: { contact: "a@x.test,b@x.test,c@x.test,d@x.test" }, plafonds: { jour: -1 }, cycle: 31 });
is(refus.erreurs.map((e) => e.champ), ["expediteur", "contact", "plafonds", "cycle"], "chaque champ refuse est nomme");
// Une messagerie grand public ne peut pas servir d'expediteur ; un destinataire, si.
const gmail = lireReglages({ expediteur: "patron@gmail.com", destinataires: { contact: "patron@gmail.com" } });
is([gmail.erreurs, gmail.reglages.expediteur, gmail.reglages.destinataires.contact], [[{ champ: "expediteur", raison: "messagerie" }], "", "patron@gmail.com"], "gmail refuse comme expediteur, accepte comme destinataire");
is(lireReglages({ expediteur: "Contact@Orange.fr" }).erreurs, [{ champ: "expediteur", raison: "messagerie" }], "orange.fr refuse, casse ignoree");
is(lireReglages({ expediteur: "contact@mon-site.fr" }).erreurs, [], "une adresse de son domaine passe");
is(refus.reglages.expediteur, "", "un champ refuse garde sa valeur precedente");
is(lireReglages({ accuse: { sujet: { fr: "" } } }).reglages.accuse.sujet.fr, defaut.accuse.sujet.fr, "un sujet vide reprend le texte livre");
is([lireReglages({ nom: "Vela\r\nBcc: x@y.test" }).reglages.nom, lireReglages({ accuse: { sujet: { fr: "Merci\nBcc: x" } } }).reglages.accuse.sujet.fr], ["Vela Bcc: x@y.test", "Merci Bcc: x"], "aucun saut de ligne dans un nom ou un sujet (pas d'injection d'en-tete)");
const saisie = versReglages({ expediteur: "c@x.test", dest_contact: "d@x.test", accuse_actif: true, plafond_heure: 3, cycle: 2 }, ["contact"]);
is(lireReglages(saisie).reglages.destinataires.contact, "d@x.test", "l'ecran des reglages rend des reglages lisibles");

// --- Plafonds et cycle ------------------------------------------------------
const p = { heure: 2, jour: 10, destinataire: 1, mois: 0 };
is(plafondAtteint(p, { heure: 1, jour: 1, destinataire: 0, mois: 9999 }), null, "0 veut dire sans plafond");
is(plafondAtteint(p, { heure: 2, jour: 2, destinataire: 0, mois: 0 }), "heure", "le plafond de l'heure arrete");
is(plafondAtteint(p, { heure: 5, jour: 5, destinataire: 1, mois: 0 }), "destinataire", "le plafond par destinataire passe en premier");
const t0 = Date.UTC(2026, 8, 28, 14, 0);
is(new Date(debutDuCycle(t0, 1)).toISOString(), "2026-09-01T00:00:00.000Z", "cycle au 1er");
is(new Date(debutDuCycle(Date.UTC(2026, 0, 3), 15)).toISOString(), "2025-12-15T00:00:00.000Z", "cycle a cheval sur l'annee");
is(new Date(finDuCycle(t0, 1)).toISOString(), "2026-10-01T00:00:00.000Z", "le compteur repart le mois suivant");

// --- Petites regles ---------------------------------------------------------
is(langueDeLaRequete("emdash-locale=en; a=b", "fr", "fr-FR"), "en", "le cookie du back office l'emporte");
is(langueDeLaRequete(null, "fr", "en-US"), "fr", "puis la langue par defaut du site");
is(langueDeLaRequete(null, null, "en-US,en;q=0.9"), "en", "sinon le navigateur");
is([cheminDeRetour("/fr/contact/?x=1"), cheminDeRetour("//evil.test/"), cheminDeRetour("https://evil.test"), cheminDeRetour(5)], ["/fr/contact/", "/", "/", "/"], "le retour reste sur le site");
is(appliquer(FR, appliquer(FR, VUE_PAR_DEFAUT, "journal:etat", "Refusé"), "journal:formulaire", "Tous"), { ...VUE_PAR_DEFAUT, etat: "refuse" }, "les filtres du journal se cumulent, par leur libelle");
is([origineDeLaSource("aloha-commerce", { "aloha-commerce": "commande" }), origineDeLaSource("aloha-commerce"), origineDeLaSource("toString", {})], ["commande", "autre", "autre"], "une extension du site se range sous le formulaire que la configuration lui donne");
is(appliquer(FR, { ...VUE_PAR_DEFAUT, index: { "28 sept. · Essai · Envoyé": "cr_1" } }, "journal:voir", "28 sept. · Essai · Envoyé").choisi, "cr_1", "Voir un envoi retrouve la ligne par son libelle, sans identifiant a l'ecran");
is(erreurEnClair(FR, "PLAFOND:heure:20")?.includes("20 envois"), true, "le plafond dit sa limite");
is(erreurEnClair(EN, "E_SENDER_NOT_VERIFIED")?.startsWith("Cloudflare has not verified"), true, "l'erreur se traduit en anglais aussi");
is(erreurEnClair(FR, "E_QUELQUE_CHOSE", "detail")?.includes("E_QUELQUE_CHOSE : detail"), true, "une erreur inconnue garde son code");

// --- DNS --------------------------------------------------------------------
is(valeursDe({ Status: 0, Answer: [{ type: 16, data: '"v=DKIM1; k=rsa; " "p=ABCDEFGHIJKLMNOP"' }] }, "TXT"), ["v=DKIM1; k=rsa; p=ABCDEFGHIJKLMNOP"], "un TXT coupe se recolle");
is(valeursDe({ Status: 0, Answer: [{ type: 15, data: "10 route1.mx.cloudflare.net." }] }, "MX"), ["route1.mx.cloudflare.net"], "un MX perd sa priorite");
is(valeursDe({ Status: 3 }, "TXT"), [], "un nom inexistant ne rend rien");
is(analyser("spf", ["v=spf1 include:_spf.mx.cloudflare.net ~all"]).etat, "ok", "SPF attendu");
is(analyser("spf", ["v=spf1 -all", "v=spf1 include:_spf.mx.cloudflare.net ~all"]).etat, "double", "deux SPF se voient");
is(analyser("dmarc", ["v=DMARC1; p=none", "v=DMARC1; p=reject"]).etat, "double", "un seul DMARC");
is(analyser("dkim", []).etat, "absent", "DKIM absent");
is(analyser("mx", ["mx.autre.test"]).etat, "faux", "un MX ailleurs est different");
const faux = async (url: string) => {
  if (url.includes("_dmarc")) throw new Error("reseau coupe");
  return { ok: true, json: async () => ({ Status: 0, Answer: url.includes("type=MX") ? [{ type: 15, data: "5 route2.mx.cloudflare.net." }] : [{ type: 16, data: '"v=spf1 include:_spf.mx.cloudflare.net ~all"' }] }) };
};
is((await interroger("exemple.test", faux)).map((v) => v.etat), ["ok", "ok", "absent", "injoignable"], "une question sans reponse vaut non verifie, jamais absent");

// --- SQL, journal, envoi : sur une vraie base SQLite ------------------------
let sqlite: typeof import("node:sqlite") | null = null;
try {
  sqlite = await import("node:sqlite");
} catch {
  console.log("node:sqlite absent (Node < 22.13) : partie SQL ignoree.");
}
if (sqlite) {
  const db = new sqlite.DatabaseSync(":memory:");
  const base: Base = {
    lire: async <T>(sql: string, parametres: unknown[] = []) => db.prepare(sql).all(...(parametres as never[])) as T[],
    executer: async (sql: string, parametres: unknown[] = []) => {
      db.prepare(sql).run(...(parametres as never[]));
    },
  };
  db.exec(SQL_IDEMPOTENT);
  db.exec(SQL_IDEMPOTENT);
  await preparer(base);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => (r as { name: string }).name);
  is(tables, ["courriels_journal", "courriels_reglages"], "le SQL se rejoue sans erreur ni doublon");
  const schema = () => JSON.stringify(db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all());
  const avant = schema();
  db.exec(SQL_IDEMPOTENT);
  is(schema(), avant, "rejouer le SQL ne change rien");

  let horloge = t0;
  let numero = 0;
  const envoyes: { to: string[]; from: { email: string; name: string }; subject: string; text: string; html?: string; replyTo?: string }[] = [];
  let panne: unknown = null;
  const ctx: Contexte = {
    base,
    liaison: {
      send: async (m) => {
        if (panne) throw panne;
        envoyes.push(m);
        return { messageId: `m${envoyes.length}` };
      },
    },
    maintenant: () => horloge,
    nouvelId: () => `l${String(++numero).padStart(3, "0")}`,
  };
  let reglages: Reglages = lireReglages({ expediteur: "site@exemple.test", nom: "Vela", destinataires: { contact: "patron@exemple.test" }, plafonds: { heure: 3, jour: 50, destinataire: 2, mois: 0 } }).reglages;
  let liaisonPresente = true;

  // LE CANAL D'EMDASH, rejoue a l'identique de node_modules/emdash/src/plugins/
  // email.ts (Node refuse de retirer les types d'un fichier de node_modules) :
  // validation, email:deliver exclusif dont l'erreur remonte, puis afterSend
  // sans attendre, saute pour la source "system".
  const livrer = fournisseur(async () => ({ contexte: { ...ctx, liaison: liaisonPresente ? ctx.liaison : null }, reglages, textes: FR }));
  const lignesEcrites: Promise<void>[] = [];
  const journaliser = journaliste(async () => ({ base, livreur: "aloha-courriels", soi: "aloha-courriels", maintenant: ctx.maintenant, nouvelId: ctx.nouvelId }));
  const canalEmdash = (livreur: typeof livrer | null) => async (message: Evenement["message"], source: string) => {
    if (!message.to || !message.subject || !message.text) throw new Error("Invalid email message");
    if (!livreur) throw Object.assign(new Error("No email provider is configured."), { name: "EmailNotConfiguredError" });
    await livreur({ message, source });
    if (source !== "system") lignesEcrites.push(journaliser({ message, source }));
  };
  const pipeline = canalEmdash(livrer);
  const canal: Canal = (m) => pipeline(m, "aloha-courriels");
  const envoi = poster(ctx, canal);
  const message = { a: ["patron@exemple.test"], sujet: "Essai", texte: "Bonjour" };

  liaisonPresente = false;
  is((await envoi(message, { origine: "essai" })).code, "SANS_LIAISON", "sans liaison, rien ne part et la cause est notee");
  liaisonPresente = true;
  const r0 = reglages;
  reglages = { ...r0, expediteur: "" };
  is((await envoi(message, { origine: "essai" })).code, "SANS_EXPEDITEUR", "sans expediteur non plus");
  reglages = r0;
  is((await poster(ctx, null)(message, { origine: "essai" })).code, "SANS_FOURNISSEUR", "sans fournisseur choisi, la cause est notee");
  is((await poster(ctx, (m) => canalEmdash(null)(m, "aloha-courriels"))(message, { origine: "essai" })).code, "SANS_FOURNISSEUR", "le refus du canal non configure est reconnu");
  is((await envoi(message, { origine: "essai" })).etat, "envoye", "premier envoi parti par le canal");
  is((await envoi(message, { origine: "essai" })).etat, "envoye", "deuxieme envoi parti");
  const bloque = await envoi(message, { origine: "essai" });
  is([bloque.etat, bloque.code], ["plafonne", "PLAFOND:destinataire:2"], "le troisieme vers la meme adresse est bloque");
  is(envoyes.length, 2, "un envoi bloque n'atteint jamais la liaison");
  is((await envoi({ ...message, a: ["autre@exemple.test"] }, { origine: "essai" })).etat, "envoye", "une autre adresse passe encore");
  is((await envoi({ ...message, a: ["troisieme@exemple.test"] }, { origine: "essai" })).code, "PLAFOND:heure:3", "puis le plafond de l'heure arrete tout");
  let erreurNative = "";
  await pipeline({ to: "admin@exemple.test", subject: "Test email", text: "t" }, "admin").catch((e: Error) => (erreurNative = e.message));
  is(erreurNative.startsWith("Plafond de l'heure atteint"), true, "l'ecran natif recoit l'erreur traduite");
  await pipeline({ to: "admin@exemple.test", subject: "Lien de connexion", text: "jeton secret" }, "system");
  const systeme = (await lignes(base, { limite: 1 }))[0];
  is([systeme?.formulaire, systeme?.etat, systeme?.message], ["systeme", "envoye", null], "un courriel du back office passe les plafonds et son jeton n'est pas garde");
  horloge += 2 * 3_600_000;
  panne = Object.assign(new Error("domaine non verifie"), { code: "E_SENDER_NOT_VERIFIED" });
  const refuse = await envoi({ ...message, a: ["troisieme@exemple.test"] }, { origine: "essai" });
  const ligneRefusee = (await lignes(base, { etat: "refuse", limite: 1 }))[0];
  is([refuse.code, ligneRefusee?.fournisseur, ligneRefusee?.erreur?.startsWith("Le domaine de l'adresse")], ["E_SENDER_NOT_VERIFIED", "cloudflare", true], "le refus de Cloudflare est journalise, traduit en francais");
  panne = null;
  const renvoi = await renvoyer(envoi, base, reglages, refuse.id);
  is(typeof renvoi === "object" && renvoi.etat, "envoye", "Renvoyer fait repartir le message garde");
  is((await lignes(base, { limite: 1 }))[0]?.renvoi_de, refuse.id, "le renvoi pointe vers l'envoi d'origine");
  await pipeline({ to: "admin@exemple.test", subject: "Test email", text: "t" }, "admin");
  await Promise.all(lignesEcrites);
  const essaiNatif = (await lignes(base, { limite: 1 }))[0];
  is([essaiNatif?.formulaire, essaiNatif?.fournisseur], ["essai", "cloudflare"], "l'essai de l'ecran natif s'inscrit une fois, comme essai");
  is((await lignes(base, { limite: 200 })).filter((l) => l.sujet === "Test email" && l.etat === "envoye").length, 1, "afterSend ne double pas une ligne deja ecrite");

  // Un autre fournisseur (la console d'EmDash en developpement) : afterSend inscrit.
  const console_: typeof livrer = async () => {};
  const parLaConsole = canalEmdash(console_);
  const issueConsole = await poster(ctx, (m) => parLaConsole(m, "aloha-courriels"))({ ...message, a: ["c@exemple.test"] }, { origine: "contact" });
  await Promise.all(lignesEcrites);
  is((await lignes(base, { limite: 200 })).filter((l) => l.id === issueConsole.id).length, 1, "livre par un autre, une seule ligne au journal");

  const bilan = await bilanDuCycle(base, horloge, reglages.cycle);
  is([bilan.envoyes, bilan.echecs, bilan.plafonnes], [7, 5, 3], "le compteur du mois compte les envois partis, a part les echecs");
  const moisSuivant = await bilanDuCycle(base, Date.UTC(2026, 9, 2), reglages.cycle);
  is(moisSuivant.envoyes, 0, "le compteur repart a zero au cycle suivant");
  is(manques(reglages, true, false), ["fournisseur"], "une liaison sans fournisseur choisi se signale");
  // La carte rouge du tableau de bord : un echec sans renvoi reussi reste signale, un echec rattrape ne l'est plus.
  const enAttente = await echecsEnAttente(base, 0);
  is(enAttente.some((l) => l.id === refuse.id), false, "un refus rattrape par un renvoi reussi n'est plus en attente");
  horloge += 2 * 3_600_000;
  panne = Object.assign(new Error("boite pleine"), { code: "E_DELIVERY_FAILED" });
  const commandeRatee = await envoi({ ...message, a: ["client@exemple.test"] }, { origine: "commande" });
  panne = null;
  const attente2 = await echecsEnAttente(base, 0);
  is(attente2[0]?.id, commandeRatee.id, "la commande dont le courriel n'est pas parti est en attente");
  const donnees = { reglages, liaison: true, livreur: "aloha-courriels", bilan: await bilanDuCycle(base, horloge, reglages.cycle), derniers: [], echecs: attente2, maintenant: horloge };
  const rouge = carte(FR, donnees).blocks[0] as { type: string; variant?: string; description?: string };
  is([rouge.type, rouge.variant, rouge.description?.startsWith("Le courriel d'une commande")], ["banner", "error", true], "carte rouge au tableau de bord, qui nomme la commande");
  is(rangee(FR, attente2[0]!, horloge).motif.startsWith("Le serveur du destinataire"), true, "la raison du refus est dans la ligne du journal");

  // Deux copies du module du canal (le formulaire et l'extension importes par
  // deux chemins) : toujours une seule ligne, sous la bonne origine.
  const autreChemin = "./noyau/canal.ts?copie";
  const copie = (await import(autreChemin)) as typeof import("./noyau/canal.ts");
  const parLaCopie = canalEmdash(copie.fournisseur(async () => ({ contexte: ctx, reglages, textes: FR })));
  await poster(ctx, (m) => parLaCopie(m, "aloha-courriels"))({ ...message, a: ["copie@exemple.test"] }, { origine: "contact" });
  await Promise.all(lignesEcrites);
  is((await lignes(base, { limite: 200 })).filter((l) => l.destinataire === "copie@exemple.test").map((l) => l.formulaire), ["contact"], "deux copies du module du canal partagent le meme contexte : une ligne, bonne origine");

  // Le formulaire de contact.
  const site = { nom: "Vela", langue: "fr" as const, catalogues: { fr: FR, en: EN } };
  horloge += 2 * 86_400_000;
  const avantRobot = (await lignes(base, { limite: 200 })).length;
  is(await recevoirContact(envoi, reglages, { nom: "Bot", adresse: "bot@exemple.test", sujet: "", message: "x", piege: "http://spam.test", langue: "en" }, site), "envoye", "un robot croit que c'est parti");
  is((await lignes(base, { limite: 200 })).length, avantRobot, "et rien ne s'inscrit");
  is(await recevoirContact(envoi, reglages, { nom: "", adresse: "x", sujet: "", message: "", piege: "", langue: "en" }, site), "invalide", "un formulaire incomplet est rendu");
  const r = reglages;
  reglages = { ...r, accuse: { ...r.accuse, actif: true } };
  const avantContact = envoyes.length;
  is(await recevoirContact(envoi, reglages, { nom: "Camille", adresse: "camille@exemple.test", sujet: "Projet", message: "Bonjour\nVoici", piege: "", langue: "en" }, site), "envoye", "le message part");
  const [notif, accuse] = envoyes.slice(avantContact);
  is([notif?.to, notif?.replyTo, notif?.subject], [["patron@exemple.test"], "camille@exemple.test", "Nouveau message du site : Projet"], "la notification part au destinataire regle, reponse au visiteur, a travers le canal");
  is([accuse?.to, accuse?.subject, accuse?.text.includes("Hello Camille") && !accuse.text.includes("Voici")], [["camille@exemple.test"], reglages.accuse.sujet.en, true], "l'accuse part dans la langue du visiteur, sans recopier son message (pas de relais de pourriel)");
  is((await lignes(base, { formulaire: "accuse", limite: 1 }))[0]?.formulaire, "accuse", "l'accuse est journalise comme accuse");
  reglages = { ...r, destinataires: { ...r.destinataires, contact: "" } };
  is(await recevoirContact(envoi, reglages, { nom: "Lou", adresse: "lou@exemple.test", sujet: "", message: "Allo", piege: "", langue: "fr" }, site), "garde", "sans destinataire, le message est garde");
  const garde = (await lignes(base, { limite: 1 }))[0]!;
  is([garde.code, garde.destinataire], ["SANS_DESTINATAIRE", "-"], "et journalise avec sa cause");
  reglages = r;
  const repart = await renvoyer(envoi, base, reglages, garde.id);
  is([typeof repart === "object" && repart.etat, envoyes.at(-1)?.to, envoyes.at(-1)?.replyTo], ["envoye", ["patron@exemple.test"], "lou@exemple.test"], "Renvoyer l'envoie au destinataire regle depuis, reponse au visiteur");
  horloge += 2 * 3_600_000;
  const e = await essai(envoi, reglages, "moi@exemple.test", FR, "Vela", "maintenant");
  is([e.etat, envoyes.at(-1)?.from], ["envoye", { email: "site@exemple.test", name: "Vela" }], "l'essai part avec l'expediteur et le nom regles");
}

// --- Aucune adresse en dur --------------------------------------------------
// Les seules adresses permises dans le code sont les exemples affiches a
// l'ecran, sur des domaines qui n'existent pas.
const ici = fileURLToPath(new URL(".", import.meta.url));
const fichiers = readdirSync(ici, { recursive: true }).map(String).filter((f) => /\.(ts|mjs)$/.test(f) && !f.endsWith(".selfcheck.ts"));
// Les formulaires du site qui envoient par Courriels (ceux qui importent
// @moteur/courriels), ou qu'ils soient : le chemin d'un formulaire est propre
// au theme (ContactForm.astro chez Koa, un autre nom ailleurs).
const src = fileURLToPath(new URL("../../../", import.meta.url));
const formulaires = readdirSync(src, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".astro") && !f.startsWith("moteur/"))
  .map((f) => join(src, f))
  .filter((f) => readFileSync(f, "utf8").includes("@moteur/courriels"));
const EXEMPLES = new Set(["votre-domaine.fr", "your-domain.com"]);
for (const chemin of [...fichiers.map((f) => join(ici, f)), ...formulaires]) {
  for (const [adresse, domaine] of readFileSync(chemin, "utf8").matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)) {
    assert.ok(EXEMPLES.has(domaine!), `adresse en dur dans ${chemin} : ${adresse}`);
  }
}
checks += 1;

console.log(`courriels.selfcheck : ${checks} verifications passees.`);
