// scripts/markdown-en-texte-riche.mjs - le Markdown d'un billet en Portable Text d'EmDash, tel que moteur-import.mjs le verse en base.
import { markdownToPortableText } from "emdash/client";

/**
 * Recolle les lignes d'un meme paragraphe.
 *
 * Les fiches sont ecrites a 80 colonnes, et le convertisseur du client lit le
 * Markdown LIGNE PAR LIGNE : sans ce passage, chaque ligne devenait un
 * paragraphe et une description de trois paragraphes en affichait douze. En
 * Markdown, un saut de ligne simple vaut une espace ; on l'ecrit donc ainsi.
 * Titres, listes, citations, tableaux et blocs de code gardent leurs lignes.
 *
 * Une ligne qui commence par "17. " au milieu d'un paragraphe est une fin de
 * phrase, pas une liste : comme en Markdown, seule "1. " peut interrompre un
 * paragraphe. La cire tiede ("cool for 12 to / 17. Above 22 it drags") y a
 * gagne une liste numerotee le temps d'un essai.
 */
export function deplier(markdown) {
  const BLOC = /^(#{1,6} |> |[-*+] |\d+\. |\||```)/;
  const COUPE_UN_PARAGRAPHE = /^(#{1,6} |> |[-*+] |1\. |\||```)/;
  const sortie = [];
  let dansLeCode = false;
  let dansUnParagraphe = false;
  for (const ligne of markdown.split(/\r?\n/)) {
    if (ligne.startsWith("```")) dansLeCode = !dansLeCode;
    const vide = ligne.trim() === "";
    const suite = dansUnParagraphe && !dansLeCode && !vide && !COUPE_UN_PARAGRAPHE.test(ligne);
    if (suite) sortie[sortie.length - 1] = `${sortie.at(-1)} ${ligne.trim()}`;
    else sortie.push(ligne);
    dansUnParagraphe = suite || (!dansLeCode && !vide && !BLOC.test(ligne));
  }
  return sortie.join("\n");
}

/** Applique une retouche au texte d'un Markdown, jamais a son code (blocs et code en ligne). */
function horsDuCode(markdown, retouche) {
  let dansLeCode = false;
  return markdown
    .split(/\r?\n/)
    .map((ligne) => {
      const cloture = ligne.startsWith("```");
      if (cloture) dansLeCode = !dansLeCode;
      if (dansLeCode || cloture) return ligne;
      return ligne
        .split(/(`[^`]*`)/)
        .map((bout) => (bout.startsWith("`") ? bout : retouche(bout)))
        .join("");
    })
    .join("\n");
}

/**
 * Deux ecarts entre un billet lu d'un fichier et le meme billet verse en base,
 * corriges ici une fois pour toutes.
 *
 * L'italique a un seul asterisque (*mot*) n'est pas lu par le convertisseur du
 * client, qui ne connait que _mot_ : les asterisques sortaient tels quels.
 *
 * L'apostrophe typographique, qu'Astro pose tout seul en rendant un fichier
 * Markdown, n'est posee par personne sur un texte riche : on l'ecrit donc
 * juste. Seule l'apostrophe entre deux lettres est touchee.
 */
export const fidele = (markdown) =>
  horsDuCode(markdown, (texte) =>
    texte
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1_$2_")
      .replace(/(\p{L})'(?=\p{L})/gu, "$1\u2019"),
  );

/**
 * Le Markdown d'un billet en Portable Text, tableaux compris.
 *
 * Le convertisseur du client ne connait pas les tableaux : chaque ligne
 * "| a | b |" sortait en paragraphe, barres comprises. Les lignes d'un
 * tableau sont donc lues ici et deviennent un bloc "table" d'EmDash (celui
 * que pose le bouton Tableau de l'editeur), la premiere ligne en en-tete ;
 * le texte d'une cellule garde son gras, son italique et son code. Le reste
 * passe par le convertisseur du client, tel quel.
 */
let cle = 0;
const nouvelleCle = (prefixe) => `${prefixe}${(cle++).toString(36)}`;
const LIGNE_DE_TABLEAU = /^\s*\|.*\|\s*$/;
const SEPARATEUR = /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{0,}:?\s*$/;

function cellules(ligne) {
  return ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function cellule(texte, enTete) {
  const bloc = markdownToPortableText(texte)[0];
  const enfants = bloc?.children?.length ? bloc.children : [{ _type: "span", _key: nouvelleCle("s"), text: texte, marks: [] }];
  return {
    _type: "tableCell",
    _key: nouvelleCle("c"),
    content: enfants.map((s) => ({ _type: "span", _key: s._key ?? nouvelleCle("s"), text: s.text ?? "", marks: s.marks ?? [] })),
    markDefs: bloc?.markDefs ?? [],
    ...(enTete ? { isHeader: true } : {}),
  };
}

function tableau(lignes) {
  const rangs = lignes.filter((l) => !SEPARATEUR.test(l)).map(cellules);
  const aUnEnTete = lignes.length > 1 && SEPARATEUR.test(lignes[1]);
  return {
    _type: "table",
    _key: nouvelleCle("t"),
    hasHeaderRow: aUnEnTete,
    rows: rangs.map((rang, i) => ({ _type: "tableRow", _key: nouvelleCle("r"), cells: rang.map((c) => cellule(c, aUnEnTete && i === 0)) })),
  };
}

export function versPortableText(markdown) {
  const blocs = [];
  let texte = [];
  let lignesDuTableau = [];
  let dansLeCode = false;
  const viderLeTexte = () => {
    if (texte.join("").trim() !== "") blocs.push(...markdownToPortableText(texte.join("\n")));
    texte = [];
  };
  for (const ligne of markdown.split(/\r?\n/)) {
    if (ligne.startsWith("```")) dansLeCode = !dansLeCode;
    if (!dansLeCode && LIGNE_DE_TABLEAU.test(ligne)) {
      if (lignesDuTableau.length === 0) viderLeTexte();
      lignesDuTableau.push(ligne);
      continue;
    }
    if (lignesDuTableau.length > 0) {
      blocs.push(tableau(lignesDuTableau));
      lignesDuTableau = [];
    }
    texte.push(ligne);
  }
  if (lignesDuTableau.length > 0) blocs.push(tableau(lignesDuTableau));
  viderLeTexte();
  return blocs;
}
