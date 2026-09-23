// src/moteur/catalogue-bo.regles.ts - les regles pures du catalogue francais du back office : completer, jamais contredire.
//
// PIECE DU SOCLE (voir en tete de catalogue-bo.ts).
//
// CE QUE FAIT LE MOTEUR TOUT SEUL. EmDash 0.38 livre son administration en 28
// langues, compilees par Lingui. Le catalogue francais compte 2428 messages,
// mais 678 y sont encore mot pour mot l'anglais : ce sont les ecrans les plus
// recents (recadrage des medias, tableaux, cles d'acces, publication
// programmee). "Widgets" et "Publish now" en font partie, et un editeur
// francais les lit en anglais.
//
// CE QU'AJOUTE LA MAISON. Un dictionnaire a elle (catalogue-bo.fr.ts), pose
// PAR-DESSUS le catalogue du moteur, et seulement la ou le moteur n'a pas
// traduit. La regle est stricte et se verifie : un message dont la forme
// francaise differe deja de la forme anglaise n'est JAMAIS touche. On complete
// le catalogue, on ne le corrige pas, et une mise a jour d'EmDash qui traduit
// enfin un message reprend aussitot la main.
//
// LA CLE EST LE TEXTE ANGLAIS, PAS L'IDENTIFIANT. Lingui nomme ses messages
// par un hachage court ("tL6W2K") qu'aucun humain ne relit. Le dictionnaire se
// lit donc en clair - anglais d'origine vers francais - et la correspondance
// se refait a chaque demarrage avec le catalogue anglais du moteur, qui est
// deja dans le paquet. Si EmDash reformule une phrase, son hachage change,
// notre entree ne correspond plus a rien et disparait d'elle-meme : le
// self-check (catalogue-bo.selfcheck.ts) le dit avant le deploiement.

/** Ce que Lingui compile : un texte simple sort en `["texte"]`, un texte a variables en tableau imbrique. */
export type MessageCompile = unknown;

/** Un catalogue compile : l'identifiant court d'un message vers sa forme compilee. */
export type Catalogue = Record<string, MessageCompile>;

export interface Dictionnaire {
  /** Les messages sans variable : texte anglais d'origine vers texte francais. */
  simples: Readonly<Record<string, string>>;
  /** Les messages a variables : forme compilee anglaise (en JSON) vers forme compilee francaise. */
  composes: Readonly<Record<string, MessageCompile>>;
  /** Les textes qui s'ecrivent pareil en francais : noms propres, langages, sigles, gabarits. Listes pour que le self-check prouve qu'aucun oubli ne se cache derriere. */
  identiques: readonly string[];
  /**
   * LES MOTS DE LA MAISON. La seule exception a la regle "on complete, on ne
   * corrige pas" : ces messages-la sont poses MEME quand le moteur les a
   * traduits. La liste est courte, explicite, et chaque entree porte sa
   * raison. Elle existe pour le vocabulaire impose par la maison, quand le
   * catalogue du moteur emploie ailleurs un autre mot.
   */
  maison: {
    simples: Readonly<Record<string, string>>;
    composes: Readonly<Record<string, MessageCompile>>;
  };
}

/** Le texte d'un message sans variable, ou null si le message en porte une. */
export function texteSimple(compile: MessageCompile): string | null {
  return Array.isArray(compile) && compile.length === 1 && typeof compile[0] === "string" ? compile[0] : null;
}

/** Vrai quand ce code de langue est du francais ("fr", "fr-CA", "FR"). */
export function estDuFrancais(code: string): boolean {
  return code.toLowerCase().split("-")[0] === "fr";
}

/** Vrai quand le moteur n'a pas traduit ce message : sa forme francaise est encore la forme anglaise. */
function nonTraduit(francais: MessageCompile, anglais: MessageCompile): boolean {
  return JSON.stringify(francais) === JSON.stringify(anglais);
}

/**
 * Le catalogue francais complete par le dictionnaire de la maison. Les messages
 * que le moteur traduit deja sortent intacts ; les autres prennent notre
 * traduction quand nous en avons une.
 */
export function catalogueComplete(francais: Catalogue, anglais: Catalogue, dictionnaire: Dictionnaire): Catalogue {
  const complete: Catalogue = { ...francais };
  for (const [identifiant, source] of Object.entries(anglais)) {
    // Les mots de la maison passent avant tout, traduit ou non.
    const simpleSource = texteSimple(source);
    const impose =
      simpleSource !== null
        ? dictionnaire.maison.simples[simpleSource]
        : dictionnaire.maison.composes[JSON.stringify(source)];
    if (impose !== undefined) {
      complete[identifiant] = simpleSource !== null ? [impose] : impose;
      continue;
    }
    if (!nonTraduit(complete[identifiant], source)) continue;
    const simple = texteSimple(source);
    if (simple !== null) {
      const traduit = dictionnaire.simples[simple];
      if (traduit !== undefined) complete[identifiant] = [traduit];
      continue;
    }
    const compose = dictionnaire.composes[JSON.stringify(source)];
    if (compose !== undefined) complete[identifiant] = compose;
  }
  return complete;
}

/**
 * Ce que la maison n'a pas encore traduit : les messages que le moteur laisse
 * en anglais et que le dictionnaire ne couvre pas, ni par une traduction ni
 * par la liste des textes identiques. Le self-check exige une liste vide.
 */
export function messagesEnAnglais(francais: Catalogue, anglais: Catalogue, dictionnaire: Dictionnaire): string[] {
  const identiques = new Set(dictionnaire.identiques);
  const restants = new Set<string>();
  for (const [identifiant, source] of Object.entries(anglais)) {
    if (!nonTraduit(francais[identifiant], source)) continue;
    const simple = texteSimple(source);
    if (simple !== null) {
      const couvert = dictionnaire.simples[simple] ?? dictionnaire.maison.simples[simple];
      if (couvert === undefined && !identiques.has(simple)) restants.add(simple);
      continue;
    }
    const cle = JSON.stringify(source);
    const couvert = dictionnaire.composes[cle] ?? dictionnaire.maison.composes[cle];
    if (couvert === undefined && !identiques.has(cle)) restants.add(cle);
  }
  return [...restants].sort();
}

/**
 * Les entrees du dictionnaire qui ne servent plus a rien : leur texte anglais
 * n'existe plus dans le catalogue du moteur (phrase reformulee), ou le moteur
 * l'a depuis traduit lui-meme. Le self-check les signale pour qu'on les retire
 * a la montee de version, sans jamais les appliquer.
 */
export function entreesMortes(francais: Catalogue, anglais: Catalogue, dictionnaire: Dictionnaire): string[] {
  const vivantes = new Set<string>();
  for (const [identifiant, source] of Object.entries(anglais)) {
    if (!nonTraduit(francais[identifiant], source)) continue;
    const simple = texteSimple(source);
    vivantes.add(simple ?? JSON.stringify(source));
  }
  // Un mot de la maison reste vivant tant que son texte anglais existe, meme
  // si le moteur l'a traduit : c'est justement le cas qu'il sert a couvrir.
  const anglaisConnu = new Set<string>();
  for (const source of Object.values(anglais)) anglaisConnu.add(texteSimple(source) ?? JSON.stringify(source));
  const aVerifier = [
    ...Object.keys(dictionnaire.simples).map((cle) => [cle, vivantes] as const),
    ...Object.keys(dictionnaire.composes).map((cle) => [cle, vivantes] as const),
    ...dictionnaire.identiques.map((cle) => [cle, vivantes] as const),
    ...Object.keys(dictionnaire.maison.simples).map((cle) => [cle, anglaisConnu] as const),
    ...Object.keys(dictionnaire.maison.composes).map((cle) => [cle, anglaisConnu] as const),
  ];
  return aVerifier.filter(([cle, connues]) => !connues.has(cle)).map(([cle]) => cle).sort();
}
