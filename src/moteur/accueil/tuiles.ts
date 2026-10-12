// src/moteur/accueil/tuiles.ts - les tuiles du tableau de bord (generique) : lesquelles existent sur ce site, dans quel ordre, avec quels mots ; logique pure, sans DOM ni EmDash.
//
// LA REGLE (regle de la maison, 11 octobre 2026) : "EmDash pense comme Apple : simple,
// belles tuiles, parcours utilisateur simple." Trois rangees, toujours dans
// cet ordre :
//   1. ce qui demande une action (messages non lus, commandes a preparer) ;
//   2. les gestes du quotidien (ajouter un produit, ecrire, photos, modifier
//      une page, le design, voir le site, mettre le site a jour) ;
//   3. l'etat du site (derniere publication, plan du site).
// Une tuile n'existe que si son ecran existe sur CE site, lu dans le
// manifeste d'EmDash : pas de tuile Commandes sans boutique, pas de tuile
// Ecrire sans blog. Aucun chiffre invente : un nombre absent (route refusee,
// hors ligne) laisse la tuile sans nombre, jamais a zero.

/** Les noms que prend la collection du blog dans les sites de la maison (house.mjs refuse tout autre libelle pour elles ; socle.selfcheck.mjs compare les listes). */
export const COLLECTIONS_DU_BLOG = ["posts", "blog", "articles", "billets", "carnet", "journal"] as const;

/** Le plan du site que la tuile d'etat relit (index d'Astro ou du moteur, meme adresse). */
export const ADRESSE_DU_PLAN = "/sitemap-index.xml";

export type Icone = "messages" | "commandes" | "produit" | "ecrire" | "photos" | "page" | "design" | "site" | "publier" | "publication" | "plan";

export interface Tuile {
  id: string;
  titre: string;
  detail: string;
  /** Une adresse du back office relative a /_emdash/admin, ou du site quand `externe`. */
  vers: string;
  externe?: boolean;
  icone: Icone;
  /** Le nombre a traiter, seulement s'il a ete lu. */
  nombre?: number;
  /** Quelque chose attend : la tuile prend l'accent. */
  attention?: boolean;
}

export interface Accueil {
  actions: Tuile[];
  gestes: Tuile[];
  etat: Tuile[];
}

/** Ce que la tuile lit du manifeste d'EmDash (AdminManifest de @emdash-cms/admin). */
export interface Manifeste {
  collections: Record<string, { label: string; labelSingular?: string; hidden?: boolean }>;
  plugins: Record<string, { enabled?: boolean; adminPages?: { path: string }[] }>;
}

/** Ce qui a ete mesure, chaque champ absent tant qu'il n'est pas lu (undefined) ou illisible (null). */
export interface Mesures {
  nonLus?: number | null;
  aPreparer?: number | null;
  publication?: { titre: string; quand: string; collection: string; id: string } | null;
  plan?: { adresses: number } | "absent" | null;
  maintenant?: number;
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** La page `chemin` d'une extension active, telle qu'EmDash la met au rail. */
export function aLaPage(m: Manifeste, extension: string, chemin: string): boolean {
  const e = m.plugins[extension];
  return !!e && e.enabled !== false && (e.adminPages ?? []).some((p) => p.path === chemin || p.path === `${chemin}/`);
}

/** Une collection visible au rail (EmDash cache les collections `hidden`). */
export const aLaCollection = (m: Manifeste, slug: string): boolean => !!m.collections[slug] && !m.collections[slug].hidden;

/** La collection du blog de ce site, ou null. */
export function collectionDuBlog(m: Manifeste): string | null {
  return COLLECTIONS_DU_BLOG.find((c) => aLaCollection(m, c)) ?? null;
}

/** "il y a 3 h", "hier", "le 3 octobre" : la date d'une publication dite comme on la dirait. */
export function depuis(iso: string, maintenant: number): string {
  // Une date SQLite sans fuseau ("2026-10-11 10:31:14") est en UTC : lue comme
  // l'heure locale, elle decalerait de deux heures (meme regle que
  // parseTimestamp d'EmDash).
  const naive = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(iso);
  const t = Date.parse(naive ? `${iso.replace(" ", "T")}Z` : iso);
  if (!Number.isFinite(t)) return "";
  const minutes = Math.max(0, Math.round((maintenant - t) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  return `le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(t)}`;
}

function aTraiter(id: string, icone: Icone, titre: string, vers: string, n: number | null | undefined, rien: string, defaut: string, quoi: [string, string]): Tuile {
  const lu = typeof n === "number" && Number.isFinite(n) && n >= 0;
  return {
    id,
    icone,
    titre,
    vers,
    ...(lu ? { nombre: n } : {}),
    attention: lu && n > 0,
    detail: !lu ? defaut : n === 0 ? rien : pluriel(n, quoi[0], quoi[1]),
  };
}

/** Les tuiles du site, rangees en trois rangees ; une rangee vide reste vide (l'ecran ne la montre pas). */
export function tuilesDuSite(m: Manifeste, mesures: Mesures = {}): Accueil {
  const actions: Tuile[] = [];
  if (aLaPage(m, "aloha-gestion", "/messages")) {
    // La barre finale : la pastille de la gestion se pose sur tout lien qui
    // FINIT par /messages (pastille.ts) ; la tuile dit deja son nombre. EmDash
    // ouvre la meme page avec ou sans barre (resolvePluginPagePath).
    actions.push(aTraiter("messages", "messages", "Messages", "/plugins/aloha-gestion/messages/", mesures.nonLus, "Aucun nouveau message", "Les messages du formulaire de contact", ["message à lire", "messages à lire"]));
  }
  if (aLaPage(m, "aloha-commerce", "/commandes")) {
    // Des commandes attendent : la tuile ouvre la liste deja filtree sur elles (filtre lu par commandes.tsx).
    const filtre = typeof mesures.aPreparer === "number" && mesures.aPreparer > 0 ? "?filtre=a_preparer" : "";
    actions.push(aTraiter("commandes", "commandes", "Commandes", `/plugins/aloha-commerce/commandes${filtre}`, mesures.aPreparer, "Aucune commande à préparer", "Les commandes de la boutique", ["commande à préparer", "commandes à préparer"]));
  }

  const gestes: Tuile[] = [];
  if (aLaCollection(m, "products")) gestes.push({ id: "produit", icone: "produit", titre: "Ajouter un produit", detail: "Une nouvelle fiche dans la boutique", vers: "/content/products/new" });
  const blog = collectionDuBlog(m);
  if (blog) gestes.push({ id: "ecrire", icone: "ecrire", titre: "Écrire un article", detail: "Un nouvel article de blog", vers: `/content/${blog}/new` });
  gestes.push({ id: "photos", icone: "photos", titre: "Ajouter des photos", detail: "La médiathèque du site", vers: "/media" });
  if (aLaCollection(m, "sections")) gestes.push({ id: "page", icone: "page", titre: "Modifier une page", detail: "Les textes, les photos et les boutons", vers: "/content/sections" });
  else if (aLaCollection(m, "pages")) gestes.push({ id: "page", icone: "page", titre: "Modifier une page", detail: "Les pages du site", vers: "/content/pages" });
  if (aLaPage(m, "aloha-design", "/")) gestes.push({ id: "design", icone: "design", titre: "Design", detail: "Logo, couleur, police et tailles", vers: "/plugins/aloha-design/" });
  gestes.push({ id: "site", icone: "site", titre: "Voir le site", detail: "S'ouvre dans un nouvel onglet", vers: "/", externe: true });
  if (aLaPage(m, "aloha-deployer", "/")) gestes.push({ id: "publier", icone: "publier", titre: "Mettre le site à jour", detail: "À la fin d'une séance de modifications", vers: "/plugins/aloha-deployer/" });

  const etat: Tuile[] = [];
  const p = mesures.publication;
  if (p) {
    const quand = depuis(p.quand, mesures.maintenant ?? Date.now());
    etat.push({ id: "publication", icone: "publication", titre: "Dernière publication", detail: `${p.titre || "Sans titre"}${quand ? `, ${quand}` : ""}`, vers: `/content/${p.collection}/${p.id}` });
  }
  // Avec l'extension SEO, la tuile ouvre son ecran (il dit l'etat du plan) ; sinon le plan lui-meme.
  const versLePlan: Pick<Tuile, "vers" | "externe"> = aLaPage(m, "aloha-seo", "/") ? { vers: "/plugins/aloha-seo/" } : { vers: ADRESSE_DU_PLAN, externe: true };
  if (mesures.plan === "absent") etat.push({ id: "plan", icone: "plan", titre: "Plan du site", detail: `Introuvable : ${ADRESSE_DU_PLAN} ne répond pas`, ...versLePlan, attention: true });
  else if (mesures.plan) etat.push({ id: "plan", icone: "plan", titre: "Plan du site", detail: `${pluriel(mesures.plan.adresses, "adresse donnée", "adresses données")} aux moteurs de recherche`, ...versLePlan });

  return { actions, gestes, etat };
}

/** Compte les adresses d'un plan : les <url> d'un plan simple, sinon null (un index ne compte que des plans). */
export function adressesDuPlan(xml: string): number | null {
  if (!/<urlset[\s>]/.test(xml)) return null;
  return (xml.match(/<url[\s>]/g) ?? []).length;
}

/** Les plans cites par un index, ramenes a leur chemin (le back office peut tourner sur une autre origine que le site declare). */
export function plansDeLIndex(xml: string): string[] {
  if (!/<sitemapindex[\s>]/.test(xml)) return [];
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => {
    try {
      const u = new URL(m[1], "http://site.invalid");
      return u.pathname + u.search;
    } catch {
      return "";
    }
  }).filter(Boolean);
}
