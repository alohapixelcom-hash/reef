// src/moteur/accueil/extension.ts - l'extension EmDash qui pose la carte du site sur le tableau de bord : dernier contenu publie, version servie, deux raccourcis.
//
// POURQUOI UNE SECONDE EXTENSION : dans le back office, une extension est soit
// "blocs" (ses pages sont decrites en Block Kit, comme "Tout deployer"), soit
// "React" (elle fournit ses composants). Le menu n'affiche la page d'une
// extension React que si elle a un composant de page : meler les deux ferait
// disparaitre "Tout deployer" du menu. Block Kit n'a pas d'element lien, et
// cette carte en porte deux : elle est donc en React, dans sa propre extension.
//
// Tout passe par les API publiques des extensions : `admin.widgets` pour la
// carte, une route pour ses donnees, `ctx.content` pour lire le contenu.
import { definePlugin, type ResolvedPlugin, type RouteContext, SchemaRegistry } from "emdash";
import { getDb } from "emdash/runtime";
import { IDENTITE as DEPLOYER } from "../deployer/identite.mjs";
import { heure } from "../deployer/regles";
import { langueDesTextes } from "../langue-bo.regles";
import { versionServie } from "../version";
import { CARTE, IDENTITE } from "./identite.mjs";
import { TEXTES_DE_LA_CARTE } from "./textes";

/** Ce que la route rend au composant : des faits et des phrases, deja dans la langue de la personne. */
export interface EtatDuSite {
  dernier: { titre: string; quand: string; collection: string; langue: string | null; edition: string } | null;
  version: string;
  construit: string;
  liens: { site: string; deployer: string };
  textes: { dernier: string; aucun: string; version: string; voir: string; deployer: string; nouvelOnglet: string };
}

const texte = (valeur: unknown): string | null => (typeof valeur === "string" && valeur.trim() !== "" ? valeur : null);

/** Le contenu publie le plus recemment, toutes collections confondues. */
async function dernierPublie(ctx: RouteContext) {
  if (!ctx.content) return null;
  const collections = await new SchemaRegistry(await getDb()).listCollections();
  let dernier: { titre: string; quand: string; collection: string; langue: string | null; id: string; slug: string } | null = null;
  for (const collection of collections) {
    const page = await ctx.content.list(collection.slug, {
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      limit: 1,
    });
    const item = page.items[0];
    if (!item?.publishedAt) continue;
    if (dernier && Date.parse(dernier.quand) >= Date.parse(item.publishedAt)) continue;
    dernier = {
      titre: texte(item.data.title) ?? texte(item.data.name) ?? item.slug ?? item.id,
      quand: item.publishedAt,
      collection: collection.label,
      langue: item.locale,
      id: item.id,
      slug: collection.slug,
    };
  }
  return dernier;
}

async function etat(ctx: RouteContext): Promise<EtatDuSite> {
  const langue = langueDesTextes(ctx.request, __ALOHA_BO_LANGUE__);
  const T = TEXTES_DE_LA_CARTE[langue];
  const lire = (iso: string): string => heure(iso, langue, __ALOHA_BO_FUSEAU__);
  const dernier = await dernierPublie(ctx);
  return {
    dernier: dernier && {
      titre: dernier.titre,
      quand: lire(dernier.quand),
      collection: dernier.collection,
      langue: dernier.langue,
      edition: `/_emdash/admin/content/${dernier.slug}/${dernier.id}`,
    },
    version: versionServie.version,
    construit: T.construit(lire(versionServie.construit)),
    liens: { site: "/", deployer: `/_emdash/admin/plugins/${DEPLOYER.id}/` },
    textes: { dernier: T.dernier, aucun: T.aucun, version: T.version, voir: T.voir, deployer: T.deployer, nouvelOnglet: T.nouvelOnglet },
  };
}

export function createPlugin(): ResolvedPlugin {
  // Le titre de la carte est fige au demarrage : il suit la langue par defaut du site.
  const titre = TEXTES_DE_LA_CARTE[__ALOHA_BO_LANGUE__?.toLowerCase().split("-")[0] === "fr" ? "fr" : "en"].titre;
  return definePlugin({
    ...IDENTITE,
    capabilities: ["content:read"],
    routes: {
      // Qui voit le tableau de bord voit la carte : le droit de lire le contenu suffit.
      etat: { permission: "content:read", handler: etat },
    },
    admin: {
      // Le composant lui-meme est declare par moteur.config.mjs (adminEntry).
      entry: "aloha-accueil/carte",
      widgets: [{ id: CARTE, title: titre, size: "full" }],
    },
  });
}

export default createPlugin;
