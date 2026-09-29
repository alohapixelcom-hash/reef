// src/moteur/extensions/courriels/extension.ts - l'extension EmDash "Courriels" cote serveur : le fournisseur du canal de courriel d'EmDash, son journal, et la route Block Kit des quatre ecrans et de la carte.
//
// EXTENSION NATIVE. Elle lit la liaison send_email et la base du Worker, ce
// qu'une extension "sandbox" ne peut pas faire. Elle se branche sur le canal
// de courriel d'EmDash (voir noyau/canal.ts) : email:deliver (elle livre, par
// la liaison Cloudflare Email), email:afterSend (elle journalise), et
// ctx.email pour ses propres envois (essai, renvoi). Reglages > Courriels,
// l'ecran natif d'EmDash, la montre donc comme fournisseur, et son bouton
// d'essai passe par elle.
//
// SANS LIAISON DECLAREE (`livrer: false`, pose par moteur.config.mjs quand
// le fichier du Worker n'a pas de "send_email") : elle ne se declare pas
// fournisseur. EmDash garde alors son comportement d'origine (invitation par
// lien a copier), et les ecrans disent ce qui manque. Ses pages sont en Block Kit,
// le format natif du back office : elles en ont les composants, les deux modes
// et l'habillage du theme, sans une ligne de style ni un composant React.
//
// QUI A LE DROIT : "settings:manage", le role administrateur. Changer le
// destinataire des messages d'un site, c'est un reglage du site, pas du
// contenu. EmDash verifie la session, la permission et l'en-tete anti-CSRF
// avant d'appeler le gestionnaire ; ctx.user est donc la personne connectee.
//
// UNE INTERACTION = UN ECRAN RENDU. L'ouverture d'une page arrive en
// `page_load` avec son chemin ; un clic ou un formulaire arrive avec son
// action_id, prefixe du nom de l'ecran ("journal:renvoyer"). Rien n'est garde
// entre deux requetes, sauf la vue du journal de chaque personne (KV).
import { definePlugin, type PluginCapability, type ResolvedPlugin, type RouteContext } from "emdash";
import { hote, nouvelId } from "./adaptateur.ts";
import { CONFIGURATION } from "./configuration.ts";
import { capacites, CARTES, IDENTITE, PAGES } from "./identite.mjs";
import { bilanDuCycle, derniereModification, echecsEnAttente, ecrireLesReglages, fournisseurChoisi, lignes, lireLesReglages, uneLigne } from "./noyau/base.ts";
import { type Canal, fournisseur, journaliste, poster } from "./noyau/canal.ts";
import { interroger } from "./noyau/dns.ts";
import { erreurEnClair, essai, renvoyer } from "./noyau/envoi.ts";
import { debutDuCycle, domaineDe, langueDeLaRequete, lireReglages } from "./noyau/regles.ts";
import type { Bloc, Reponse } from "./ecrans/blocs.ts";
import { date } from "./ecrans/blocs.ts";
import { ACTIONS as A_BRANCHER, brancher } from "./ecrans/brancher.ts";
import { ACTIONS as A_JOURNAL, appliquer, envoisProposes, journal, libellesDesEnvois, lireVue } from "./ecrans/journal.ts";
import { ACTIONS as A_REGLAGES, erreursEnClair, reglages as ecranReglages, versReglages } from "./ecrans/reglages.ts";
import { carte, tableau } from "./ecrans/tableau.ts";
import { EN } from "./ecrans/textes.en.ts";
import { FR, type Textes } from "./ecrans/textes.fr.ts";

type Interaction = { type: string; page?: string; action_id?: string; value?: unknown; values?: Record<string, unknown> };

function lireInteraction(entree: unknown): Interaction {
  if (typeof entree !== "object" || entree === null) return { type: "page_load", page: "/" };
  const i = entree as Record<string, unknown>;
  return {
    type: typeof i.type === "string" ? i.type : "page_load",
    ...(typeof i.page === "string" ? { page: i.page } : {}),
    ...(typeof i.action_id === "string" ? { action_id: i.action_id } : {}),
    value: i.value,
    ...(typeof i.values === "object" && i.values !== null ? { values: i.values as Record<string, unknown> } : {}),
  };
}

/** L'ecran vise : le chemin a l'ouverture, le prefixe de l'action ensuite. */
function ecranVise(i: Interaction): string {
  if (i.type === "page_load") return i.page ?? "/";
  const prefixe = (i.action_id ?? "").split(":")[0];
  return prefixe === "tableau" ? "/" : `/${prefixe}`;
}

const vueDe = (ctx: RouteContext) => `vue:journal:${ctx.user?.id ?? "inconnu"}`;
const qui = (ctx: RouteContext) => ctx.user?.name || ctx.user?.email || "-";

async function page(ctx: RouteContext): Promise<Reponse> {
  const t: Textes = langueDeLaRequete(ctx.request.headers.get("cookie"), CONFIGURATION.langueDuBackOffice, ctx.request.headers.get("accept-language")) === "en" ? EN : FR;
  try {
    const h = await hote();
    if (!h.base) return { blocks: [{ type: "banner", variant: "error", description: t.sansBase }] };
    const base = h.base;
    // Les envois de l'extension passent par le canal d'EmDash (ctx.email,
    // absent tant qu'aucun fournisseur n'est choisi) : le poster note alors
    // la cause au journal.
    const email = ctx.email;
    const canal: Canal | null = email ? (m) => email.send(m) : null;
    const envoi = poster({ base, maintenant: Date.now, nouvelId }, canal);
    const i = lireInteraction(ctx.input);
    const ecran = ecranVise(i);
    const maintenant = Date.now();
    let regl = await lireLesReglages(base);
    const nomDuSite = ctx.site?.name || CONFIGURATION.nomDuSite;

    if (ecran === "widget:courriels" || ecran === "/") {
      const donnees = { reglages: regl, liaison: !!h.liaison, livreur: await fournisseurChoisi(base), bilan: await bilanDuCycle(base, maintenant, regl.cycle), derniers: await lignes(base, { limite: 5 }), echecs: await echecsEnAttente(base, debutDuCycle(maintenant, regl.cycle)), maintenant };
      return ecran === "/" ? tableau(t, donnees) : carte(t, donnees);
    }

    if (ecran === "/journal") {
      let vue = lireVue(await ctx.kv.get(vueDe(ctx)));
      let bandeau: Bloc | undefined;
      let toast: Reponse["toast"];
      if (i.action_id === A_JOURNAL.renvoyer && typeof i.value === "string") {
        const issue = await renvoyer(envoi, base, regl, i.value);
        if (typeof issue === "string") {
          bandeau = { type: "banner", variant: "error", description: issue === "introuvable" ? t.journal.introuvable : t.journal.sansContenu };
        } else {
          vue = { ...vue, choisi: issue.id };
          toast = issue.etat === "envoye" ? { message: t.journal.renvoye, type: "success" } : { message: t.journal.renvoiEchec, type: "error" };
        }
      } else if (i.action_id) {
        vue = appliquer(t, vue, i.action_id, i.value);
      }
      const choisie = vue.choisi ? await uneLigne(base, vue.choisi) : null;
      const origineDuRenvoi = choisie?.renvoi_de ? await uneLigne(base, choisie.renvoi_de) : null;
      const affichees = await lignes(base, { etat: vue.etat, formulaire: vue.formulaire, limite: vue.limite });
      // La table libelle vers identifiant de "Voir un envoi", pour le prochain clic.
      vue = { ...vue, index: Object.fromEntries(libellesDesEnvois(t, envoisProposes(affichees, choisie)).map((l) => [l.libelle, l.id])) };
      await ctx.kv.set(vueDe(ctx), vue);
      const rendu = journal(t, {
        vue,
        lignes: affichees,
        choisie,
        origineDuRenvoi,
        formulaires: CONFIGURATION.formulaires,
        maintenant,
        ...(bandeau ? { bandeau } : {}),
      });
      return toast ? { ...rendu, toast } : rendu;
    }

    if (ecran === "/brancher") {
      let bandeau: Bloc | undefined;
      let toast: Reponse["toast"];
      const moi = ctx.user?.email || null;
      if (i.action_id === A_BRANCHER.choisir) {
        const ok = await choisirCommeFournisseur(ctx);
        toast = { message: ok ? t.brancher.choisiOk : t.brancher.choisiKo, type: ok ? "success" : "error" };
        if (!ok) bandeau = { type: "banner", variant: "error", description: t.brancher.choisiKo };
      }
      if (i.action_id === A_BRANCHER.essai && moi) {
        const issue = await essai(envoi, regl, moi, t, regl.nom || nomDuSite, date(t, maintenant));
        const ok = issue.etat === "envoye";
        const pourquoi = ok ? "" : erreurEnClair(t, issue.code) ?? "";
        bandeau = ok
          ? { type: "banner", variant: "default", description: t.brancher.essaiOk(moi) }
          : { type: "banner", variant: "error", title: t.brancher.essaiKo, description: pourquoi };
        toast = { message: ok ? t.brancher.essaiOk(moi) : t.brancher.essaiKo, type: ok ? "success" : "error" };
      }
      const domaine = domaineDe(regl.expediteur);
      const essais = await lignes(base, { formulaire: "essai", limite: 1 });
      const rendu = brancher(t, {
        reglages: regl,
        liaison: !!h.liaison,
        livreur: await fournisseurChoisi(base),
        dns: domaine ? await interroger(domaine, fetch) : null,
        verifieLe: Date.now(),
        moi,
        essaiReussi: essais[0]?.etat === "envoye",
        configuration: CONFIGURATION,
        ...(bandeau ? { bandeau } : {}),
      });
      return toast ? { ...rendu, toast } : rendu;
    }

    if (ecran === "/reglages") {
      let bandeau: Bloc | undefined;
      let saisie: Record<string, unknown> | null = null;
      let toast: Reponse["toast"];
      if (i.type === "form_submit" && i.action_id === A_REGLAGES.enregistrer) {
        const valeurs = i.values ?? {};
        const lu = lireReglages(versReglages(valeurs, CONFIGURATION.formulaires), regl);
        if (lu.erreurs.length) {
          saisie = valeurs;
          bandeau = { type: "banner", variant: "error", title: t.reglages.refuse, description: erreursEnClair(t, lu.erreurs).join(" ; ") };
          toast = { message: t.reglages.refuseBref, type: "error" };
        } else {
          regl = { ...lu.reglages, nom: lu.reglages.nom || nomDuSite };
          await ecrireLesReglages(base, regl, qui(ctx), maintenant);
          bandeau = { type: "banner", variant: "default", description: t.reglages.enregistre };
          toast = { message: t.reglages.enregistre, type: "success" };
        }
      }
      const rendu = ecranReglages(t, {
        reglages: regl,
        formulaires: CONFIGURATION.formulaires,
        nomDuSite,
        saisie,
        derniere: await derniereModification(base),
        ...(bandeau ? { bandeau } : {}),
      });
      return toast ? { ...rendu, toast } : rendu;
    }

    return { blocks: [{ type: "banner", variant: "error", description: t.panne(ecran) }] };
  } catch (erreur) {
    // Une exception rendue telle quelle donnerait "Plugin responded with 500" :
    // l'ecran dit plutot ce qui s'est passe, et le journal du Worker garde le detail.
    const detail = erreur instanceof Error ? erreur.message : String(erreur);
    ctx.log.error("Courriels : ecran en echec", { detail: detail.slice(0, 300) });
    return { blocks: [{ type: "banner", variant: "error", description: t.panne(detail.slice(0, 160)) }] };
  }
}

/**
 * Choisit Courriels comme fournisseur du canal. EmDash 0.38 n'a pas d'ecran
 * pour ce choix (seulement sa route d'administration, qui met a jour la base
 * ET le canal en memoire) : on l'appelle au nom de la personne connectee, avec
 * sa session et l'en-tete anti-CSRF. Utile en developpement (la console
 * d'EmDash est un second fournisseur) ; en ligne, Courriels est choisi seul.
 */
async function choisirCommeFournisseur(ctx: RouteContext): Promise<boolean> {
  try {
    const origine = new URL(ctx.request.url).origin;
    const reponse = await fetch(`${origine}/_emdash/api/admin/hooks/exclusive/email:deliver`, {
      method: "PUT",
      headers: { "content-type": "application/json", "X-EmDash-Request": "1", origin: origine, cookie: ctx.request.headers.get("cookie") ?? "" },
      body: JSON.stringify({ pluginId: IDENTITE.id }),
    });
    return reponse.ok;
  } catch {
    return false;
  }
}

/** Ce que les deux crochets du canal chargent a chaque courriel : la base, la liaison, les reglages. */
async function dependances() {
  const h = await hote();
  if (!h.base) throw new Error(FR.sansBase);
  return { base: h.base, liaison: h.liaison, reglages: await lireLesReglages(h.base) };
}

const textesDuBackOffice = (): Textes => (CONFIGURATION.langue === "en" ? EN : FR);

export interface Options {
  /** Faux : aucune liaison send_email declaree pour ce Worker, l'extension ne livre pas. */
  livrer?: boolean;
}

export function createPlugin(options: Options = {}): ResolvedPlugin {
  const livrer = options.livrer !== false;
  return definePlugin({
    ...IDENTITE,
    capabilities: capacites(livrer) as PluginCapability[],
    hooks: {
      ...(livrer
        ? {
            "email:deliver": {
              exclusive: true,
              // La liaison repond en une a deux secondes ; la base est lue
              // deux fois avant (reglages, compteurs). 5 s par defaut, c'est court.
              timeout: 15_000,
              handler: fournisseur(async () => {
                const d = await dependances();
                return { contexte: { base: d.base, liaison: d.liaison, maintenant: Date.now, nouvelId }, reglages: d.reglages, textes: textesDuBackOffice(), sources: CONFIGURATION.sources };
              }),
            },
          }
        : {}),
      "email:afterSend": {
        handler: journaliste(async () => {
          const d = await dependances();
          return { base: d.base, livreur: await fournisseurChoisi(d.base), soi: IDENTITE.id, sources: CONFIGURATION.sources, maintenant: Date.now, nouvelId };
        }),
      },
    },
    routes: {
      admin: { permission: "settings:manage", handler: page },
    },
    admin: { pages: PAGES, widgets: CARTES },
  });
}

export default createPlugin;
