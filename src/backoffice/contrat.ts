// contrat.ts - les capacites explicites du back office Aloha partage.
export type Role = "admin" | "customer";
export type Identite = { email: string; role: Role };
export type Langue = "fr" | "en";
export type Capacites = {
  articles: boolean;
  produits: boolean;
  commandes: boolean;
  clients: boolean;
  espaceClient: boolean;
};
export type SiteEditorial = {
  id: string;
  depot: string;
  branche: string;
  dossierArticles: string;
  dossierAuteurs: string;
  dossierSujets: string;
  dossierImages: string;
  fichierImages?: string;
  format: "reef";
  langues: readonly Langue[];
};
export type ServicesEditoriaux = {
  // Cette garde est obligatoire : aucun mode demonstration n'autorise l'ecriture.
  autoriser: (request: Request, site: SiteEditorial) => Promise<Identite | Response>;
  github: (path: string, init?: RequestInit) => Promise<Response>;
};

/** Les identifiants restent des noms de fichiers, jamais des chemins fournis par le client. */
export function identifiantValide(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}

/** Le client ne choisit ni depot, ni branche, ni chemin arbitraire. */
export function verifierConfiguration(site: SiteEditorial): void {
  if (site.format !== "reef" || !identifiantValide(site.id) || !/^[\w.-]+\/[\w.-]+$/.test(site.depot)) {
    throw new Error("Configuration editoriale invalide");
  }
  for (const path of [site.dossierArticles, site.dossierAuteurs, site.dossierSujets, site.dossierImages, ...(site.fichierImages ? [site.fichierImages] : [])]) {
    if (!path || path.startsWith("/") || path.split("/").some((part) => !part || part === ".." || part === ".")) {
      throw new Error("Dossier editorial invalide");
    }
  }
  if (!site.branche || !site.langues.length || site.langues.some((value) => !["fr", "en"].includes(value))) {
    throw new Error("Branche ou langue invalide");
  }
}
