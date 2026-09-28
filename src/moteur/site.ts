// src/moteur/site.ts - ce que l'import verse dans les reglages natifs et dans l'entree "site" de chaque langue (generique) : exactement ce que le theme affiche deja.
//
// LA REGLE DE LA GRAINE : une valeur versee est celle que le site montre deja.
// Le nom vient du repli du theme (reglage "Titre du site"), la description,
// le texte alternatif de l'image de partage, l'e-mail et le credit aussi. Une
// langue dont le theme n'a pas de description de site (aucune page ne
// l'affiche : chaque page donne la sienne) recoit celle de sa page d'accueil,
// que le back office montre a l'editeur comme point de depart.
//
// Le self-check du theme verifie que ces valeurs, posees sur la requete,
// rendent l'identite des fichiers (cadre.ts, identite()), dans chaque langue.
// GENERIQUE et pur, types seulement : l'import du theme le charge dans Node.
import type { DonneesDuSite, Reglages, RepliDuSite } from "./cadre.ts";

/** Les reglages natifs que la graine pose ("settings") : le nom du site. */
export function reglagesDeLaGraine(repli: RepliDuSite): Pick<Reglages, "title"> {
  return { title: repli.nom };
}

/**
 * L'entree "site" d'une langue, telle que l'import la cree. `description` est
 * la description du site dans cette langue, ou, a defaut, celle de sa page
 * d'accueil. Un champ absent reste vide : le rendu du theme.
 */
export function entreeDuSite(repli: RepliDuSite, description: string): DonneesDuSite {
  return {
    description,
    og_alt: repli.image.alt,
    email: repli.email,
    credit_name: repli.credit,
  };
}
