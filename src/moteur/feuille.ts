// src/moteur/feuille.ts - retire de la page du back office la feuille de style du SITE, que le build y glisse a tort.
//
// LE DEFAUT. Moteur allume, Astro ne produit qu'une feuille pour tout le
// serveur et l'attache a chaque route qui touche un module style : la page du
// back office recoit donc, en ligne, les 120 ko de la boutique (mesure sur
// Kai, puis corrige sur Kona). Les deux feuilles sortent
// de Tailwind et rangent leurs utilitaires dans le meme calque : le `.hidden`
// du site, arrive en second, battait la regle d'affichage a partir de 640 px
// du back office, et les boutons "Nouveau dossier" et "Televerser" de la
// mediatheque perdaient leur libelle et leur icone. Le mecanisme est celui
// d'Astro, pas celui d'un theme : le socle pose donc le tri partout.
//
// LE REMEDE. Dans cette feuille-la, ne garder que les regles du moteur (son
// ecran de chargement, que le build a fusionne avec le reste). Le moteur nomme
// tout ce qui est a lui : une regle de premier niveau dont l'en-tete ne cite
// pas "emdash" est une regle du site, et elle part.
//
// Logique pure, sans Astro : verifiee par feuille.selfcheck.ts.

// La marque du site (un jeton semantique que seule sa feuille publique
// contient, "--kai-background" chez Kai) est un parametre : elle vient de
// habillage.site.ts. C'etait la seule ligne qui differait entre Kai et Kona.
// Une marque vide ne trie rien : la page est rendue telle quelle.
const MARQUE_DU_MOTEUR = "emdash";

/** Les regles de premier niveau d'une feuille dont l'en-tete (selecteur ou nom d'at-regle) cite le moteur. */
export function reglesDuMoteur(css: string): string {
  let sortie = "";
  let debut = 0;
  let profondeur = 0;
  let guillemet = "";
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i];
    if (guillemet !== "") {
      // Une accolade dans une chaine (content, url de donnees) n'ouvre rien.
      if (c === "\\") i += 1;
      else if (c === guillemet) guillemet = "";
    } else if (c === '"' || c === "'") guillemet = c;
    else if (c === "{") profondeur += 1;
    else if (c === "}") {
      profondeur -= 1;
      if (profondeur === 0) {
        const regle = css.slice(debut, i + 1);
        const entete = regle.slice(0, regle.indexOf("{"));
        // "@layer a,b;" pose devant une regle n'a pas d'accolade : il ne fait pas partie de son en-tete.
        const propre = entete.slice(entete.lastIndexOf(";") + 1);
        if (propre.includes(MARQUE_DU_MOTEUR)) sortie += propre + regle.slice(entete.length);
        debut = i + 1;
      }
    }
  }
  return sortie;
}

/** La page du back office, sans la feuille du site reconnue a sa marque. Les autres feuilles ne sont pas touchees. */
export function sansLaFeuilleDuSite(html: string, marqueDuSite: string): string {
  if (marqueDuSite === "") return html;
  return html.replace(/<style>([\s\S]*?)<\/style>/g, (bloc: string, css: string) =>
    css.includes(marqueDuSite) ? `<style>${reglesDuMoteur(css)}</style>` : bloc,
  );
}
