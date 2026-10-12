// src/moteur/extensions/courriels/courriels.selfcheck.ts - self-check de l'extension Courriels : plafonds, masquage, compteur du mois, SQL idempotent, canal d'EmDash (fournisseur et journal), renvoi, DNS, Turnstile, absence d'adresse en dur.
// Lancer : node --experimental-strip-types src/moteur/extensions/courriels/courriels.selfcheck.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bilanDuCycle, echecsEnAttente, lignes, preparer, SQL_IDEMPOTENT, type Base } from "./noyau/base.ts";
import { analyser, interroger, valeursDe } from "./noyau/dns.ts";
import { type Canal, type Evenement, fournisseur, journaliste, poster } from "./noyau/canal.ts";
import { type Contexte, erreurEnClair, essai, lireChamps, manques, recevoirContact, renvoyer } from "./noyau/envoi.ts";
import { cheminDeRetour, debutDuCycle, origineDeLaSource, finDuCycle, langueDeLaRequete, lireReglages, masquer, plafondAtteint, reglagesParDefaut, type Reglages } from "./noyau/regles.ts";
import { CHAMP_TURNSTILE, controler, protectionDe, protectionPrete, reglageTurnstile, SITEVERIFY, verifierLeJeton, verifierTurnstile } from "./noyau/turnstile.ts";
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

// --- Turnstile ----------------------------------------------------------------
{
  const recus: { adresse: string; secret: unknown; jeton: unknown; ip: unknown }[] = [];
  const repondre = (donnees: Record<string, unknown>, ok = true) => async (adresse: string, init: { method: string; body: URLSearchParams }) => {
    recus.push({ adresse, secret: init.body.get("secret"), jeton: init.body.get("response"), ip: init.body.get("remoteip") });
    return { ok, json: async () => donnees };
  };
  const bon = { success: true, action: "contact", hostname: "boutique.exemple.test" };
  const attendu = { actions: ["contact"], hotes: ["exemple.test"] };
  is(await verifierTurnstile("jeton", "secret", "1.2.3.4", attendu, repondre(bon)), true, "un jeton accepte, bonne action, bon hote : passe");
  is(recus[0], { adresse: SITEVERIFY, secret: "secret", jeton: "jeton", ip: "1.2.3.4" }, "le secret, le jeton et l'adresse IP partent a siteverify");
  is(await verifierTurnstile("jeton", "secret", null, attendu, repondre({ ...bon, success: false })), false, "un jeton refuse ne passe pas");
  is(await verifierTurnstile("jeton", "secret", null, attendu, repondre({ ...bon, action: "lettre" })), false, "un jeton signe pour une autre action ne passe pas");
  is(await verifierTurnstile("jeton", "secret", null, attendu, repondre({ ...bon, hostname: "autre-site.test" })), false, "un jeton obtenu sur un autre site ne passe pas");
  is(await verifierTurnstile("jeton", "secret", null, attendu, repondre({ ...bon, hostname: "pasexemple.test" })), false, "un nom d'hote qui finit pareil sans etre un sous-domaine ne passe pas");
  is(await verifierTurnstile("jeton", "secret", null, {}, repondre({ success: true })), true, "sans attente, success suffit");
  is(await verifierTurnstile("jeton", "secret", null, attendu, repondre(bon, false)), false, "une reponse en erreur ne passe pas");
  is(await verifierTurnstile("", "secret", null, attendu, repondre(bon)), false, "un jeton vide ne passe pas");
  is(await verifierTurnstile(undefined, "secret", null, attendu, repondre(bon)), false, "un jeton absent ne passe pas");
  is(await verifierTurnstile("jeton", "secret", null, attendu, async () => { throw new Error("reseau"); }), false, "une erreur reseau ne passe pas");
}

// --- Champs en plus d'un formulaire ------------------------------------------
{
  const base = { name: "Payet", email: "a@exemple.test", topic: "Devis", message: "Bonjour" };
  is(lireChamps({ ...base, "plus:Société": "Kaz", "plus:Téléphone": "0262" }).message, "Société : Kaz\nTéléphone : 0262\n\nBonjour", "les champs en plus passent en tete du message");
  is(lireChamps({ ...base, "plus:Société": "  " }).message, "Bonjour", "un champ en plus vide ne laisse rien");
  is(lireChamps({ ...base, message: "", "plus:Société": "Kaz" }).message, "", "un champ en plus ne rend pas valide un message vide");
}

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

// --- Turnstile : la paire, la porte -----------------------------------------
// Les noms des cles des differents sites sont tous lus ; les deux posees
// allument la protection, aucune ne change rien, une seule ferme la porte.
{
  is(reglageTurnstile({}), null, "Turnstile eteint sans cle ni secret");
  is(reglageTurnstile({ PUBLIC_TURNSTILE_SITE_KEY: "0xCLE" }), null, "la cle seule ne l'allume pas");
  is(reglageTurnstile({ TURNSTILE_SECRET: "0xSECRET" }), null, "le secret seul ne l'allume pas");
  is(reglageTurnstile({ PUBLIC_TURNSTILE_SITE_KEY: " 0xCLE ", TURNSTILE_SECRET: "0xSECRET" }), { cle: "0xCLE", secret: "0xSECRET" }, "la cle et le secret l'allument");
  is(reglageTurnstile({ TURNSTILE_SITE_KEY: "0xA", TURNSTILE_SECRET_KEY: "0xB" }), { cle: "0xA", secret: "0xB" }, "les noms TURNSTILE_SITE_KEY et TURNSTILE_SECRET_KEY sont lus aussi");
  is(reglageTurnstile({ TURNSTILE_SECRET: "0xB" }, { turnstile: "0xCONF" }), { cle: "0xCONF", secret: "0xB" }, "la cle publique peut venir de configuration.ts");
  is(protectionDe({ TURNSTILE_SITE_KEY: "0xA" }).etat, "sans-secret", "cle sans secret : etat sans-secret");
  is(protectionDe({ TURNSTILE_SECRET: "0xB" }).etat, "sans-cle", "secret sans cle : etat sans-cle");
  const enLigne = new URL("https://exemple.test/contact/");
  const local = new URL("http://localhost:4321/contact/");
  is(protectionPrete(protectionDe({}), enLigne), true, "rien de pose : le formulaire reste branche comme avant");
  is(protectionPrete(protectionDe({}), enLigne, true), false, "rien de pose mais exige : formulaire inerte en ligne");
  is(protectionPrete(protectionDe({}), local, true), true, "exige mais en local : l'essai passe");
  is(protectionPrete(protectionDe({ TURNSTILE_SITE_KEY: "0xA" }), enLigne), false, "a moitie pose : formulaire inerte");
  const appels: { url: string; corps: Record<string, string> }[] = [];
  const siteverify =
    (succes: boolean | "panne", plus: Record<string, unknown> = {}) =>
    async (url: string, init: { method: "POST"; body: URLSearchParams }) => {
      appels.push({ url, corps: Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, String(v)])) });
      if (succes === "panne") throw new Error("reseau");
      return { ok: true, json: async () => ({ success: succes, "error-codes": succes ? [] : ["invalid-input-response"], ...plus }) };
    };
  const active = protectionDe({ PUBLIC_TURNSTILE_SITE_KEY: "0xCLE", TURNSTILE_SECRET: "0xSECRET" });
  const demande = (brut: Record<string, unknown>, url = enLigne, methode = "POST") => ({ methode, url, brut: { email: "a@exemple.test", ...brut }, ip: "203.0.113.7", action: "contact" });
  is(await controler(demande({}), { protection: protectionDe({}) }, siteverify(false)), null, "sans cle ni secret, un formulaire sans jeton passe comme avant");
  is(appels.length, 0, "sans secret, siteverify n'est pas appele");
  is(await controler(demande({}), { protection: protectionDe({}), exigee: true }, siteverify(true)), "indisponible", "exige et absent en ligne : refus");
  is(await controler(demande({}), { protection: protectionDe({ TURNSTILE_SECRET: "0xS" }) }, siteverify(true)), "indisponible", "a moitie pose en ligne : refus");
  is(await controler(demande({}, local), { protection: protectionDe({ TURNSTILE_SECRET: "0xS" }) }, siteverify(true)), null, "a moitie pose en local : l'essai passe");
  is(await controler(demande({}, enLigne, "GET"), { protection: active }, siteverify(true)), "methode", "une autre methode que POST : refus 405");
  is(await controler(demande({}), { protection: active }, siteverify(true)), "sans-jeton", "protection active : un jeton absent est refuse");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "   " }), { protection: active }, siteverify(true)), "sans-jeton", "protection active : un jeton vide est refuse");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "j", email: " " }), { protection: active }, siteverify(true)), "sans-adresse", "une adresse vide est refusee avant siteverify");
  is(await controler({ ...demande({ [CHAMP_TURNSTILE]: "j" }), brut: { [CHAMP_TURNSTILE]: "j" } }, { protection: active }, siteverify(true)), "sans-adresse", "une adresse absente aussi");
  is(appels.length, 0, "un jeton absent ou une adresse vide sont refuses sans appeler siteverify");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "jeton-faux" }), { protection: active }, siteverify(false)), "jeton-refuse", "une reponse negative de siteverify est refusee");
  is([appels[0]?.url, appels[0]?.corps], [SITEVERIFY, { secret: "0xSECRET", response: "jeton-faux", remoteip: "203.0.113.7" }], "siteverify recoit le secret, le jeton et l'adresse du visiteur");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "jeton-bon" }), { protection: active }, siteverify(true)), null, "une reponse positive de siteverify passe");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "jeton-bon" }), { protection: active }, siteverify(true, { action: "lettre" })), "jeton-refuse", "un jeton signe pour la lettre ne vaut pas pour le contact");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "jeton-bon" }), { protection: active }, siteverify(true, { action: "" })), null, "un widget sans action n'en signe pas : le jeton passe");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "jeton-bon" }), { protection: active, hotes: ["exemple.test"] }, siteverify(true, { hostname: "autre.test" })), "jeton-refuse", "un jeton obtenu sur un autre site est refuse");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "jeton-bon" }), { protection: active }, siteverify("panne")), "jeton-refuse", "siteverify injoignable : refus");
  is(await controler(demande({ [CHAMP_TURNSTILE]: "x".repeat(2049) }), { protection: active }, siteverify(true)), "jeton-refuse", "un jeton trop long est refuse");
  is((await verifierLeJeton("j", "s", null, siteverify(false))).ok, false, "verifierLeJeton rend le verdict detaille");
  is(FR.visiteur.verification.length > 0 && EN.visiteur.verification.length > 0, true, "le refus se lit en francais et en anglais");
  is(FR.visiteur.sansScript.length > 0 && EN.visiteur.sansScript.length > 0, true, "la phrase sans JavaScript se lit en francais et en anglais");
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
