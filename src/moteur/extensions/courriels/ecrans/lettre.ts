// src/moteur/extensions/courriels/ecrans/lettre.ts - l'ecran "Lettre d'information" : les abonnes, l'envoi d'un article, le retrait d'une adresse, les derniers envois.
//
// Comme le journal (voir journal.ts) : Block Kit 0.38 n'a ni ligne cliquable
// ni liste qui affiche son libelle. Les deux listes ("Article a envoyer",
// "Adresse a retirer") prennent donc des valeurs lisibles, et la vue gardee
// par personne (KV) retraduit le libelle choisi en identifiant. Chaque geste
// qui envoie ou efface demande une confirmation.
import type { Abonne, Article, Parution } from "../noyau/lettre.ts";
import type { ManqueDeLaLettre } from "../noyau/parution.ts";
import { type Bloc, dateCourte, date, depuis, type Reponse } from "./blocs.ts";
import type { TextesDeLaLettre } from "./lettre.textes.fr.ts";
import type { Textes } from "./textes.fr.ts";

export const ACTIONS = {
  article: "lettre:article",
  envoyer: "lettre:envoyer",
  abonne: "lettre:abonne",
  retirer: "lettre:retirer",
  actualiser: "lettre:actualiser",
} as const;

export interface VueDeLaLettre {
  article: string | null;
  abonne: string | null;
  articles: Record<string, string>;
  abonnes: Record<string, string>;
}

function table(brut: unknown): Record<string, string> {
  if (typeof brut !== "object" || brut === null) return {};
  const propre: Record<string, string> = {};
  for (const [libelle, id] of Object.entries(brut).slice(0, 501)) if (typeof id === "string" && id.length <= 80 && libelle.length <= 300) propre[libelle] = id;
  return propre;
}

/** Relit une vue gardee sans lui faire confiance. */
export function lireVueDeLaLettre(brut: unknown): VueDeLaLettre {
  const v = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : {};
  const id = (x: unknown) => (typeof x === "string" && x.length <= 80 ? x : null);
  return { article: id(v.article), abonne: id(v.abonne), articles: table(v.articles), abonnes: table(v.abonnes) };
}

/** La vue apres un choix dans une liste (le libelle est retraduit). Pur. */
export function choisir(vue: VueDeLaLettre, action: string, valeur: unknown): VueDeLaLettre {
  const texte = typeof valeur === "string" ? valeur : "";
  if (action === ACTIONS.article) return { ...vue, article: vue.articles[texte] ?? null };
  if (action === ACTIONS.abonne) return { ...vue, abonne: vue.abonnes[texte] ?? null };
  return vue;
}

/** Un libelle par article (groupe de traductions) : son titre, et sa date quand deux titres se ressemblent. */
export function libellesDesArticles(t: Textes, articles: readonly Article[], langue: "fr" | "en"): { libelle: string; groupe: string }[] {
  const parGroupe = new Map<string, Article[]>();
  for (const a of articles) parGroupe.set(a.groupe, [...(parGroupe.get(a.groupe) ?? []), a]);
  const vus = new Set<string>();
  const sortie: { libelle: string; groupe: string }[] = [];
  for (const [groupe, versions] of parGroupe) {
    const a = versions.find((v) => v.langue === langue) ?? versions[0];
    if (!a) continue;
    let libelle = a.titre || a.slug;
    if (vus.has(libelle) && a.publie_le) libelle = `${libelle} (${dateCourte(t, Date.parse(a.publie_le))})`;
    vus.add(libelle);
    sortie.push({ libelle, groupe });
  }
  return sortie;
}

export interface DonneesDeLaLettre {
  manques: ManqueDeLaLettre[];
  compte: { inscrits: number; attente: number };
  abonnes: Abonne[];
  articles: { libelle: string; groupe: string }[];
  parutions: Parution[];
  vue: VueDeLaLettre;
  maintenant: number;
  bandeau?: Bloc;
}

export function ecranDeLaLettre(t: Textes, l: TextesDeLaLettre, d: DonneesDeLaLettre, manquesEnClair: Record<ManqueDeLaLettre, string>): Reponse {
  const blocks: Bloc[] = [
    { type: "header", text: l.page },
    { type: "section", text: l.intro },
    ...(d.bandeau ? [d.bandeau] : []),
  ];
  if (d.manques.length) blocks.push({ type: "banner", variant: "alert", title: l.pasPrete, description: l.manques(d.manques.map((m) => manquesEnClair[m])) });
  blocks.push({
    type: "stats",
    items: [
      { label: l.inscrits, value: d.compte.inscrits, description: l.inscritsDetail },
      { label: l.attente, value: d.compte.attente, description: l.attenteDetail },
    ],
  });

  // Envoyer un article.
  blocks.push({ type: "divider" }, { type: "header", text: l.envoyer }, { type: "context", text: l.envoyerAide });
  const choisi = d.articles.find((a) => a.groupe === d.vue.article) ?? null;
  if (d.articles.length === 0) blocks.push({ type: "section", text: l.aucunArticle });
  else {
    blocks.push({
      type: "actions",
      block_id: `lettre-article-${choisi?.groupe ?? "aucun"}`,
      // Une premiere ligne "Choisissez un article" : la liste vide d'EmDash
      // n'affiche rien de lisible, et apres un envoi la liste y revient.
      elements: [{ type: "select", action_id: ACTIONS.article, label: l.choisirArticle, options: [l.aucunArticleChoisi, ...d.articles.map((a) => a.libelle)].map((x) => ({ label: x, value: x })), initial_value: choisi?.libelle ?? l.aucunArticleChoisi }],
    });
    if (choisi && d.compte.inscrits === 0) blocks.push({ type: "section", text: l.aucunAbonne });
    if (choisi && d.compte.inscrits > 0) {
      const deja = d.parutions.find((p) => p.article === choisi.groupe);
      if (deja) blocks.push({ type: "context", text: l.dejaEnvoye(date(t, deja.quand)) });
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: ACTIONS.envoyer,
            label: l.bouton(d.compte.inscrits),
            style: "primary",
            value: choisi.groupe,
            confirm: {
              title: l.confirmerTitre,
              text: deja ? l.confirmerDeja(choisi.libelle, date(t, deja.quand), d.compte.inscrits) : l.confirmerTexte(choisi.libelle, d.compte.inscrits),
              confirm: l.confirmerOui,
              deny: l.confirmerNon,
            },
          },
        ],
      });
    }
  }

  // Les abonnes : un tableau pour ce qui se compare.
  blocks.push(
    { type: "divider" },
    { type: "section", text: l.liste, accessory: { type: "button", action_id: ACTIONS.actualiser, label: t.actualiser, style: "secondary" } },
    {
      type: "table",
      page_action_id: "lettre:table",
      empty_text: l.vide,
      columns: [
        { key: "adresse", label: l.colonnes.adresse },
        { key: "langue", label: l.colonnes.langue },
        { key: "etat", label: l.colonnes.etat, format: "badge" },
        { key: "depuis", label: l.colonnes.depuis },
      ],
      rows: d.abonnes.slice(0, 20).map((a) => ({ adresse: a.adresse, langue: l.langues[a.langue], etat: l.etats[a.etat], depuis: depuis(t, a.confirme_le ?? a.demande_le, d.maintenant) })),
    },
  );

  // Les gestes sur la liste vivent dans l'ecran "Abonnes de la lettre" (extension Gestion) : selection, masse, recherche, export.
  blocks.push({ type: "context", text: l.gererAilleurs });

  // Les derniers envois.
  blocks.push(
    { type: "divider" },
    { type: "header", text: l.parutions },
    {
      type: "table",
      page_action_id: "lettre:parutions",
      empty_text: l.aucuneParution,
      columns: [
        { key: "quand", label: l.colonnesParutions.quand },
        { key: "article", label: l.colonnesParutions.article },
        { key: "envoyes", label: l.colonnesParutions.envoyes },
        { key: "refuses", label: l.colonnesParutions.refuses },
      ],
      rows: d.parutions.map((p) => ({ quand: date(t, p.quand), article: p.titre, envoyes: String(p.envoyes), refuses: String(p.refuses) })),
    },
  );
  return { blocks };
}
