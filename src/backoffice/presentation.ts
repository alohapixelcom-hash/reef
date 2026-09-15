// src/components/Sections/BackOffice/_bo.ts - les quatre outils que les ecrans du back office partagent.
//
// Ces fonctions sont PURES : elles ne touchent ni au DOM, ni au reseau, ni a
// une langue. Elles vivent a cote des ecrans plutot que dans src/js parce
// qu'elles ne servent qu'a eux, et qu'un module de src/js s'accompagne d'un
// selfcheck qui ferait doublon avec ce que le banc de rendu verifie deja.
//
// Aucune phrase francaise ici non plus : ce module manipule du texte, il n'en
// ecrit pas.

/** Le texte d'une donnee, rendu inoffensif avant d'entrer dans du HTML. */
export const esc = (valeur: unknown): string =>
  String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * UN TABLEAU DE BORD DOIT SE LIRE SUR UN TELEPHONE, et un tableau a six
 * colonnes ne s'y lit pas : a 390 px, seules les deux premieres tiennent, et
 * les quatre autres partent dans un defilement lateral que rien n'annonce. Les
 * lignes deviennent donc des BLOCS sous md, chaque cellule portant son intitule
 * de colonne au-dessus de sa valeur ; l'en-tete du tableau, devenu inutile,
 * s'efface. Au-dessus de md, tout redevient un vrai tableau.
 */
export const RANGEE = "border-border block border-b px-1 py-3 last:border-0 md:table-row md:px-0 md:py-0";

/** Une cellule qui porte son intitule de colonne tant qu'elle est un bloc. */
export const cellule = (etiquette: string, contenu: string, extra = ""): string =>
  `<td class="block px-4 py-1.5 align-top md:table-cell md:py-3 ${extra}">` +
  `<span class="text-muted-foreground mb-0.5 block text-[0.7rem] font-semibold uppercase md:hidden">${esc(etiquette)}</span>` +
  `${contenu}</td>`;

/** La ligne d'un tableau vide, ou en panne, dans les deux mises en page. */
export const rangeeSeule = (contenu: string, colonnes: number, classe: string): string =>
  `<tr class="block md:table-row"><td colspan="${colonnes}" class="block px-4 py-10 text-center md:table-cell ${classe}">${contenu}</td></tr>`;

/** Les jetons {nom} d'une phrase du dictionnaire, comme fmt de @i18n. */
export const fmt = (modele: string, valeurs: Record<string, string | number>): string =>
  modele.replace(/\{(\w+)\}/g, (tout, cle: string) => (cle in valeurs ? String(valeurs[cle]) : tout));

/**
 * Aplatit un objet en couples "chemin.pointe" / nombre.
 *
 * Le tableau de bord ne connait pas la forme exacte de /api/admin/stats : elle
 * appartient au service, et elle bougera. Plutot que de figer douze champs
 * dans cette page, on lit TOUS les nombres que la reponse contient et on leur
 * cherche un libelle. Un compteur ajoute cote serveur apparait alors sans
 * qu'une ligne change ici, et un compteur retire disparait sans laisser une
 * carte vide.
 */
export const plat = (valeur: unknown, prefixe = "", profondeur = 0): [string, number][] => {
  if (profondeur > 3 || valeur === null || typeof valeur !== "object" || Array.isArray(valeur)) return [];
  const sortie: [string, number][] = [];
  for (const [cle, brut] of Object.entries(valeur as Record<string, unknown>)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (typeof brut === "number" && Number.isFinite(brut)) sortie.push([chemin, brut]);
    else sortie.push(...plat(brut, chemin, profondeur + 1));
  }
  return sortie;
};

/**
 * Un apercu Markdown volontairement minimal.
 *
 * Il n'a pas a etre exact : le rendu qui compte est celui d'Astro, au build.
 * Celui-ci sert a relire un paragraphe et a voir ou tombent les titres. Le
 * texte est echappe AVANT toute transformation. Les liens acceptent uniquement
 * HTTP(S), les chemins locaux et les ancres ; aucun protocole executable.
 */
export const apercu = (markdown: string): string => {
  const source = esc(markdown).replace(/\r\n/g, "\n");
  const blocs = source.split(/\n{2,}/);
  const enligne = (texte: string): string =>
    texte
      .replace(/`([^`]+)`/g, '<code class="bg-muted rounded px-1 py-0.5 text-[0.9em]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(
        /\[([^\]]+)\]\(([^)\s]+)\)/g,
        (_match, label: string, href: string) => {
          const allowed = /^(?:https?:\/\/|\/(?!\/)|\.{1,2}\/|#)/i.test(href)
            && !/[<>\\]/.test(href);
          return allowed ? `<a class="text-link underline underline-offset-4" href="${href}">${label}</a>` : label;
        },
      )
      .replace(/\n/g, "<br />");

  return blocs
    .map((bloc) => {
      const texte = bloc.trim();
      if (texte === "") return "";
      if (/^```/.test(texte)) {
        const corps = texte.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
        return `<pre class="bg-muted rounded-card overflow-x-auto p-4 text-sm"><code>${corps}</code></pre>`;
      }
      const titre = /^(#{1,4})\s+(.*)$/.exec(texte);
      if (titre) {
        const niveau = Math.min(titre[1].length + 1, 6);
        const taille = ["text-2xl", "text-xl", "text-lg", "text-base"][titre[1].length - 1] ?? "text-base";
        return `<h${niveau} class="font-display ${taille} mt-6 mb-2 font-bold">${enligne(titre[2])}</h${niveau}>`;
      }
      if (/^&gt;\s?/.test(texte)) {
        const cite = texte.replace(/^&gt;\s?/gm, "");
        return `<blockquote class="border-accent text-muted-foreground my-4 border-l-2 pl-4 italic">${enligne(cite)}</blockquote>`;
      }
      if (/^[-*]\s+/.test(texte)) {
        const points = texte
          .split("\n")
          .map((l) => l.replace(/^[-*]\s+/, ""))
          .map((l) => `<li>${enligne(l)}</li>`)
          .join("");
        return `<ul class="my-3 list-disc space-y-1 pl-6">${points}</ul>`;
      }
      if (/^\d+\.\s+/.test(texte)) {
        const points = texte
          .split("\n")
          .map((l) => l.replace(/^\d+\.\s+/, ""))
          .map((l) => `<li>${enligne(l)}</li>`)
          .join("");
        return `<ol class="my-3 list-decimal space-y-1 pl-6">${points}</ol>`;
      }
      if (/^-{3,}$/.test(texte)) return '<hr class="border-border my-6" />';
      return `<p class="my-3 leading-relaxed">${enligne(texte)}</p>`;
    })
    .join("");
};

/* ------------------------------------------------------------------ */
/* LES BOUTONS DES TABLEAUX                                            */
/* ------------------------------------------------------------------ */
//
// Les lignes des tableaux sont fabriquees en chaines de HTML : leurs boutons
// ne passent donc pas par la primitive Button.astro et n'heritaient d'AUCUN
// etat de survol. Un bouton qui ne repond pas au passage de la souris ne dit
// pas qu'il est cliquable, et l'editeur l'a vu tout de suite. Les trois
// classes ci-dessous sont la seule source de ces etats, pour que les cinq
// ecrans se ressemblent et qu'un survol ajoute ici les serve tous.
//
// Chaque bouton porte aussi son anneau de focus : la souris n'est pas le seul
// pointeur, et le clavier doit voir ou il est.

/** La base commune : forme, hauteur de cible tactile, transition, focus. */
const SOCLE =
  "rounded-pill min-h-11 inline-flex items-center justify-center gap-1.5 whitespace-nowrap " +
  "transition-[background-color,color,border-color,box-shadow] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55";

/** L'action principale d'une ligne : fond primaire, plus dense au survol. */
export const BTN_PRIMAIRE = `${SOCLE} bg-primary text-primary-foreground px-4 text-xs font-bold hover:bg-primary/85 active:bg-primary/75`;

/** L'action secondaire : contour, qui se remplit au survol. */
export const BTN_SECONDAIRE = `${SOCLE} border-border text-foreground border px-4 text-xs font-semibold hover:bg-muted hover:border-foreground/25 active:bg-muted/70`;

/** L'action discrete : encre sourde, qui reprend l'encre pleine au survol. */
export const BTN_DISCRET = `${SOCLE} border-border text-muted-foreground border px-4 text-xs font-semibold hover:bg-muted hover:text-foreground active:bg-muted/70`;

/** L'action qui detruit : contour d'accent, fond d'accent au survol. */
export const BTN_DANGER = `${SOCLE} border-accent text-foreground border px-4 text-xs font-semibold hover:bg-accent/12 active:bg-accent/20`;

/** La confirmation d'une destruction : plein, contrasté, impossible a rater. */
export const BTN_DANGER_PLEIN = `${SOCLE} bg-foreground text-background px-4 text-xs font-bold hover:bg-foreground/85 active:bg-foreground/75`;

/** Un champ de formulaire pose dans une ligne (liste deroulante d'etat). */
export const CHAMP_LIGNE =
  "border-border bg-background rounded-pill min-h-11 border px-3 text-xs transition-colors duration-150 " +
  "hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Une ligne de tableau qui s'ouvre au clic : elle doit le montrer. */
export const RANGEE_CLIQUABLE = "cursor-pointer transition-colors duration-150 hover:bg-muted/60";
