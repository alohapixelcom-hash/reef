// src/moteur/extensions/courriels/adaptateur.ts - ce que l'extension Courriels demande a son hote (une base, une liaison d'envoi, le canal de courriel d'EmDash), et la facon de le trouver dans un Worker Cloudflare.
//
// L'EXTENSION EN TROIS COUCHES, POUR SE COPIER TELLE QUELLE
//
//   noyau/      les regles et les effets, sans EmDash ni Astro : reglages,
//               plafonds, journal, livraison, branchement sur le canal
//               (canal.ts), DNS. Verifies par courriels.selfcheck.ts.
//   ecrans/     les quatre pages du back office en Block Kit (le format natif
//               des pages d'extension d'EmDash) et leurs deux catalogues.
//   extension.ts, reception.ts, formulaire.*.ts : les trois points de contact
//               avec l'hote (le back office et le canal, la route du
//               formulaire, le composant du formulaire).
//
// L'INTEGRATION EST NATIVE : l'extension est le fournisseur `email:deliver`
// du canal d'EmDash 0.38, journalise par `email:afterSend`, et ses propres
// envois passent par `ctx.email`. Reglages > Courriels (ecran d'EmDash) la
// liste comme fournisseur, et son bouton d'essai passe par elle.
//
// L'ADAPTATEUR MINIMAL : l'hote fournit une `Base` (lire, executer, avec des
// parametres `?`) et, s'il l'a, une `Liaison` (la methode `send` de la liaison
// send_email, forme structuree). Ce fichier les trouve dans l'environnement
// du Worker, par le module `cloudflare:workers` (le meme chemin que le
// fournisseur livre avec @emdash-cms/cloudflare) ; un hote qui n'est pas un
// Worker n'a qu'a remplacer `hote()` par la sienne.
//
// POSER L'EXTENSION DANS UN AUTRE DEPOT (un theme de la maison, alohapixel.com,
// un site client sur EmDash 0.38) :
//   1. copier le dossier src/moteur/extensions/courriels/ tel quel ;
//   2. reecrire configuration.ts (formulaires du site, noms des liaisons,
//      commande de deploiement) : c'est le seul fichier propre au site ;
//   3. dans la configuration d'EmDash, `plugins`, ajouter
//        { ...IDENTITE, entrypoint: "<chemin>/courriels/extension.ts",
//          options: { livrer }, capabilities: capacites(livrer) }
//      (IDENTITE et capacites viennent de courriels/identite.mjs ; `livrer`
//      vaut vrai quand le fichier du Worker declare "send_email", voir
//      LIAISON_COURRIELS dans moteur.config.mjs de Koa) ;
//   4. declarer la route du formulaire, rendue a la demande :
//        injectRoute({ pattern: ROUTE_DU_FORMULAIRE, entrypoint: "<chemin>/courriels/reception.ts", prerender: false })
//   5. dans le composant du formulaire, etaler `envoi.attributs` sur <form> et
//      ajouter ses champs caches et son avis (voir ContactForm.astro de Koa),
//      par un alias qui rend formulaire.fichiers.ts quand le moteur est eteint ;
//   6. rejouer le SQL livre (courriels_journal, courriels_reglages) sur la base
//      en ligne, ou laisser l'extension creer ses tables au premier usage ;
//   7. declarer la liaison dans le fichier du Worker : "send_email": [{ "name": "EMAIL" }].
// Rien d'autre : ni dependance, ni secret, ni adresse dans le code.
import type { Base } from "./noyau/base.ts";
import type { Liaison } from "./noyau/envoi.ts";
import type { OptionsDeLaLettre } from "./noyau/lettre.ts";
import { CONFIGURATION } from "./configuration.ts";

export interface Hote {
  base: Base | null;
  liaison: Liaison | null;
}

/** L'adresse ou le formulaire poste : sous /_emdash, que les Workers de la maison ne redirigent jamais. */
export const ROUTE_DU_FORMULAIRE = "/_emdash/courriels/envoyer";

/** La route de la lettre d'information : /inscrire (formulaire), /confirmer et /desinscrire (liens des courriels). */
export const ROUTE_DE_LA_LETTRE = "/_emdash/courriels/lettre";

/**
 * La lettre d'information du site : le champ `lettre` de configuration.ts,
 * ou null. Lu sans le type du site, que les sites d'avant la lettre n'ont
 * pas : leur configuration.ts reste valable tel quel.
 */
export function lettreDuSite(): OptionsDeLaLettre | null {
  const brut = (CONFIGURATION as { lettre?: unknown }).lettre;
  if (typeof brut !== "object" || brut === null) return null;
  const o = brut as OptionsDeLaLettre;
  return typeof o.collection === "string" && typeof o.adresse === "object" && o.adresse !== null ? o : null;
}

/** La forme d'une base D1, reduite a ce que ce fichier appelle. */
interface D1 {
  prepare(sql: string): { bind(...valeurs: unknown[]): { all(): Promise<{ results?: unknown[] }>; run(): Promise<unknown> } };
}

const bases = new WeakMap<object, Base>();

export function baseD1(d1: D1): Base {
  let base = bases.get(d1);
  if (!base) {
    base = {
      lire: async <T>(sql: string, parametres: unknown[] = []) => ((await d1.prepare(sql).bind(...parametres).all()).results ?? []) as T[],
      executer: async (sql: string, parametres: unknown[] = []) => {
        await d1.prepare(sql).bind(...parametres).run();
      },
    };
    bases.set(d1, base);
  }
  return base;
}

function estUneLiaison(valeur: unknown): valeur is Liaison {
  return typeof valeur === "object" && valeur !== null && typeof (valeur as { send?: unknown }).send === "function";
}

/** L'hote d'un Worker Cloudflare. Hors de workerd (un build statique, un test), il n'a ni base ni liaison. */
export async function hote(): Promise<Hote> {
  try {
    // Le module n'existe que dans workerd ; son type arrive avec `wrangler
    // types`, que le theme n'embarque pas (meme choix que deployer/caches.ts).
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: { env?: Record<string, unknown> } = await import("cloudflare:workers");
    const env = plateforme.env ?? {};
    const d1 = env[CONFIGURATION.base];
    const liaison = env[CONFIGURATION.liaison];
    return {
      base: typeof d1 === "object" && d1 !== null && "prepare" in d1 ? baseD1(d1 as D1) : null,
      liaison: estUneLiaison(liaison) ? liaison : null,
    };
  } catch {
    return { base: null, liaison: null };
  }
}

/** Un identifiant de ligne court, triable par date a la seconde pres. */
export function nouvelId(): string {
  return `cr_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}
