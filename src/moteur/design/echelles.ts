// src/moteur/design/echelles.ts - les choix de la page Design du back office (generique) : la taille des titres H1, H2 et H3, la taille du texte et le rayon des coins, en listes fermees, et la feuille qui repeint les jetons du theme.
//
// DES CHOIX CONTRAINTS, PAS DES CHAMPS LIBRES. Comme la couleur (palette.ts)
// et la police (typographie.ts), chaque reglage est une liste fermee : un
// editeur choisit "Généreuse", il ne tape pas "37px" qui casserait la mise en
// page sur un telephone. L'idee vient de la taille de texte reglable des
// systemes d'Apple (Dynamic Type) : quelques crans nommes, une hierarchie qui
// reste la meme a chaque cran, jamais une valeur au pixel.
//
// PAR BALISE DE TITRE. Un H1, un H2 ou un H3 grandit ou se resserre avec
// `zoom`, quel que soit le jeton de taille que le theme lui donne a chaque
// largeur : chez Kai, le meme jeton sert un H1 sur telephone et un H2 sur
// ordinateur, un jeton ne dit donc pas un niveau de titre. `zoom` agit sur la
// balise elle-meme (sa taille, son interligne, ses marges), ce qu'on demande.
//
// LE TEXTE ET LES COINS SUIVENT LES JETONS DE LA MAISON, les memes dans tous
// les sites : la racine fluide de global.css (html { font-size }) et les deux
// rayons de tokens.css (--radius-card, --radius-panel). Un theme qui s'en
// ecarte le declare dans son adaptateur (src/moteur/theme.ts,
// JETONS_DU_DESIGN) ; le self-check du site compare la declaration a ses
// feuilles.
//
// CHAMP VIDE, OU "Standard" : AUCUNE REGLE, le rendu d'origine. Generique et
// pur, sans import : le Worker le calcule a chaque page en quelques
// microsecondes, et le build statique ne le lit jamais (rien sur la requete).

/** Le cran d'une taille : la valeur du champ et le facteur applique a la valeur d'origine. */
export const TAILLES_DES_TITRES = {
  Compacte: 0.86,
  Standard: 1,
  "Généreuse": 1.16,
} as const;

/**
 * La taille du texte courant. Le cran compact garde 15 px au moins sur une
 * racine de 16 px (le plancher de lecture que le banc de rendu mesure deja) ;
 * le cran genereux donne 18 px, l'equivalent d'un cran au-dessus de la taille
 * par defaut chez Apple (17 pt devient 19 pt).
 */
export const TAILLES_DU_TEXTE = {
  Compacte: 0.9375,
  Standard: 1,
  "Généreuse": 1.125,
} as const;

/**
 * Les rayons des coins : des valeurs fixes, les memes sur tous les themes,
 * pour qu'un nom dise la meme chose partout. "petit" vaut pour les cartes et
 * les champs, "grand" pour les panneaux. Les boutons restent des pilules
 * (regle de la maison) : aucun theme ne declare --radius-pill ici.
 */
export const RAYONS = {
  Net: { petit: "0.25rem", grand: "0.5rem" },
  Doux: { petit: "0.75rem", grand: "1.25rem" },
  Arrondi: { petit: "1.5rem", grand: "2.25rem" },
} as const;

export type NomDeTaille = keyof typeof TAILLES_DES_TITRES;
export type NomDeRayon = keyof typeof RAYONS;

/** Le retour au rayon livre avec le theme : ce choix vaut vide. */
export const RAYON_D_ORIGINE = "Rayon d'origine du thème";

/** Les choix des tailles, dans l'ordre de la graine : Standard (le theme) d'abord. */
export const CHOIX_DE_TAILLE: readonly string[] = ["Standard", "Compacte", "Généreuse"];

/** Les choix du rayon, dans l'ordre de la graine : l'origine d'abord. */
export const CHOIX_DE_RAYON: readonly string[] = [RAYON_D_ORIGINE, ...Object.keys(RAYONS)];

/** Les champs de l'entree "site" que la page Design ecrit, en plus de brand_color, font et logo_dark. */
export const CHAMPS_DU_DESIGN = ["h1_size", "h2_size", "h3_size", "text_size", "radius"] as const;
export type ChampDuDesign = (typeof CHAMPS_DU_DESIGN)[number];

/** Les jetons que la feuille repeint : la racine du texte et les rayons. */
export interface JetonsDuDesign {
  /** La taille d'origine de la racine (html { font-size }), ou null si le theme laisse celle du navigateur. */
  racine: string | null;
  /** Les rayons du theme, chacun range "petit" (cartes, champs) ou "grand" (panneaux). */
  rayons: Readonly<Record<string, "petit" | "grand">>;
}

/** Les jetons de la maison, ceux de tous les sites du socle (global.css et tokens.css). */
export const JETONS_DE_LA_MAISON: JetonsDuDesign = {
  racine: "clamp(1rem, 0.95rem + 0.25vw, 1.125rem)",
  rayons: { "--radius-card": "petit", "--radius-panel": "grand" },
};

/** Ce que la feuille lit dans l'entree "site" : les cinq champs, vides ou non. */
export type ChoixDuDesign = Partial<Record<ChampDuDesign, unknown>>;

const facteurDuTitre = (v: unknown): number | null => (typeof v === "string" && v in TAILLES_DES_TITRES && v !== "Standard" ? TAILLES_DES_TITRES[v as NomDeTaille] : null);
const facteurDuTexte = (v: unknown): number | null => (typeof v === "string" && v in TAILLES_DU_TEXTE && v !== "Standard" ? TAILLES_DU_TEXTE[v as NomDeTaille] : null);
const rayonDe = (v: unknown): (typeof RAYONS)[NomDeRayon] | null => (typeof v === "string" && v in RAYONS ? RAYONS[v as NomDeRayon] : null);

/** Une valeur d'origine multipliee : calc(valeur * facteur), lisible et fluide comme l'origine. */
export function multiplier(valeur: string, facteur: number): string {
  return `calc(${valeur.trim()} * ${Number(facteur.toFixed(4))})`;
}

/** Vrai quand l'entree ne regle aucun des cinq champs : la page garde le rendu d'origine. */
export function designDuTheme(choix: ChoixDuDesign | null | undefined): boolean {
  if (!choix) return true;
  return facteurDuTitre(choix.h1_size) === null && facteurDuTitre(choix.h2_size) === null && facteurDuTitre(choix.h3_size) === null && facteurDuTexte(choix.text_size) === null && rayonDe(choix.radius) === null;
}

/**
 * La feuille a poser dans la page pour ces choix, ou null (aucune balise : le
 * rendu d'origine). Une valeur inconnue (un champ tape a la main, une
 * ancienne valeur) est ignoree : elle rend l'origine, jamais une page cassee.
 * Sans jetons propres, ceux de la maison.
 */
export function feuilleDuDesign(choix: ChoixDuDesign | null | undefined, jetons: JetonsDuDesign | null | undefined = JETONS_DE_LA_MAISON): string | null {
  if (!choix || designDuTheme(choix)) return null;
  const j = jetons ?? JETONS_DE_LA_MAISON;
  const regles: string[] = [];
  const rayon = rayonDe(choix.radius);
  if (rayon) {
    const variables = Object.entries(j.rayons).map(([nom, sorte]) => `${nom}:${rayon[sorte]}`);
    if (variables.length) regles.push(`:root{${variables.join(";")}}`);
  }
  const t = facteurDuTexte(choix.text_size);
  if (t !== null) regles.push(`html{font-size:${multiplier(j.racine ?? "100%", t)}}`);
  for (const niveau of ["h1", "h2", "h3"] as const) {
    const f = facteurDuTitre(choix[`${niveau}_size`]);
    if (f !== null) regles.push(`${niveau}{zoom:${Number(f.toFixed(4))}}`);
  }
  return regles.length ? regles.join("") : null;
}

/**
 * Les jetons qui ne disent pas la verite des feuilles du site : la racine
 * absente de global.css, un rayon absent de tokens.css ou declare dans
 * `@theme inline` (recopie tel quel dans chaque utilitaire : le redefinir sur
 * :root ne changerait rien). Vide quand tout est fidele. Le self-check du
 * site l'appelle avec le texte de ses deux feuilles.
 */
export function jetonsInfideles(jetons: JetonsDuDesign, tokens: string, globale: string): string[] {
  const nu = tokens.replace(/\/\*[\s\S]*?\*\//g, "");
  const motif = (nom: string) => new RegExp(`(?:^|[\\s;{])${nom.replace(/[-]/g, "\\-")}\\s*:`);
  const ecarts: string[] = [];
  if (jetons.racine !== null) {
    const racine = jetons.racine.replace(/\s+/g, " ");
    const html = [...globale.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|[\s}])html\s*\{([^}]*)\}/g)].map((m) => m[1]!.replace(/\s+/g, " "));
    if (!html.some((b) => b.includes(`font-size: ${racine}`) || b.includes(`font-size:${racine}`))) ecarts.push(`racine : global.css ne pose pas html { font-size: ${jetons.racine} }`);
  }
  for (const nom of Object.keys(jetons.rayons)) {
    const i = nu.search(motif(nom));
    if (i < 0) {
      ecarts.push(`rayon ${nom} : absent de tokens.css`);
      continue;
    }
    const bloc = (nu.slice(0, i).match(/@theme[^{]*\{/g) ?? []).pop() ?? "";
    if (/inline/.test(bloc)) ecarts.push(`rayon ${nom} : declare dans @theme inline, la feuille ne pourrait pas le changer`);
  }
  return ecarts;
}
