// src/components/ui/sheet/sheet-gesture.ts - le tiroir se ferme au doigt, pas seulement au bouton.
//
// Ce que ce fichier ajoute
// -----------------------
// Un tiroir qu'on ne peut fermer qu'en visant une croix de 44 px se manipule
// avec les yeux. Un tiroir qu'on peut simplement pousser vers le bord se
// manipule avec la main, et c'est le geste que tout le monde connait deja sur
// telephone. La difference ne se raconte pas dans une liste de fonctions, elle
// se sent en trois secondes sur l'appareil.
//
// Les quatre details qui separent "ca glisse" de "c'est vivant"
// ------------------------------------------------------------
// 1. Suivi au pixel. Le panneau colle au doigt pendant tout le geste, en
//    respectant l'endroit exact ou on l'a saisi. Un panneau qui saute sous le
//    doigt au premier mouvement casse l'illusion immediatement.
//
// 2. Resistance aux bords. Tirer dans le mauvais sens ne fait pas rien et ne
//    bloque pas net : le panneau suit de moins en moins. Un arret franc se lit
//    comme une panne, une resistance progressive se lit comme "il n'y a rien
//    de plus par la".
//
// 3. Projection de l'elan. Au relachement, on ne regarde pas ou le doigt s'est
//    arrete mais ou il allait. Un petit coup sec ferme, un long deplacement
//    lent qui s'arrete a mi-chemin revient. L'interface repond a l'intention.
//
// 4. Interruptibilite. Le ressort peut etre attrape en vol : on lit sa
//    position affichee, on repart de la, et la vitesse en cours est conservee.
//    Aucun temps mort, aucune animation a attendre.
//
// Ce qu'il refuse de faire
// ------------------------
// - Rien sur pointeur fin (souris) : le geste n'y a pas de sens, la croix et
//   Escape y sont plus rapides.
// - Rien en mouvement reduit : la fermeture reste instantanee.
// - Rien quand le contenu est en train d'etre defile : le doigt appartient
//   alors a la liste, pas au tiroir.

import { VelocityTracker, project, rubberband, spring, type SpringHandle } from "@js/spring";
import { haptic } from "@js/haptics";

/** Au-dela de cette fraction de la largeur, on ferme meme sans elan. */
const DISMISS_RATIO = 0.45;
/** Sous ce seuil (px/s), un relachement est un depot, pas un lancer. */
const FLICK_VELOCITY = 350;
/** Deplacement minimal avant de decider qu'il s'agit d'un geste horizontal. */
const HYSTERESIS = 8;

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  offset: number;
  claimed: boolean;
  abandoned: boolean;
}

export function bindSheetGesture(dialog: HTMLDialogElement): void {
  if (dialog.dataset.gestureBound === "true") return;
  dialog.dataset.gestureBound = "true";

  const side = dialog.dataset.side === "left" ? "left" : "right";
  // Vers l'exterieur : +1 a droite, -1 a gauche. Tout le calcul se fait ensuite
  // dans un seul sens, ce qui evite un jeu de conditions a chaque etape.
  const out = side === "right" ? 1 : -1;

  let drag: DragState | null = null;
  let animation: SpringHandle | null = null;
  const tracker = new VelocityTracker();

  const width = (): number => dialog.getBoundingClientRect().width || 1;

  const paint = (x: number): void => {
    dialog.style.transform = `translate3d(${x}px, 0, 0)`;
    // Le scrim s'eclaircit a mesure que le panneau sort : les deux appartiennent
    // au meme geste, ils doivent bouger ensemble et pas l'un apres l'autre.
    const progress = Math.min(Math.abs(x) / width(), 1);
    dialog.style.setProperty("--sheet-progress", String(1 - progress));
  };

  const release = (): void => {
    dialog.style.transform = "";
    dialog.style.removeProperty("--sheet-progress");
    dialog.removeAttribute("data-dragging");
  };

  const springTo = (from: number, to: number, velocity: number, close: boolean): void => {
    animation?.stop();
    animation = spring(
      from,
      to,
      (value) => paint(value),
      {
        // Un tiroir qu'on a lance merite un soupcon de depassement : le geste
        // portait de l'elan, le mouvement doit le montrer. Un retour a la
        // position d'origine, lui, ne rebondit pas : rien ne l'a lance.
        damping: close ? 0.86 : 1,
        response: 0.32,
        velocity,
      },
      () => {
        animation = null;
        if (close) {
          release();
          dialog.close();
        } else {
          release();
        }
      },
    );
  };

  dialog.addEventListener(
    "pointerdown",
    (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!dialog.open) return;

      // Le doigt pose sur un champ ou un bouton appartient a ce champ.
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [data-no-drag]")) {
        return;
      }

      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        // On repart de la position AFFICHEE, jamais de zero : si un ressort est
        // en vol, le panneau doit se laisser attraper la ou il est, sans saut.
        offset: animation ? animation.value : 0,
        claimed: false,
        abandoned: false,
      };
      animation?.stop();
      animation = null;
      tracker.reset();
    },
    { passive: true },
  );

  dialog.addEventListener(
    "pointermove",
    (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId || drag.abandoned) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.claimed) {
        // Tant que l'intention n'est pas claire, on ne prend rien. En dessous
        // du seuil, le geste peut encore devenir un defilement ou un appui.
        if (Math.abs(dx) < HYSTERESIS && Math.abs(dy) < HYSTERESIS) return;
        // Plus vertical qu'horizontal : le doigt appartient au contenu.
        if (Math.abs(dy) > Math.abs(dx)) {
          drag.abandoned = true;
          return;
        }
        drag.claimed = true;
        dialog.setAttribute("data-dragging", "");
        // setPointerCapture : le suivi continue meme si le doigt sort du
        // panneau, ce qui arrive des qu'on pousse vers le bord de l'ecran.
        dialog.setPointerCapture(event.pointerId);
      }

      const raw = drag.offset + dx;
      // Vers l'exterieur, suivi au pixel. Vers l'interieur, il n'y a rien :
      // on resiste au lieu de bloquer.
      const value = raw * out >= 0 ? raw : rubberband(raw, width());
      tracker.add(value);
      paint(value);
    },
    { passive: true },
  );

  const finish = (event: PointerEvent): void => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasClaimed = drag.claimed;
    const current = wasClaimed ? drag.offset + (event.clientX - drag.startX) : 0;
    drag = null;
    if (!wasClaimed) return;

    if (dialog.hasPointerCapture(event.pointerId)) dialog.releasePointerCapture(event.pointerId);

    const velocity = tracker.velocity;
    // Ou le doigt serait-il arrive s'il avait continue sur son elan ?
    const projected = current + project(velocity);
    const w = width();

    const flungOut = velocity * out > FLICK_VELOCITY;
    const flungBack = velocity * out < -FLICK_VELOCITY;
    // La vitesse prime sur la position : un geste franc vers l'interieur doit
    // rouvrir meme si le panneau est deja largement sorti.
    const close = flungOut || (!flungBack && projected * out > w * DISMISS_RATIO);

    if (close) haptic("select");
    springTo(current, close ? w * out : 0, velocity, close);
  };

  dialog.addEventListener("pointerup", finish, { passive: true });
  dialog.addEventListener("pointercancel", finish, { passive: true });

  // Une fermeture par la croix, par Escape ou par le scrim doit repartir d'un
  // etat propre : sinon la reouverture suivante heriterait de la transformation.
  dialog.addEventListener("close", () => {
    animation?.stop();
    animation = null;
    drag = null;
    release();
  });
}

/** Attache le geste a toutes les sheets presentes, y compris apres une navigation. */
export function initSheetGestures(): void {
  const bind = (): void => {
    document
      .querySelectorAll<HTMLDialogElement>("dialog[data-slot='sheet']")
      .forEach(bindSheetGesture);
  };
  bind();
  document.addEventListener("astro:page-load", bind);
}
