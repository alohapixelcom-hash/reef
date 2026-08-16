// src/components/ui/_dialog.ts - controleur partage des <dialog> : ouverture via [data-dialog-trigger="id"], fermeture via [data-dialog-close] et au clic sur le scrim.
// Un seul jeu d'ecouteurs delegues au document, appele par Dialog et Sheet,
// idempotent, et qui survit aux view transitions puisque le document persiste.
// Le piege de focus, Escape et le retour de focus sont natifs (showModal).

const MODAL_SLOTS = "dialog[data-slot='dialog'], dialog[data-slot='sheet']";

let bound = false;

/* Un clic n'est traite comme un clic scrim que si l'appui a commence sur le
 * scrim lui-meme : selectionner du texte puis relacher dehors ne ferme rien. */
let pressStartedOnScrim = false;

function findDialog(id: string | null): HTMLDialogElement | null {
  if (!id) return null;
  const found = document.getElementById(id);
  return found instanceof HTMLDialogElement ? found : null;
}

function onPointerDown(event: PointerEvent): void {
  pressStartedOnScrim = event.target instanceof HTMLDialogElement;
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const trigger = target.closest<HTMLElement>("[data-dialog-trigger]");
  if (trigger) {
    const dialog = findDialog(trigger.getAttribute("data-dialog-trigger"));
    if (dialog && !dialog.open) dialog.showModal();
    return;
  }

  const closer = target.closest<HTMLElement>("[data-dialog-close]");
  if (closer) {
    const dialog = closer.closest("dialog");
    if (dialog?.open) dialog.close();
    return;
  }

  /* Clic sur le scrim : l'evenement cible alors le <dialog> lui-meme, et les
   * coordonnees tombent hors de sa boite visible (le ::backdrop n'est jamais
   * une cible d'evenement, il fait partie du dialog). */
  if (
    target instanceof HTMLDialogElement &&
    target.matches(MODAL_SLOTS) &&
    target.open &&
    pressStartedOnScrim
  ) {
    const box = target.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) target.close();
  }
}

export function initDialogs(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("click", onClick);
}
