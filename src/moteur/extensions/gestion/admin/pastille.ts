// src/moteur/extensions/gestion/admin/pastille.ts - le compteur des messages non lus, pose a cote de "Messages" dans le rail du back office.
//
// EmDash 0.38 ne donne pas de pastille aux pages d'extension (seulement a ses
// Commentaires) : ce module la pose lui-meme sur le lien du rail, lue par la
// route "non-lus", au chargement du back office, toutes les deux minutes et
// apres chaque geste sur un message (signalerLesNonLus). Aucune pastille
// quand il n'y a rien a lire.
import { appeler, ID } from "./outils";

const SELECTEUR = `a[href$="/plugins/${ID}/messages"]`;
let dernier = 0;
let enCours = false;

function poser(n: number): void {
  dernier = n;
  for (const lien of document.querySelectorAll<HTMLAnchorElement>(SELECTEUR)) {
    let pastille = lien.querySelector<HTMLSpanElement>(".gs-pastille");
    if (n <= 0) {
      pastille?.remove();
      continue;
    }
    if (!pastille) {
      pastille = document.createElement("span");
      pastille.className = "gs-pastille";
      lien.appendChild(pastille);
    }
    const texte = n > 99 ? "99+" : String(n);
    if (pastille.textContent !== texte) pastille.textContent = texte;
    pastille.setAttribute("aria-label", `${n} non lu${n > 1 ? "s" : ""}`);
  }
}

/** Relit le nombre de messages non lus et met la pastille a jour. */
export async function signalerLesNonLus(): Promise<void> {
  if (enCours || !document.querySelector(SELECTEUR)) return;
  enCours = true;
  try {
    poser((await appeler<{ n: number }>("non-lus")).n);
  } catch {
    // Hors ligne ou session expiree : la pastille garde sa valeur.
  } finally {
    enCours = false;
  }
}

/** Branche la pastille une fois pour toutes : le rail se redessine a chaque page, la pastille y revient. */
export function brancherLaPastille(): void {
  if (typeof window === "undefined" || (window as { __alohaPastille?: boolean }).__alohaPastille) return;
  (window as { __alohaPastille?: boolean }).__alohaPastille = true;
  const observer = new MutationObserver(() => {
    const lien = document.querySelector(SELECTEUR);
    if (lien && dernier > 0 && !lien.querySelector(".gs-pastille")) poser(dernier);
  });
  const demarrer = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    void signalerLesNonLus();
    setInterval(() => void signalerLesNonLus(), 120_000);
    // Le rail n'existe pas encore au tout premier chargement : un second essai.
    setTimeout(() => void signalerLesNonLus(), 2500);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer, { once: true });
  else demarrer();
}
