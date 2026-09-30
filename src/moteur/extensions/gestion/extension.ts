// src/moteur/extensions/gestion/extension.ts - l'extension EmDash "Gestion" cote serveur : les routes des listes a gerer (messages, abonnes de la lettre, journal des courriels), une par lecture ou par geste.
//
// EXTENSION NATIVE, ecrans en React (admin/admin.tsx) : Block Kit n'a ni
// case a cocher par ligne, ni fichier a telecharger, et c'est ce que ces
// listes demandent (selection multiple, gestes de masse, export CSV).
//
// QUI A LE DROIT : la permission par defaut des extensions, "plugins:manage",
// c'est-a-dire le role administrateur. EmDash verifie la session, la
// permission et l'en-tete anti-CSRF avant chaque gestionnaire ; ctx.user est
// l'administrateur authentifie.
//
// CHAQUE GESTE DE MASSE rend le nombre de lignes reellement changees, que
// l'ecran affiche ; les identifiants sont bornes (courriels/noyau/messages.ts,
// identifiants) et passent par paquets (D1 : 100 parametres au plus).
import { definePlugin, PluginRouteError, type PluginCapability, type ResolvedPlugin, type RouteContext } from "emdash";
import { hote, lettreDuSite, nouvelId } from "../courriels/adaptateur.ts";
import type { Base } from "../courriels/noyau/base.ts";
import { lireLesReglages } from "../courriels/noyau/base.ts";
import { type Canal, poster as posterDuSite, type Poster } from "../courriels/noyau/canal.ts";
import { erreurEnClair, renvoyer } from "../courriels/noyau/envoi.ts";
import { chercherDesAbonnes, compterLesAbonnes, type FiltreAbonnes, gesteSurLesAbonnes, type GesteDeMasse } from "../courriels/noyau/lettre.ts";
import { type Filtre, identifiants, STATUTS, type Statut } from "../courriels/noyau/messages.ts";
import { ETATS, type Etat, ORIGINES, type Origine } from "../courriels/noyau/regles.ts";
import { FR } from "../courriels/ecrans/textes.fr.ts";
import { type Boite, boiteLocale } from "./boite.ts";
import { boiteDistante } from "./distante.ts";
import { CAPACITES, IDENTITE, pagesDuSite } from "./identite.mjs";
import { chercherDansLeJournal, effacerDuJournal } from "./journal.ts";
import { suspects } from "./regles.ts";
import { SITE } from "./site.ts";

const qui = (ctx: RouteContext): string => ctx.user?.email ?? ctx.user?.name ?? "inconnu";
const chaine = (v: unknown, max = 200): string => (typeof v === "string" ? v.slice(0, max) : "");
const nombre = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function corps(ctx: RouteContext): Record<string, unknown> {
  const e = ctx.input;
  return typeof e === "object" && e !== null && !Array.isArray(e) ? (e as Record<string, unknown>) : {};
}

/** Une page de liste, ou tout ce qui correspond (export CSV : 5 000 lignes au plus). */
const limiteDe = (c: Record<string, unknown>): number => (c.tout === true ? 5000 : 50);

interface Contexte {
  base: Base;
  poster: Poster;
  boite: Boite | null;
}

async function contexte(ctx: RouteContext): Promise<Contexte> {
  const h = await hote();
  if (!h.base) throw new PluginRouteError("SANS_BASE", "La base du site est introuvable : ces écrans ne marchent que sur le site en ligne ou sous « pnpm dev:moteur ».", 503);
  const base = h.base;
  const email = ctx.email;
  const canal: Canal | null = email ? (m) => email.send(m) : null;
  const poster = posterDuSite({ base, maintenant: Date.now, nouvelId }, canal);
  let boite: Boite | null = null;
  if (SITE.messages === "local") boite = boiteLocale(base, poster, () => lireLesReglages(base));
  else if (typeof SITE.messages === "object") boite = await boiteDistante(SITE.messages.liaison);
  return { base, poster, boite };
}

function route(appel: (ctx: RouteContext, c: Contexte) => Promise<unknown>) {
  return {
    handler: async (ctx: RouteContext) => {
      try {
        return await appel(ctx, await contexte(ctx));
      } catch (erreur) {
        if (erreur instanceof PluginRouteError) throw erreur;
        const detail = erreur instanceof Error ? erreur.message : String(erreur);
        ctx.log.error("Gestion : une route a echoue", { detail: detail.slice(0, 300) });
        throw new PluginRouteError("GESTION_ERREUR", "Le site n'a pas pu lire sa base. Réessayez dans un instant ; si cela recommence, rechargez la page.", 500);
      }
    },
  };
}

function boiteExigee(c: Contexte): Boite {
  if (!c.boite) throw new PluginRouteError("SANS_MESSAGES", "Ce site n'a pas de formulaire de contact : il ne reçoit pas de messages.", 404);
  return c.boite;
}

const filtreDesMessages = (v: unknown): Filtre => (v === "tous" || v === "boite" || (STATUTS as readonly unknown[]).includes(v) ? (v as Filtre) : "boite");
const statutDemande = (v: unknown): Statut => {
  if (!(STATUTS as readonly unknown[]).includes(v)) throw new PluginRouteError("STATUT", "Classement inconnu : choisissez lu, non lu ou archivé.", 400);
  return v as Statut;
};
const FILTRES_ABONNES: readonly FiltreAbonnes[] = ["tous", "inscrit", "attente", "desinscrit"];
const GESTES: readonly GesteDeMasse[] = ["desinscrire", "reinscrire", "supprimer"];

export function createPlugin(): ResolvedPlugin {
  const pages = pagesDuSite({ messages: SITE.messages !== "aucun", lettre: lettreDuSite() !== null });
  return definePlugin({
    ...IDENTITE,
    capabilities: CAPACITES as PluginCapability[],
    admin: { entry: "aloha-gestion/admin", pages },
    routes: {
      site: route(async (_ctx, c) => ({ pages: pages.map((p) => p.path), messages: c.boite ? { distante: c.boite.distante, peutSupprimer: c.boite.peutSupprimer } : null })),

      /* --- Messages ----------------------------------------------------- */
      "non-lus": route(async (_ctx, c) => ({ n: c.boite ? await c.boite.nonLus() : 0 })),
      messages: route(async (ctx, c) => {
        const e = corps(ctx);
        const b = boiteExigee(c);
        const depuis = typeof e.depuis === "string" ? chaine(e.depuis, 400) : nombre(e.depuis);
        const page = await b.liste({ filtre: filtreDesMessages(e.filtre), q: chaine(e.q, 120), depuis, limite: limiteDe(e) });
        return { ...page, distante: b.distante, peutSupprimer: b.peutSupprimer };
      }),
      message: route(async (ctx, c) => {
        const m = await boiteExigee(c).detail(chaine(corps(ctx).id, 80), qui(ctx));
        if (!m) throw new PluginRouteError("INTROUVABLE", "Ce message n'existe plus : il a peut-être été supprimé.", 404);
        return m;
      }),
      "messages-classer": route(async (ctx, c) => {
        const e = corps(ctx);
        return { n: await boiteExigee(c).classer(identifiants(e.ids), statutDemande(e.statut), qui(ctx)) };
      }),
      "messages-supprimer": route(async (ctx, c) => {
        const b = boiteExigee(c);
        if (!b.peutSupprimer) throw new PluginRouteError("REFUSE", "Ces messages vivent dans la base de la boutique, qui ne permet pas de les effacer d'ici : archivez-les.", 400);
        return { n: await b.supprimer(identifiants(corps(ctx).ids), qui(ctx)) };
      }),
      "message-repondre": route(async (ctx, c) => {
        const e = corps(ctx);
        const texte = chaine(e.texte, 20_000).trim();
        if (texte.length < 2) throw new PluginRouteError("VIDE", "Écrivez votre réponse avant de l'envoyer.", 400);
        if (!ctx.email && !boiteExigee(c).distante) return { ok: false, message: "Aucun fournisseur de courriel n'est branché : ouvrez « Brancher les courriels »." };
        return boiteExigee(c).repondre(chaine(e.id, 80), texte, qui(ctx));
      }),

      /* --- Abonnes de la lettre ----------------------------------------- */
      abonnes: route(async (ctx, c) => {
        const e = corps(ctx);
        const filtre = FILTRES_ABONNES.includes(e.filtre as FiltreAbonnes) ? (e.filtre as FiltreAbonnes) : "tous";
        const maintenant = Date.now();
        const page = await chercherDesAbonnes(c.base, { filtre, q: chaine(e.q, 120), depuis: nombre(e.depuis), limite: limiteDe(e) }, maintenant);
        const raisons = new Map(suspects(page.items, maintenant).map((s) => [s.abonne.id, s.raisons]));
        return { items: page.items.map(({ jeton: _jeton, ...a }) => ({ ...a, raisons: raisons.get(a.id) ?? [] })), suite: page.suite, total: page.total, compteurs: await compterLesAbonnes(c.base, maintenant) };
      }),
      "abonnes-suspects": route(async (_ctx, c) => {
        const maintenant = Date.now();
        const tous = await chercherDesAbonnes(c.base, { filtre: "tous", limite: 5000 }, maintenant);
        const liste = suspects(tous.items, maintenant);
        return { ids: liste.map((s) => s.abonne.id), exemples: liste.slice(0, 5).map((s) => s.abonne.adresse) };
      }),
      "abonnes-geste": route(async (ctx, c) => {
        const e = corps(ctx);
        if (!GESTES.includes(e.geste as GesteDeMasse)) throw new PluginRouteError("GESTE", "Geste inconnu.", 400);
        return { n: await gesteSurLesAbonnes(c.base, identifiants(e.ids), e.geste as GesteDeMasse) };
      }),

      /* --- Journal des courriels ---------------------------------------- */
      journal: route(async (ctx, c) => {
        const e = corps(ctx);
        const etat = (ETATS as readonly unknown[]).includes(e.etat) ? (e.etat as Etat) : "";
        const formulaire = (ORIGINES as readonly unknown[]).includes(e.formulaire) ? (e.formulaire as Origine) : "";
        const page = await chercherDansLeJournal(c.base, { etat, formulaire, q: chaine(e.q, 120), depuis: nombre(e.depuis), limite: limiteDe(e) });
        return { ...page, items: page.items.map((l) => ({ ...l, message: l.message ? { a: l.message.a, sujet: l.message.sujet, texte: l.message.texte.slice(0, 4000) } : null, pourquoi: erreurEnClair(FR, l.code, l.erreur ?? "") })) };
      }),
      "journal-supprimer": route(async (ctx, c) => ({ n: await effacerDuJournal(c.base, identifiants(corps(ctx).ids)) })),
      "journal-renvoyer": route(async (ctx, c) => {
        const ids = identifiants(corps(ctx).ids).slice(0, 50);
        if (!ctx.email) return { envoyes: 0, refuses: ids.length, message: "Aucun fournisseur de courriel n'est branché : ouvrez « Brancher les courriels »." };
        const reglages = await lireLesReglages(c.base);
        let envoyes = 0;
        for (const id of ids) {
          const issue = await renvoyer(c.poster, c.base, reglages, id);
          if (typeof issue !== "string" && issue.etat === "envoye") envoyes++;
        }
        return { envoyes, refuses: ids.length - envoyes };
      }),
    },
  });
}

export default createPlugin;
