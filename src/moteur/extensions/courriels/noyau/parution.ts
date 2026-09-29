// src/moteur/extensions/courriels/noyau/parution.ts - les courriels de la lettre d'information : la confirmation d'une inscription, et l'envoi d'un article a chaque abonne confirme.
//
// TOUT PASSE PAR LE CANAL D'EMDASH (le poster de canal.ts), comme le
// formulaire de contact : un envoi = une ligne au journal, un echec se renvoie
// depuis le journal. Chaque abonne recoit SON courriel (son lien personnel de
// desinscription), jamais une copie cachee a toute la liste.
//
// LES PLAFONDS. La confirmation part d'un formulaire public : tous les
// plafonds s'appliquent (le plafond par adresse empeche un robot d'inonder la
// boite d'un tiers). Une parution est un geste de l'administrateur vers des
// adresses confirmees : seul le plafond du mois compte, et l'ecran refuse
// d'avance un envoi qui le depasserait.
//
// LA DESINSCRIPTION EN UN CLIC : le lien du pied de chaque courriel, et les
// en-tetes List-Unsubscribe et List-Unsubscribe-Post (RFC 8058) que les
// messageries transforment en bouton "Se desinscrire".
import type { Base } from "./base.ts";
import type { Poster } from "./canal.ts";
import type { Issue } from "./envoi.ts";
import { type Abonne, abonnesConfirmes, adresseDeLArticle, type Article, articlesPublies, liensDeLAbonne, noterLaParution, type OptionsDeLaLettre, versionPour } from "./lettre.ts";
import type { Langue, Reglages } from "./regles.ts";
import type { TextesDeLaLettre } from "../ecrans/lettre.textes.fr.ts";

/** Ce qui manque pour que la lettre parte : le service relie, Courriels choisi, une adresse d'expedition. */
export type ManqueDeLaLettre = "liaison" | "fournisseur" | "expediteur";

export function manquesDeLaLettre(reglages: Reglages, liaison: boolean, fournisseur = true): ManqueDeLaLettre[] {
  const liste: ManqueDeLaLettre[] = [];
  if (!liaison) liste.push("liaison");
  if (liaison && !fournisseur) liste.push("fournisseur");
  if (!reglages.expediteur) liste.push("expediteur");
  return liste;
}

const echapper = (v: string): string => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Le courriel de confirmation d'une inscription, dans la langue du visiteur. */
export function confirmation(poster: Poster, t: TextesDeLaLettre, adresse: string, site: string, lien: string, reponse: string): Promise<Issue> {
  return poster({ a: [adresse], sujet: t.courriels.confirmationSujet(site), texte: t.courriels.confirmation(site, lien) }, { origine: "lettre", ...(reponse ? { reponse } : {}) });
}

export interface Courriel {
  sujet: string;
  texte: string;
  html: string;
  entetes: Record<string, string>;
}

/**
 * Le courriel d'un article pour un abonne : texte et HTML sobres (titre,
 * chapo, lien), pied avec le lien personnel. Le HTML n'a ni image ni feuille
 * externe : il se lit partout, et rien ne suit le lecteur. Pur.
 */
export function courrielDeLArticle(t: TextesDeLaLettre, article: Article, lienArticle: string, desinscrire: string, site: string): Courriel {
  const texte = [article.titre, "", article.resume, "", `${t.courriels.lire} : ${lienArticle}`, "", "--", t.courriels.pied(site), `${t.courriels.desinscrire} : ${desinscrire}`].join("\n");
  const html = [
    `<!doctype html><html lang="${article.langue}"><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">`,
    `<div style="max-width:560px;margin:0 auto">`,
    `<h1 style="font-size:24px;line-height:1.25;margin:0 0 12px">${echapper(article.titre)}</h1>`,
    article.resume ? `<p style="margin:0 0 20px">${echapper(article.resume)}</p>` : "",
    `<p style="margin:0 0 32px"><a href="${echapper(lienArticle)}" style="color:inherit;font-weight:600">${echapper(t.courriels.lire)}</a></p>`,
    `<p style="margin:0;font-size:13px;color:#555">${echapper(t.courriels.pied(site))} <a href="${echapper(desinscrire)}" style="color:inherit">${echapper(t.courriels.desinscrire)}</a></p>`,
    `</div></body></html>`,
  ].join("");
  return {
    sujet: article.titre,
    texte,
    html,
    entetes: { "List-Unsubscribe": `<${desinscrire}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export interface Parametres {
  base: Base;
  options: OptionsDeLaLettre;
  /** Le groupe de traductions de l'article choisi. */
  groupe: string;
  /** L'origine publique du site ("https://exemple.fr"), pour les liens. */
  origine: string;
  /** La route de la lettre (ROUTE_DE_LA_LETTRE). */
  route: string;
  site: string;
  reponse: string;
  catalogues: Record<Langue, TextesDeLaLettre>;
  maintenant: number;
  nouvelId: () => string;
  par: string | null;
  /** La langue du back office : celle du titre note dans l'historique. */
  langue: Langue;
}

export interface Bilan {
  envoyes: number;
  refuses: number;
  titre: string;
}

/** Les versions publiees d'un article, par son groupe de traductions. */
export async function versionsDe(base: Base, options: OptionsDeLaLettre, groupe: string): Promise<Article[]> {
  return (await articlesPublies(base, options, 200)).filter((a) => a.groupe === groupe);
}

/** Envoie un article a chaque abonne confirme, et note la parution. null si l'article n'est plus publie. */
export async function publier(poster: Poster, p: Parametres): Promise<Bilan | null> {
  const versions = await versionsDe(p.base, p.options, p.groupe);
  if (versions.length === 0) return null;
  const liste: Abonne[] = await abonnesConfirmes(p.base);
  let envoyes = 0;
  let refuses = 0;
  for (const abonne of liste) {
    const article = versionPour(versions, abonne.langue) as Article;
    const t = p.catalogues[article.langue];
    const lien = adresseDeLArticle(p.options, article, p.origine) ?? p.origine;
    const { desinscrire } = liensDeLAbonne(p.origine, p.route, abonne.jeton);
    const c = courrielDeLArticle(t, article, lien, desinscrire, p.site);
    const issue = await poster({ a: [abonne.adresse], sujet: c.sujet, texte: c.texte, html: c.html, entetes: c.entetes }, { origine: "lettre", plafonner: "mois", ...(p.reponse ? { reponse: p.reponse } : {}) });
    if (issue.etat === "envoye") envoyes++;
    else refuses++;
  }
  const titre = versionPour(versions, p.langue)?.titre ?? "";
  await noterLaParution(p.base, { id: p.nouvelId(), quand: p.maintenant, article: p.groupe, titre, envoyes, refuses, par: p.par });
  return { envoyes, refuses, titre };
}
