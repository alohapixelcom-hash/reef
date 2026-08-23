// src/components/Sections/Global/_navbar.ts - le moteur de la barre : retrait au scroll, mesure de la largeur compacte, habillage verre clair ou sombre selon la scene.
//
// Ce fichier est separe du composant pour les memes raisons que _film.ts : la
// limite de 400 lignes par fichier, et le precede de src/components/ui/_dialog.ts,
// ou un comportement vit dans un module a part plutot que dans un <script> noye
// au milieu du balisage. Le comportement est celui de l'ancien script en ligne,
// deplace tel quel : init() detache toujours les ecouteurs de la navigation
// precedente avant d'en poser de nouveaux, donc rien ne s'empile.

// Retrait au scroll. Deux seuils differents (96 px pour se retracter, 32 px
// pour se redeployer) : avec un seuil unique, s'arreter pile dessus fait
// clignoter la barre a chaque micro-mouvement de la molette.
const SHRINK_AT = 96;
const GROW_AT = 32;

// Habillage de la barre. Le verre clair est calibre pour un fond de page :
// pose sur la scene sombre du premier ecran il devient une plaque laiteuse,
// et l'encre qu'il porte y perd tout son contraste. Tant que la scene passe
// sous la barre, celle-ci prend donc le verre sombre a texte blanc, et elle
// revient au verre clair des que du contenu normal la remplace.
//
// Le rendu serveur part en verre clair, lisible sur toutes les pages sans
// scene : la bascule est un enrichissement, jamais une condition de
// lisibilite.
const DEEP = ["glass", "text-white"];
const PLAIN = ["glass-light", "text-foreground"];

let observer: IntersectionObserver | null = null;
let onScroll: (() => void) | null = null;

// En dessous de cette largeur, une pilule qui se resserre n'a plus l'air
// compacte, elle a l'air perdue au milieu de l'ecran. Sur telephone la barre
// garde donc toute la largeur disponible et ne joue que sur sa hauteur.
const MIN_COMPACT = 420;

let onResize: (() => void) | null = null;

/**
 * Largeur exacte dont la barre a besoin une fois resserree.
 *
 * Pourquoi mesurer au lieu d'ecrire un nombre : une largeur en dur ne peut
 * pas etre juste. Elle depend de la langue affichee, de la police une fois
 * chargee, du nombre d'entrees de menu et de la taille de texte reglee dans
 * le systeme. Trop large, le mouvement ne se voit pas ; trop etroite, les
 * boutons de droite sortent de la pilule de verre et flottent dans le vide.
 * Alors on demande au navigateur.
 */
function measureCompact(header: HTMLElement, nav: HTMLElement, track: HTMLElement): number {
  const restore = header.dataset.shrunk;
  // On mesure dans l'etat resserre (le mot-marque y est plus petit), et sans
  // transition, sinon on mesure une image intermediaire de l'animation.
  header.dataset.measuring = "true";
  header.dataset.shrunk = "true";

  const navStyle = getComputedStyle(nav);
  const gap = parseFloat(navStyle.columnGap) || 0;
  let width =
    parseFloat(navStyle.paddingLeft) +
    parseFloat(navStyle.paddingRight) +
    parseFloat(navStyle.borderLeftWidth) +
    parseFloat(navStyle.borderRightWidth);

  // getClientRects() vide = element replie par une media query : il ne prend
  // pas de place et ne doit pas peser dans le calcul.
  const kids = [...nav.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.getClientRects().length > 0,
  );
  kids.forEach((el, i) => {
    width += el.getBoundingClientRect().width + (i > 0 ? gap : 0);
  });

  // La piste porte son propre rembourrage lateral, et max-width compte les
  // bordures : sans lui, la barre serait mesuree trop etroite de deux marges.
  const trackStyle = getComputedStyle(track);
  width += parseFloat(trackStyle.paddingLeft) + parseFloat(trackStyle.paddingRight);

  if (restore === undefined) delete header.dataset.shrunk;
  else header.dataset.shrunk = restore;
  delete header.dataset.measuring;

  return Math.ceil(Math.max(width, MIN_COMPACT));
}

/** Pose l'un des deux habillages, en retirant l'autre. */
function paint(nav: HTMLElement, deep: boolean): void {
  nav.classList.remove(...(deep ? PLAIN : DEEP));
  nav.classList.add(...(deep ? DEEP : PLAIN));
}

function init(): void {
  // Les view transitions rejouent ce module : on detache l'ecouteur precedent
  // avant d'en poser un neuf, sinon ils s'empilent a chaque navigation.
  observer?.disconnect();
  observer = null;
  if (onScroll) {
    window.removeEventListener("scroll", onScroll);
    onScroll = null;
  }
  if (onResize) {
    window.removeEventListener("resize", onResize);
    onResize = null;
  }
  const header = document.querySelector<HTMLElement>("[data-header]");
  if (!header) return;
  const nav = header.querySelector<HTMLElement>("[data-navbar]");
  const track = header.querySelector<HTMLElement>("[data-header-track]");

  let ticking = false;
  let sizing = false;

  const size = (): void => {
    sizing = false;
    if (!nav || !track) return;
    header.style.setProperty("--header-compact", `${measureCompact(header, nav, track)}px`);
  };

  const apply = (): void => {
    ticking = false;
    const y = window.scrollY;
    const shrunk = header.dataset.shrunk === "true";
    if (!shrunk && y > SHRINK_AT) header.dataset.shrunk = "true";
    else if (shrunk && y < GROW_AT) header.dataset.shrunk = "false";
  };

  onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };
  onResize = (): void => {
    if (sizing) return;
    sizing = true;
    requestAnimationFrame(size);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  size();
  // Les polices d'affichage arrivent apres le premier rendu et changent la
  // largeur des libelles : on remesure une fois qu'elles sont posees.
  document.fonts?.ready.then(size).catch(() => {});
  apply();

  if (!nav) return;
  // Seule une scene collee en haut de page assombrit la barre. Une bande
  // sombre plus bas (l'invitation a s'abonner) passe sous la barre en cours
  // de defilement : la faire basculer la ferait clignoter deux fois par
  // page, pour un gain nul.
  const scene = document.querySelector<HTMLElement>("[data-deep-scene]");
  const top = scene ? scene.getBoundingClientRect().top + window.scrollY : Infinity;
  if (!scene || top > 200) {
    paint(nav, false);
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (entry) paint(nav, entry.isIntersecting);
    },
    // La marge negative decale la ligne de declenchement a la hauteur reelle
    // de la barre : elle bascule quand la scene quitte la BARRE, pas quand
    // elle quitte la fenetre.
    { rootMargin: "-84px 0px 0px 0px" },
  );
  observer.observe(scene);
}

init();
document.addEventListener("astro:page-load", init);
