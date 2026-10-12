// src/moteur/extensions/courriels/formulaires.selfcheck.ts - self-check de la porte des formulaires (405, 400 sans jeton, 400 jeton refuse, 400 sans adresse, 503 sans secret en ligne, succes), des champs en plus (echappes, bornes, requis) et du preremplissage.
// Lancer : node --experimental-strip-types src/moteur/extensions/courriels/formulaires.selfcheck.ts
import assert from "node:assert/strict";
import { corpsDuMessage, formulaireDeclare, lireLesChampsEnPlus, MAX_ABSOLU, uneLigne } from "./noyau/champs.ts";
import { CHAMP_JETON, controler, estLocal, protectionPrete, type Recuperer, reponseDuRefus, SITEVERIFY, STATUT_DU_REFUS } from "./noyau/garde.ts";
import type { Message } from "./noyau/base.ts";
import { lireChamps, recevoirContact } from "./noyau/envoi.ts";
import { reglagesParDefaut } from "./noyau/regles.ts";
import { preremplir, valeurAPreremplir } from "./preremplir.ts";
import { LETTRE_EN } from "./ecrans/lettre.textes.en.ts";
import { LETTRE_FR } from "./ecrans/lettre.textes.fr.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// --- Un siteverify simule : il note chaque appel et repond ce qu'on lui dit --
const appels: { url: string; corps: Record<string, string> }[] = [];
const siteverify =
  (reponse: unknown, ok = true): Recuperer =>
  async (url, init) => {
    appels.push({ url, corps: Object.fromEntries(init.body.entries()) });
    return { ok, json: async () => reponse };
  };
const enPanne: Recuperer = async () => {
  throw new Error("injoignable");
};
const EN_LIGNE = new URL("https://cafes.exemple.test/_emdash/courriels/envoyer");
const LOCAL = new URL("http://localhost:4321/_emdash/courriels/envoyer");
const POSEE = { cle: "cle-publique", secret: "secret-d-essai" };
const demande = (brut: Record<string, unknown>, methode = "POST", url = EN_LIGNE) => ({ methode, url, brut, ip: "203.0.113.7" });
const complet = { email: "camille@exemple.test", [CHAMP_JETON]: "jeton-du-widget" };

// --- La porte ----------------------------------------------------------------
is(await controler(demande(complet, "GET"), POSEE, siteverify({ success: true })), "methode", "GET : refuse");
is(STATUT_DU_REFUS.methode, 405, "GET : 405");
is(await controler({ ...demande({ email: "camille@exemple.test" }) }, POSEE, siteverify({ success: true })), "sans-jeton", "POST sans jeton : refuse");
is(STATUT_DU_REFUS["sans-jeton"], 400, "sans jeton : 400");
is(appels.length, 0, "sans jeton : siteverify n'est pas appele");
is(await controler(demande({ [CHAMP_JETON]: "jeton" }), POSEE, siteverify({ success: true })), "sans-adresse", "adresse vide : refuse");
is(await controler(demande({ email: "   ", [CHAMP_JETON]: "jeton" }), POSEE, siteverify({ success: true })), "sans-adresse", "adresse faite d'espaces : refuse");
is([STATUT_DU_REFUS["sans-adresse"], appels.length], [400, 0], "adresse vide : 400, et le jeton n'est pas consomme");
is(await controler(demande(complet), POSEE, siteverify({ success: false, "error-codes": ["invalid-input-response"] })), "jeton-refuse", "jeton refuse par siteverify : refuse");
is(STATUT_DU_REFUS["jeton-refuse"], 400, "jeton refuse : 400");
is(appels[0], { url: SITEVERIFY, corps: { secret: "secret-d-essai", response: "jeton-du-widget", remoteip: "203.0.113.7" } }, "siteverify recoit le secret, le jeton et l'IP du visiteur (CF-Connecting-IP)");
is(await controler(demande(complet), POSEE, siteverify({ success: true }, false)), "jeton-refuse", "siteverify en erreur HTTP : refuse");
is(await controler(demande(complet), POSEE, enPanne), "jeton-refuse", "siteverify injoignable : refuse, jamais ouvert");
is(await controler(demande(complet), POSEE, siteverify({ success: "true" })), "jeton-refuse", "seul success === true passe");
is(await controler(demande({ ...complet, [CHAMP_JETON]: "x".repeat(2049) }), POSEE, siteverify({ success: true })), "jeton-refuse", "un jeton trop long est refuse");
is(await controler(demande(complet), POSEE, siteverify({ success: true })), null, "jeton accepte : la demande passe");
is(await controler(demande(complet), { cle: "cle", secret: null }, siteverify({ success: true })), "indisponible", "sans secret, en ligne : refuse");
is(STATUT_DU_REFUS.indisponible, 503, "sans secret, en ligne : 503");
const avant = appels.length;
is(await controler(demande({ email: "camille@exemple.test" }, "POST", LOCAL), { cle: null, secret: null }, siteverify({ success: false })), null, "sans secret, en local : accepte");
is(appels.length, avant, "en local sans secret : siteverify n'est pas appele");
is(await controler(demande({ email: "camille@exemple.test" }, "POST", LOCAL), POSEE, siteverify({ success: true })), "sans-jeton", "en local avec un secret : le jeton est exige");
is([estLocal(LOCAL), estLocal(new URL("http://127.0.0.1:8787/")), estLocal(new URL("http://[::1]:8787/")), estLocal(new URL("http://site.localhost/")), estLocal(EN_LIGNE), estLocal(new URL("https://localhost.exemple.test/"))], [true, true, true, true, false, false], "local : la machine du developpeur seulement");
is([protectionPrete({ cle: "c", secret: "s" }, EN_LIGNE), protectionPrete({ cle: "c", secret: null }, EN_LIGNE), protectionPrete({ cle: null, secret: "s" }, EN_LIGNE), protectionPrete({ cle: null, secret: null }, LOCAL)], [true, false, false, true], "en ligne, le formulaire ne s'affiche branche qu'avec les deux valeurs");

// --- La page de refus ---------------------------------------------------------
const refus400 = reponseDuRefus(FR.visiteur.refus, { langue: "fr", refus: "sans-jeton", lien: '/contact-sav/?courriel=verification"><script>#courriel' });
const page = await refus400.text();
is([refus400.status, refus400.headers.get("Cache-Control"), page.includes("<script>"), page.includes("&quot;&gt;&lt;script&gt;"), page.includes(FR.visiteur.refus.raisons["sans-jeton"].replace(/'/g, "'"))], [400, "no-store", false, true, true], "page de refus : 400, lien echappe, phrase du catalogue");
const refus405 = reponseDuRefus(EN.visiteur.refus, { langue: "en", refus: "methode", lien: "/" });
is([refus405.status, refus405.headers.get("Allow"), (await refus405.text()).includes('lang="en"')], [405, "POST", true], "page de refus : 405 avec Allow: POST, dans la langue du visiteur");
is([Object.keys(FR.visiteur.refus.raisons).sort(), Object.keys(EN.visiteur.refus.raisons).sort()], [Object.keys(STATUT_DU_REFUS).sort(), Object.keys(STATUT_DU_REFUS).sort()], "chaque refus a sa phrase, en francais et en anglais");
is([!!FR.visiteur.sansScript, !!EN.visiteur.sansScript, !!FR.visiteur.verification, !!LETTRE_FR.visiteur.verification, !!LETTRE_EN.visiteur.verification], [true, true, true, true, true], "sans JavaScript et verification : phrases FR et EN");

// --- Les champs en plus -------------------------------------------------------
const table = {
  "contact-sav": {
    nomRequis: false,
    messageRequis: false,
    champs: [
      { nom: "prenom", libelle: { fr: "Prénom", en: "First name" } },
      { nom: "telephone", libelle: { fr: "Téléphone", en: "Phone" }, requis: true, max: 30 },
      { nom: "email", libelle: { fr: "Piege", en: "Trap" } },
      { nom: "Mauvais Nom", libelle: { fr: "x", en: "x" } },
      { nom: "sans_libelle", libelle: { fr: "", en: "x" } },
      { nom: "prenom", libelle: { fr: "Doublon", en: "Duplicate" } },
      { nom: "commande", libelle: { fr: "Numéro de commande", en: "Order number" }, max: 99999 },
    ],
  },
};
const sav = formulaireDeclare(table, "contact-sav");
is(sav?.champs?.map((c) => c.nom), ["prenom", "telephone", "commande"], "nom reserve, nom mal forme, libelle vide et doublon sont ecartes");
is([sav?.nomRequis, sav?.messageRequis], [false, false], "nom et message rendus facultatifs par le site");
is([formulaireDeclare(table, "inconnu"), formulaireDeclare(table, "../x"), formulaireDeclare(null, "contact-sav"), formulaireDeclare(table, "__proto__")], [null, null, null, null], "un formulaire non declare n'a aucun champ en plus");
is(formulaireDeclare({ f: { champs: Array.from({ length: 30 }, (_, k) => ({ nom: `c${k}`, libelle: { fr: "a", en: "a" } })) } }, "f")?.champs?.length, 12, "douze champs en plus au plus");

const brut = { prenom: 'Ca<b>mi</b>lle\r\nBcc: x@y.test "', telephone: "05 59 00 00 00".padEnd(60, "9"), commande: "x".repeat(5000), inconnu: "ignore", name: "", email: "camille@exemple.test", message: "" };
const lus = lireLesChampsEnPlus(sav, brut, "fr");
is(lus.valeurs[0], { nom: "prenom", libelle: "Prénom", valeur: "Ca b mi /b lle Bcc: x@y.test" }, "une valeur tient sur une ligne, sans < > ni guillemet");
is([lus.valeurs[1]?.valeur.length, lus.valeurs[2]?.valeur.length, lus.manquant], [30, MAX_ABSOLU, false], "chaque valeur est bornee (max du champ, 1 000 au plus)");
is(lus.valeurs.some((x) => x.valeur === "ignore"), false, "un champ non declare n'arrive nulle part");
is(lireLesChampsEnPlus(sav, { prenom: "Camille" }, "fr").manquant, true, "un champ requis vide rend le message invalide");
is(lireLesChampsEnPlus(sav, { telephone: "0559" }, "en").valeurs, [{ nom: "telephone", libelle: "Phone", valeur: "0559" }], "les libelles suivent la langue du back office");
is(corpsDuMessage([{ nom: "a", libelle: "Prénom", valeur: "Camille" }], "Bonjour", "fr"), "Prénom : Camille\n\nBonjour", "les champs en tete, puis le message");
is(corpsDuMessage([{ nom: "a", libelle: "Phone", valeur: "1" }], "", "en"), "Phone: 1", "sans message : les champs seuls");
is(uneLigne("a\u2028b\u0007c", 10), "a b c", "separateurs de ligne Unicode et caracteres de controle retires");

// --- Le message garde et la notification portent les champs en plus -----------
const reglages = { ...reglagesParDefaut(), expediteur: "site@exemple.test", destinataires: { ...reglagesParDefaut().destinataires, contact: "equipe@exemple.test" } };
const site = (gardes: unknown[]) => ({ nom: "Cafés", langue: "fr" as const, catalogues: { fr: FR, en: EN }, garder: async (m: unknown) => void gardes.push(m) });
const partis: Message[] = [];
const poste = async (m: Message) => (partis.push(m), { etat: "envoye" as const, id: "x", code: null });
const gardes: { nom: string; message: string }[] = [];
const champs = { ...lireChamps(brut), enPlus: lus.valeurs, manquant: false, nomRequis: false, messageRequis: false };
is(await recevoirContact(poste, reglages, champs, site(gardes)), "envoye", "sans nom ni message, mais avec ses champs : recu");
is(gardes[0]?.message.startsWith("Prénom : Ca b mi /b lle Bcc: x@y.test\nTéléphone : 05 59"), true, "le message garde (ecran Messages) porte les champs en plus");
is(gardes[0]?.nom, "camille@exemple.test", "sans nom saisi, l'adresse en tient lieu");
is([partis[0]?.texte.includes("Numéro de commande : xxx"), partis[0]?.texte.includes("<b>")], [true, false], "le courriel envoye porte les champs, echappes");
is(await recevoirContact(poste, reglages, { ...champs, manquant: true }, site([])), "invalide", "un champ requis manquant : invalide");
is(await recevoirContact(poste, reglages, { ...champs, nomRequis: true }, site([])), "invalide", "nom exige par defaut");
is(await recevoirContact(poste, reglages, { ...lireChamps({ name: "A", email: "a@exemple.test", message: "" }) }, site([])), "invalide", "message exige par defaut, comme avant");
is(await recevoirContact(poste, reglages, { ...champs, enPlus: [] }, site([])), "invalide", "rien du tout a lire : invalide");

// --- Le preremplissage (cote navigateur) --------------------------------------
const q = "?commande=FR-1042%0A%3Cb%3E&email=camille%40exemple.test&vide=";
is([valeurAPreremplir(q, "commande"), valeurAPreremplir(q, "email"), valeurAPreremplir(q, "vide"), valeurAPreremplir(q, "absent"), valeurAPreremplir(q, "a b")], ["FR-1042 <b>", "camille@exemple.test", null, null, null], "valeurs lues dans l'adresse, cle validee");
const champ = (cle: string | null, value = "", maxLength = -1) => ({ value, maxLength, getAttribute: (n: string) => (n === "data-preremplir" ? cle : null) });
const cibles = [champ("commande", "", 4), champ("email", "deja@saisi.test"), champ(null), champ("email")];
is([preremplir(cibles, q), cibles.map((c) => c.value)], [2, ["FR-1", "deja@saisi.test", "", "camille@exemple.test"]], "remplit les champs vides qui le demandent, borne par maxlength, n'ecrase rien");

console.log(`formulaires.selfcheck : ${checks} verifications passees.`);
