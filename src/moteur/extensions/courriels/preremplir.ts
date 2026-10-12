// src/moteur/extensions/courriels/preremplir.ts - cote navigateur : preremplit les champs d'un formulaire depuis l'adresse de la page (?commande=...&email=...).
//
// POURQUOI COTE CLIENT SEULEMENT : les pages du site sont figees au build et
// servies sans reveiller le Worker ; lire la requete cote serveur casserait ce
// cache pour une simple commodite. Le script pose une valeur (propriete value,
// jamais du HTML) dans un champ vide qui la demande par data-preremplir,
// bornee par son maxlength : rien ne s'injecte dans la page, et la valeur
// repasse par toutes les verifications du serveur a l'envoi.
//
// Usage dans le composant du formulaire du site :
//   <input name="commande" data-preremplir="commande" maxlength="40" />
//   <script>
//     import { preremplirLaPage } from "@moteur/extensions/courriels/preremplir.ts";
//     preremplirLaPage();
//   </script>

export const ATTRIBUT_PREREMPLIR = "data-preremplir";
const MAX = 200;
const CLE = /^[a-z][a-z0-9_-]{0,39}$/i;

/** La valeur a poser pour une cle de l'adresse, ou null. Pure : verifiee par formulaires.selfcheck.ts. */
export function valeurAPreremplir(recherche: string, cle: string, max = MAX): string | null {
  if (!CLE.test(cle)) return null;
  const brut = new URLSearchParams(recherche).get(cle);
  if (!brut) return null;
  const borne = max > 0 ? Math.min(max, 1000) : MAX;
  const v = brut.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, borne).trim();
  return v || null;
}

/** Ce que le script touche d'un champ : un input ou un textarea, ou leur double dans le self-check. */
export interface ChampRemplissable {
  value: string;
  maxLength: number;
  getAttribute(nom: string): string | null;
}

/** Remplit les champs vides qui le demandent ; rend le nombre de champs remplis. Un champ deja saisi n'est jamais ecrase. */
export function preremplir(champs: Iterable<ChampRemplissable>, recherche: string): number {
  let n = 0;
  for (const champ of champs) {
    if (champ.value) continue;
    const v = valeurAPreremplir(recherche, champ.getAttribute(ATTRIBUT_PREREMPLIR) ?? "", champ.maxLength);
    if (v === null) continue;
    champ.value = v;
    n += 1;
  }
  return n;
}

export function preremplirLaPage(): void {
  if (typeof document === "undefined" || !location.search) return;
  preremplir(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[${ATTRIBUT_PREREMPLIR}]`), location.search);
}
