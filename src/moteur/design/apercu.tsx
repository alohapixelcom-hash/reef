// src/moteur/design/apercu.tsx - l'apercu en direct de la page Design : la page d'accueil du site dans un cadre, repeinte a chaque choix, en clair ou en sombre, a la largeur d'un ordinateur ou d'un telephone.
/** @jsxImportSource react */
//
// LE CADRE EST LE VRAI SITE, servi par le meme moteur : meme origine que le
// back office, donc le cadre peut recevoir une feuille. A chaque choix, la
// feuille que le serveur a calculee (extension.ts, apercu) remplace celles que
// la page porte deja (balises style[data-aloha-design] de BaseHead) : rien
// n'est enregistre tant que l'editeur n'a pas clique sur Enregistrer.
// Le sombre se montre en posant la classe .dark sur la page du cadre, comme
// le bouton de theme du site ; le choix du visiteur n'est pas touche.
import { useEffect, useRef, useState } from "react";

const MARQUE = "aloha-apercu-design";

/** Pose la feuille de l'apercu dans le document du cadre (meme origine), et retire celles de la page. */
function repeindre(cadre: HTMLIFrameElement | null, feuille: string, sombre: boolean): void {
  const doc = cadre?.contentDocument;
  if (!doc?.head) return;
  doc.querySelectorAll("style[data-aloha-design]").forEach((s) => s.remove());
  let style = doc.getElementById(MARQUE) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = MARQUE;
    doc.head.appendChild(style);
  }
  // La barre d'edition d'EmDash (personne connectee) n'a rien a faire dans un apercu.
  style.textContent = `${feuille}\n#emdash-toolbar,[data-emdash-toolbar],emdash-toolbar{display:none!important}`;
  doc.documentElement.classList.toggle("dark", sombre);
  doc.documentElement.style.colorScheme = sombre ? "dark" : "light";
}

interface Proprietes {
  adresse: string;
  feuille: string;
}

export function Apercu({ adresse, feuille }: Proprietes) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const [sombre, setSombre] = useState(false);
  const [telephone, setTelephone] = useState(false);
  // Chaque chargement du cadre (le premier, et une page suivie par un lien)
  // compte : la page neuve n'a pas encore la feuille de l'apercu. Le cadre
  // peut avoir fini de charger avant que React ne branche son ecouteur :
  // l'etat du document est relu au montage.
  const [charge, setCharge] = useState(0);
  useEffect(() => {
    const f = cadre.current;
    if (!f) return;
    const marquer = () => setCharge((n) => n + 1);
    f.addEventListener("load", marquer);
    if (f.contentDocument?.readyState === "complete" && f.contentDocument.body?.childElementCount) marquer();
    return () => f.removeEventListener("load", marquer);
  }, []);

  useEffect(() => {
    if (charge) repeindre(cadre.current, feuille, sombre);
  }, [charge, feuille, sombre]);

  const bascule = (actif: boolean, libelle: string, geste: () => void) => (
    <button type="button" className="ds-bascule" aria-pressed={actif} onClick={geste}>
      {libelle}
    </button>
  );

  return (
    <section className="ds-apercu" aria-labelledby="ds-apercu-titre">
      <div className="ds-apercu-barre">
        <h2 id="ds-apercu-titre" className="ds-petit-titre">
          Aperçu
        </h2>
        <div className="ds-groupe" role="group" aria-label="Largeur de l'aperçu">
          {bascule(!telephone, "Ordinateur", () => setTelephone(false))}
          {bascule(telephone, "Téléphone", () => setTelephone(true))}
        </div>
        <div className="ds-groupe" role="group" aria-label="Apparence de l'aperçu">
          {bascule(!sombre, "Clair", () => setSombre(false))}
          {bascule(sombre, "Sombre", () => setSombre(true))}
        </div>
      </div>
      <div className={`ds-ecran${telephone ? " ds-ecran--telephone" : ""}`}>
        <iframe
          ref={cadre}
          className="ds-cadre"
          src={adresse}
          title="Aperçu de la page d'accueil avec vos réglages"
        />
      </div>
      <p className="ds-aide">
        L'aperçu montre la page d'accueil avec vos réglages, avant d'enregistrer. Un logo choisi s'y affiche après l'enregistrement.
      </p>
    </section>
  );
}
