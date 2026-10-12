// src/moteur/extensions/courriels/turnstile.selfcheck.ts - self-check de la verification Turnstile des formulaires : paire de cles, siteverify, refus sans jeton ou jeton refuse, 405 hors POST, aucune ecriture ni envoi quand la porte refuse.
// Lancer : node --experimental-strip-types src/moteur/extensions/courriels/turnstile.selfcheck.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADRESSE_DU_SCRIPT, CHAMP_JETON, controler, protectionDe, type Recuperer, SITEVERIFY, verifierLeJeton } from "./noyau/turnstile.ts";
import { reponseDuRefus } from "./noyau/garde.ts";
import { blocDeLaProtection } from "./ecrans/reglages.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR } from "./ecrans/textes.fr.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// Valeurs d'essai, sans rapport avec un vrai widget.
const CLE = "0x4AAAAAAAessai-publique";
const SECRET = "0x4AAAAAAAessai-secrete";

// --- La paire de cles (les noms des deux lignees sont lus) ----------------------
is(protectionDe({ TURNSTILE_SITE_KEY: CLE, TURNSTILE_SECRET_KEY: SECRET }), { etat: "active", cle: CLE, secret: SECRET }, "les deux cles : protection allumee");
is(protectionDe({ PUBLIC_TURNSTILE_SITE_KEY: CLE, TURNSTILE_SECRET: SECRET }).etat, "active", "les autres noms des cles sont lus aussi");
is(protectionDe({ TURNSTILE_SITE_KEY: ` ${CLE} `, TURNSTILE_SECRET_KEY: `${SECRET}\n` }).etat, "active", "cles rognees");
is(protectionDe({}), { etat: "absente", cle: null, secret: null }, "aucune cle : eteinte, le formulaire marche comme avant");
is(protectionDe({ TURNSTILE_SITE_KEY: "  ", TURNSTILE_SECRET_KEY: "" }).etat, "absente", "des cles vides ne comptent pas");
is(protectionDe({ TURNSTILE_SITE_KEY: CLE }), { etat: "sans-secret", cle: null, secret: null }, "cle publique seule : rien a montrer");
is(protectionDe({ TURNSTILE_SECRET_KEY: SECRET }), { etat: "sans-cle", cle: null, secret: null }, "secret seul : rien a montrer");
is(ADRESSE_DU_SCRIPT.endsWith("render=explicit&onload=alohaVerification"), true, "Verification.astro charge le script en rendu explicite");

// --- siteverify --------------------------------------------------------------
type Appel = { url: string; method: string; corps: Record<string, string> };
function faux(reponse: unknown | Error): { f: Recuperer; appels: Appel[] } {
  const appels: Appel[] = [];
  const f: Recuperer = async (url, init) => {
    appels.push({ url, method: init.method, corps: Object.fromEntries(init.body.entries()) });
    if (reponse instanceof Error) throw reponse;
    return { ok: true, json: async () => reponse };
  };
  return { f, appels };
}

{
  const { f, appels } = faux({ success: true });
  is(await verifierLeJeton(undefined, SECRET, null, f), { ok: false, raison: "sans-jeton", codes: [] }, "sans jeton : refuse");
  is(await verifierLeJeton("   ", SECRET, null, f), { ok: false, raison: "sans-jeton", codes: [] }, "jeton vide : refuse");
  is(await verifierLeJeton("x".repeat(2049), SECRET, null, f), { ok: false, raison: "sans-jeton", codes: [] }, "jeton trop long : refuse");
  is(appels.length, 0, "un jeton absent ne coute aucun appel a Cloudflare");
  is(await verifierLeJeton("jeton-bon", SECRET, "203.0.113.7", f), { ok: true }, "jeton accepte par Cloudflare");
  is(appels, [{ url: SITEVERIFY, method: "POST", corps: { secret: SECRET, response: "jeton-bon", remoteip: "203.0.113.7" } }], "POST a siteverify avec le secret, le jeton et l'adresse");
}
{
  const { f } = faux({ success: false, "error-codes": ["invalid-input-response"] });
  is(await verifierLeJeton("jeton-faux", SECRET, null, f), { ok: false, raison: "refuse", codes: ["invalid-input-response"] }, "jeton refuse : codes de Cloudflare gardes");
}
{
  const { f } = faux({ success: false, "error-codes": ["timeout-or-duplicate"] });
  is((await verifierLeJeton("jeton-rejoue", SECRET, null, f)).ok, false, "jeton deja servi ou expire : refuse");
}
{
  const { f } = faux(new Error("reseau"));
  is(await verifierLeJeton("jeton", SECRET, null, f), { ok: false, raison: "injoignable", codes: [] }, "Cloudflare injoignable : refuse, jamais laisse passer");
}
{
  const { f } = faux("pas du json objet");
  is((await verifierLeJeton("jeton", SECRET, null, f)).ok, false, "reponse illisible : refuse");
}

// --- La porte ----------------------------------------------------------------
const silence = console.warn;
console.warn = () => {};
const active = protectionDe({ TURNSTILE_SITE_KEY: CLE, TURNSTILE_SECRET_KEY: SECRET });
const url = new URL("https://www.exemple.test/_emdash/aloha-courriels/contact");
const champs = { name: "Camille", email: "camille@exemple.test", message: "Bonjour", langue: "fr", retour: "/contact/" };
const demande = (brut: Record<string, unknown>, methode = "POST") => ({ methode, url, brut, ip: null, action: "contact" });
{
  const { f, appels } = faux({ success: true });
  is(await controler(demande(champs, "GET"), { protection: active }, f), "methode", "GET : refuse avant tout");
  is(await controler(demande(champs), { protection: active }, f), "sans-jeton", "protection allumee, sans jeton : refuse");
  is(await controler(demande({ ...champs, email: "", [CHAMP_JETON]: "jeton" }), { protection: active }, f), "sans-adresse", "sans adresse : refuse avant siteverify");
  is(appels.length, 0, "aucun appel a Cloudflare tant que le jeton et l'adresse manquent");
  is(await controler(demande({ ...champs, [CHAMP_JETON]: "jeton-bon" }), { protection: active }, f), null, "jeton accepte : la demande passe");
}
{
  const { f } = faux({ success: false });
  is(await controler(demande({ ...champs, [CHAMP_JETON]: "jeton-faux" }), { protection: active }, f), "jeton-refuse", "jeton refuse : refuse");
}
{
  const { f } = faux({ success: true });
  is(await controler(demande(champs), { protection: protectionDe({}) }, f), null, "aucune cle, protection non exigee : le formulaire marche comme avant");
  is(await controler(demande(champs), { protection: protectionDe({}), exigee: true }, f), "indisponible", "aucune cle, protection exigee : 503");
  is(await controler(demande(champs), { protection: protectionDe({ TURNSTILE_SITE_KEY: CLE }) }, f), "indisponible", "paire incomplete : 503, jamais un formulaire a moitie protege");
}
console.warn = silence;

// --- Les reponses ------------------------------------------------------------
{
  const r = reponseDuRefus(FR.visiteur.refus, { langue: "fr", refus: "methode", lien: "/" });
  is([r.status, r.headers.get("allow"), r.headers.get("x-robots-tag"), r.headers.get("cache-control")], [405, "POST", "noindex", "no-store"], "GET : 405, Allow: POST, page non indexee");
}
is(reponseDuRefus(EN.visiteur.refus, { langue: "en", refus: "indisponible", lien: "/en/contact/" }).status, 503, "protection exigee mais pas posee : 503");
is((await reponseDuRefus(FR.visiteur.refus, { langue: "fr", refus: "indisponible", lien: '/"><b>' }).text()).includes('"><b>'), false, "le lien de retour est echappe");

// --- Les routes, lues dans leur source ---------------------------------------------
const ici = fileURLToPath(new URL(".", import.meta.url));
const lire = (chemin: string) => readFileSync(join(ici, chemin), "utf8");
const reception = lire("reception.ts");
const inscription = lire("inscription.ts");
is(/export const GET: APIRoute = \(\) => reponseDuRefus\(/.test(reception) && reception.includes('refus: "methode"'), true, "contact : GET repond 405");
is(/if \(geste === "inscrire"\) return refuser\("methode"/.test(inscription), true, "lettre : GET sur /inscrire repond 405");
for (const [nom, source, gestes] of [
  ["reception.ts", reception, ["lireLesReglages(", "recevoirContact(", "garderLeMessage("]],
  ["inscription.ts", inscription, ["demanderLInscription(", "confirmation(", "lireLesReglages("]],
] as const) {
  const debut = source.indexOf("async function inscrire") > 0 ? source.indexOf("async function inscrire") : source.indexOf("export const POST");
  const porteA = source.indexOf("await controler(", debut);
  is(porteA > 0, true, `${nom} passe par la porte`);
  for (const geste of gestes) is(source.indexOf(geste, debut) > porteA, true, `${nom} : ${geste} vient apres la verification`);
}
// La cle secrete ne quitte jamais le serveur : ni les composants ni l'envoi ne la lisent.
is(/secret/i.test(lire("Verification.astro").replace(/\/\/.*$/gm, "")), false, "Verification.astro ne lit pas la cle secrete");
is(/secret/i.test(lire("Turnstile.astro").replace(/\/\/.*$/gm, "")), false, "Turnstile.astro ne lit pas la cle secrete");
is(/\.secret/.test(lire("formulaire.emdash.ts")), false, "l'envoi rendu a la page ne porte que la cle publique");

// --- L'ecran des reglages le dit ----------------------------------------------------
is(blocDeLaProtection(FR, "active").description, FR.reglages.protection.active, "allumee : dit");
is(blocDeLaProtection(FR, "absente").description, FR.reglages.protection.absente, "eteinte : dit, avec ce qu'il faut faire");
is([blocDeLaProtection(FR, "sans-secret").variant, blocDeLaProtection(FR, "sans-secret").description.includes("TURNSTILE_SECRET_KEY")], ["alert", true], "paire incomplete : alerte qui nomme la cle manquante");
is(blocDeLaProtection(EN, "sans-cle").description.includes("TURNSTILE_SITE_KEY"), true, "en anglais aussi");

console.log(`turnstile.selfcheck : ${checks} verifications passees`);
