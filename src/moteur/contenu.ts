// src/moteur/contenu.ts - les textes rediges des pages : la table des sections lue dans les deux sens, des fichiers vers la graine et de la base vers la page.
//
// POURQUOI. Le texte qui se voit en premier sur l'accueil et sur les pages
// fixes (titre de tete, chapo, boutons, titres de section) vient du
// dictionnaire de src/i18n et de src/config/legalData.json.ts, pas de la
// base : un editeur connecte basculait "Edit" et ne pouvait rien y changer.
// Moteur allume, chaque section redigee est une entree de la collection
// `sections`, et ce qu'elle publie se pose ICI sur le dictionnaire des
// fichiers. Le resultat a la forme exacte du dictionnaire : aucun composant
// n'a ete reecrit pour lire la base, il lit ses textes comme avant.
//
// CE QUI RESTE DANS LES FICHIERS : les libelles de l'interface (menu, pied de
// page, champs de formulaire, pagination, etats vides, gabarits a jetons comme
// "{count} posts"), qui ne sont pas de la redaction. Une phrase que la base ne
// porte pas, une section absente ou depubliee, un champ vide : le texte des
// fichiers reste. Le dictionnaire complet est la base, la base le complete.
//
// Aucun import de valeur ici, seulement des types : scripts/graine-sections.mjs
// et contenu.selfcheck.ts chargent ce module dans Node, sans Vite ni alias.
import type { LegalDocument } from "@config/types/configDataTypes";
import type { Dictionary } from "@i18n";
import { type Chemin, SECTIONS, type Section, type Tranche } from "./contenu.sections.ts";

export { SECTIONS };
export type { ChampSimple, PageDuSite, Section, Tranche } from "./contenu.sections.ts";

/** Tout ce qu'une page lit : le dictionnaire de la langue et les deux documents legaux. */
export type Textes = Dictionary & { legalData: { privacy: LegalDocument; terms: LegalDocument } };

/** Une entree de la collection `sections`, telle que la base la rend et que la graine l'ecrit. */
export type DonneesDeSection = Record<string, unknown>;

type Objet = Record<string, unknown>;

/** Lit "a.b.c" dans un objet. Un chemin absent rend undefined. */
export function lire(objet: unknown, chemin: Chemin): unknown {
  return chemin.split(".").reduce<unknown>((courant, cle) => (courant as Objet | undefined)?.[cle], objet);
}

/** Ecrit "a.b.c" dans un objet, en creant les etages qui manquent. */
export function ecrire(objet: Objet, chemin: Chemin, valeur: unknown): void {
  const cles = chemin.split(".");
  const derniere = cles.pop() as string;
  let courant: Objet = objet;
  for (const cle of cles) {
    if (typeof courant[cle] !== "object" || courant[cle] === null) courant[cle] = {};
    courant = courant[cle] as Objet;
  }
  courant[derniere] = valeur;
}

/** Une valeur venue de la base qui dit quelque chose. Null et undefined valent "non renseigne". */
const renseigne = (valeur: unknown): valeur is string => typeof valeur === "string";

/** Une date de revision : "2026-01-15" dans les fichiers, un datetime ISO dans la base. */
const versLaBase = (jour: string): string => new Date(`${jour}T00:00:00.000Z`).toISOString();
const versLesFichiers = (valeur: string): string => valeur.slice(0, 10);

/** Les lignes du champ repete, lues dans les textes. Un objet du dictionnaire donne une seule ligne. */
function extraireLaListe(textes: Textes, tranche: Tranche): Objet[] {
  if ("objet" in tranche) {
    const objet = (lire(textes, tranche.objet) as Objet | undefined) ?? {};
    return [Object.fromEntries(Object.entries(tranche.cles).map(([champ, cle]) => [champ, objet[cle]]))];
  }
  const elements = (lire(textes, tranche.liste) as unknown[] | undefined) ?? [];
  if ("texte" in tranche) return elements.map((phrase) => ({ [tranche.texte]: phrase }));
  return elements.map((element) =>
    Object.fromEntries(Object.entries(tranche.cles).map(([champ, cle]) => [champ, (element as Objet)[cle]])),
  );
}

/** Le contenu d'une section, lu dans les textes : ce que la graine porte. L'ordre des champs est celui de la table. */
export function extraireLaSection(section: Section, textes: Textes): DonneesDeSection {
  const donnees: DonneesDeSection = { page: section.page };
  for (const [champ, chemin] of Object.entries(section.champs)) {
    const valeur = lire(textes, chemin);
    if (valeur === undefined) continue;
    donnees[champ] = champ === "revised" ? versLaBase(String(valeur)) : valeur;
  }
  if (section.arguments) donnees.arguments = extraireLaListe(textes, section.arguments);
  return donnees;
}

/**
 * Pose les lignes du champ repete sur les textes : elles REMPLACENT la liste,
 * une ligne retiree dans le back office disparait de la page, une ligne
 * ajoutee y entre. Un sous-champ vide garde le texte de la ligne de meme rang
 * des fichiers ; une ligne ajoutee au-dela n'a que ce qu'elle porte.
 */
function appliquerLaListe(textes: Objet, tranche: Tranche, lignes: Objet[]): void {
  if ("objet" in tranche) {
    // Un objet du dictionnaire : la premiere ligne remplace ses textes, champ par champ.
    const ligne = lignes[0] ?? {};
    for (const [champ, cle] of Object.entries(tranche.cles)) {
      if (renseigne(ligne[champ]) && ligne[champ] !== "") ecrire(textes, `${tranche.objet}.${cle}`, ligne[champ]);
    }
    return;
  }
  const anciennes = (lire(textes, tranche.liste) as unknown[] | undefined) ?? [];
  if ("texte" in tranche) {
    const phrases = lignes.map((ligne, i) => (renseigne(ligne[tranche.texte]) ? ligne[tranche.texte] : (anciennes[i] ?? "")));
    ecrire(textes, tranche.liste, phrases);
    return;
  }
  const elements = lignes.map((ligne, i) => {
    const ancien = (anciennes[i] as Objet | undefined) ?? {};
    const element: Objet = { ...ancien };
    for (const [champ, cle] of Object.entries(tranche.cles)) {
      element[cle] = renseigne(ligne[champ]) ? ligne[champ] : (ancien[cle] ?? "");
    }
    return element;
  });
  ecrire(textes, tranche.liste, elements);
}

/** Pose une entree de la base sur les textes (modifies en place). Un champ non renseigne garde le texte des fichiers. */
export function appliquerLaSection(section: Section, textes: Textes, donnees: DonneesDeSection): void {
  const objet = textes as unknown as Objet;
  for (const [champ, chemin] of Object.entries(section.champs)) {
    const valeur = donnees[champ];
    if (!renseigne(valeur) || valeur === "") continue;
    ecrire(objet, chemin, champ === "revised" ? versLesFichiers(valeur) : valeur);
  }
  if (section.arguments && Array.isArray(donnees.arguments) && donnees.arguments.length > 0) {
    appliquerLaListe(objet, section.arguments, donnees.arguments as Objet[]);
  }
}

/** Les textes des fichiers, completes par les sections que la base publie. Les fichiers ne sont pas modifies : la copie l'est. */
export function textesAvecLaBase(fichiers: Textes, sections: ReadonlyMap<string, DonneesDeSection>): Textes {
  const textes = structuredClone(fichiers);
  for (const section of SECTIONS) {
    const donnees = sections.get(section.slug);
    if (donnees) appliquerLaSection(section, textes, donnees);
  }
  return textes;
}
