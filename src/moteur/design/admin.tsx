// src/moteur/design/admin.tsx - la page Design du back office : le logo, la couleur de la marque, la police, la taille des titres H1, H2 et H3, la taille du texte et le rayon des coins, avec l'apercu en direct.
/** @jsxImportSource react */
//
// UN SEUL ECRAN POUR L'APPARENCE DU SITE. La couleur, la police et le logo
// sombre etaient trois listes perdues dans "Reglages par langue" ; elles
// vivent ici, avec les tailles et les rayons, et cet ecran les cache la-bas
// (feuille ecran.css) : jamais deux ecrans pour la meme chose. Le logo clair
// reste le reglage natif des Parametres : la page le montre et l'ecrit, ce
// sont les deux memes valeurs.
//
// ENREGISTRER, C'EST PUBLIER : l'entree "site" de chaque langue est ecrite
// puis publiee (api.ts), en ligne en moins d'une minute. Une base plus
// ancienne qui n'a pas encore les champs les recoit au premier
// enregistrement (administrateur), sans terminal.
import { useCallback, useEffect, useMemo, useState } from "react";
import { COULEURS, COULEUR_D_ORIGINE } from "../palette.ts";
import { POLICE_D_ORIGINE, POLICES } from "../typographie.ts";
import { Apercu } from "./apercu.tsx";
import { adresseDe, champsManquants, creerLesChamps, ecrireLeLogo, feuilleDeLApercu, type ImageDuSite, languesDu, type Listes, lireLeLogo, lireLeManifeste, lireLEntree, lireLesImages, lireLesListes, type Manifeste, publierLEntree, Refus, type Valeurs, valeurDImage } from "./api.ts";
import { Images, Pastilles, Segments } from "./choix.tsx";
import feuille from "./ecran.css?raw";

if (typeof document !== "undefined" && !document.querySelector("style[data-aloha-design-ecran]")) {
  const style = document.createElement("style");
  style.dataset.alohaDesignEcran = "";
  style.textContent = feuille.replace(/\/\*[\s\S]*?\*\//g, "");
  document.head.appendChild(style);
}

const REGLES = ["brand_color", "font", "h1_size", "h2_size", "h3_size", "text_size", "radius", "logo_dark"] as const;

type Etat =
  | { phase: "lecture" }
  | { phase: "erreur"; message: string }
  | { phase: "pret"; manifeste: Manifeste; langues: string[]; listes: Listes; images: ImageDuSite[]; logo: { url: string | null; mediaId: string | null } };

const egal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function Design() {
  const [etat, setEtat] = useState<Etat>({ phase: "lecture" });
  const [origine, setOrigine] = useState<Valeurs>({});
  const [valeurs, setValeurs] = useState<Valeurs>({});
  const [logo, setLogo] = useState<string | null>(null);
  const [feuilleApercu, setFeuilleApercu] = useState("");
  const [envoi, setEnvoi] = useState<{ en: boolean; message: string; sorte: "ok" | "erreur" | "" }>({ en: false, message: "", sorte: "" });

  const lire = useCallback(async () => {
    try {
      const manifeste = await lireLeManifeste();
      const langues = languesDu(manifeste);
      const [listes, images, logoLu, premiere] = await Promise.all([lireLesListes(), lireLesImages().catch(() => []), lireLeLogo().catch(() => ({ url: null, mediaId: null })), lireLEntree(langues[0]!)]);
      const lu: Valeurs = {};
      for (const r of REGLES) lu[r] = premiere?.data[r] ?? null;
      setOrigine(lu);
      setValeurs(lu);
      setLogo(logoLu.mediaId);
      setEtat({ phase: "pret", manifeste, langues, listes, images, logo: logoLu });
    } catch (e) {
      setEtat({ phase: "erreur", message: e instanceof Error ? e.message : "La page n'a pas pu se charger. Rechargez-la." });
    }
  }, []);
  useEffect(() => void lire(), [lire]);

  // L'apercu suit chaque choix, avec un leger delai pour ne pas recalculer a chaque clic rapide.
  useEffect(() => {
    if (etat.phase !== "pret") return;
    const minuteur = setTimeout(() => {
      feuilleDeLApercu(valeurs)
        .then((r) => setFeuilleApercu(r.feuille))
        .catch(() => undefined);
    }, 120);
    return () => clearTimeout(minuteur);
  }, [valeurs, etat.phase]);

  const modifie = useMemo(() => REGLES.some((r) => !egal(valeurs[r], origine[r])) || (etat.phase === "pret" && logo !== etat.logo.mediaId), [valeurs, origine, logo, etat]);
  const poser = (champ: string, v: unknown) => setValeurs((avant) => ({ ...avant, [champ]: v }));

  async function enregistrer() {
    if (etat.phase !== "pret") return;
    setEnvoi({ en: true, message: "Enregistrement…", sorte: "" });
    try {
      const manquants = champsManquants(etat.manifeste);
      if (manquants.length) await creerLesChamps(manquants);
      const changes: Valeurs = {};
      for (const r of REGLES) if (!egal(valeurs[r], origine[r])) changes[r] = valeurs[r] ?? null;
      let publiees = 0;
      if (Object.keys(changes).length) {
        for (const langue of etat.langues) {
          const entree = await lireLEntree(langue);
          if (!entree) continue;
          await publierLEntree(langue, changes);
          publiees += 1;
        }
        if (!publiees) throw new Refus("Aucune entrée « Réglages par langue » n'existe encore : créez-en une, puis revenez ici.");
      }
      if (logo !== etat.logo.mediaId) await ecrireLeLogo(logo ?? "");
      setOrigine(valeurs);
      setEtat({ ...etat, logo: { ...etat.logo, mediaId: logo } });
      setEnvoi({ en: false, message: "Enregistré et publié. Le site affiche vos réglages dans moins d'une minute.", sorte: "ok" });
    } catch (e) {
      setEnvoi({ en: false, message: e instanceof Error ? e.message : "L'enregistrement a échoué. Réessayez.", sorte: "erreur" });
    }
  }

  if (etat.phase === "lecture") return <div className="ds-ecran-page" aria-busy="true" />;
  if (etat.phase === "erreur")
    return (
      <div className="ds-ecran-page">
        <p className="ds-alerte" role="alert">
          {etat.message}
        </p>
      </div>
    );

  const { listes, images } = etat;
  const imageDe = (id: string | null) => images.find((i) => i.id === id) ?? null;
  const logoSombreId = valeurs.logo_dark && typeof valeurs.logo_dark === "object" ? String((valeurs.logo_dark as { id?: unknown }).id ?? "") : null;
  const taille = (champ: string, titre: string, aide: string) => (
    <Segments nom={champ} titre={titre} aide={aide} choix={listes.tailles} valeur={(valeurs[champ] as string | null) ?? "Standard"} vide="Standard" poser={(v) => poser(champ, v)} />
  );

  return (
    <div className="ds-ecran-page">
      <header className="ds-tete">
        <h1 className="ds-titre">Design</h1>
        <p className="ds-chapeau">Le logo, la couleur, la police et les tailles de tout le site, dans toutes les langues. « Standard » et « d'origine » rendent le thème tel qu'il est livré.</p>
      </header>
      <div className="ds-colonnes">
        <div className="ds-reglages">
          <section className="ds-carte" aria-labelledby="ds-logo">
            <h2 id="ds-logo" className="ds-petit-titre">
              Logo
            </h2>
            <Images
              titre="Sur fond clair"
              aide="Le même réglage que le logo des Paramètres."
              fond="clair"
              images={images}
              choisi={logo}
              apercu={imageDe(logo)?.url ?? (logo === etat.logo.mediaId ? etat.logo.url : null)}
              poser={(i) => setLogo(i ? i.id : null)}
            />
            <Images
              titre="Pour le mode sombre"
              aide="Vide : le logo clair sert aussi sur fond sombre."
              fond="sombre"
              images={images}
              choisi={logoSombreId}
              apercu={adresseDe(valeurs.logo_dark)}
              poser={(i) => poser("logo_dark", i ? valeurDImage(i) : null)}
            />
            {!images.length && <p className="ds-aide">La médiathèque n'a encore aucune image : ajoutez votre logo dans Médiathèque, puis revenez ici.</p>}
          </section>
          {listes.couleurs.length > 0 && (
            <section className="ds-carte" aria-labelledby="ds-couleur">
              <h2 id="ds-couleur" className="ds-petit-titre">
                Couleur de la marque
              </h2>
              <Pastilles
                nom="brand_color"
                choix={listes.couleurs.map((c) => ({ valeur: c, teinte: c === COULEUR_D_ORIGINE ? null : COULEURS[c as keyof typeof COULEURS] }))}
                valeur={(valeurs.brand_color as string | null) ?? COULEUR_D_ORIGINE}
                vide={COULEUR_D_ORIGINE}
                poser={(v) => poser("brand_color", v)}
              />
              <p className="ds-aide">Boutons, liens et mots en couleur. Le contraste de chaque couleur est garanti : le texte d'un bouton reste lisible.</p>
            </section>
          )}
          {listes.polices.length > 0 && (
            <section className="ds-carte" aria-labelledby="ds-police">
              <h2 id="ds-police" className="ds-petit-titre">
                Police
              </h2>
              <Segments
                nom="font"
                titre="Police des titres et du texte"
                aide="Les polices proposées sont déjà installées sur chaque appareil : rien à télécharger."
                choix={listes.polices}
                valeur={(valeurs.font as string | null) ?? POLICE_D_ORIGINE}
                vide={POLICE_D_ORIGINE}
                nomDuVide="Celle du thème"
                exemple={(v) => (v === POLICE_D_ORIGINE ? undefined : POLICES[v as keyof typeof POLICES]?.titre)}
                poser={(v) => poser("font", v)}
              />
            </section>
          )}
          {listes.tailles.length > 0 ? (
            <section className="ds-carte" aria-labelledby="ds-tailles">
              <h2 id="ds-tailles" className="ds-petit-titre">
                Tailles
              </h2>
              {taille("h1_size", "Grands titres (H1)", "Le titre principal de chaque page.")}
              {taille("h2_size", "Titres de section (H2)", "Le titre de chaque bloc d'une page.")}
              {taille("h3_size", "Petits titres (H3)", "Les titres des cartes et des sous-parties.")}
              {taille("text_size", "Texte", "Le texte courant ; la page entière suit, comme le réglage de taille d'un téléphone.")}
            </section>
          ) : (
            <p className="ds-aide ds-carte">Ce thème ne déclare pas encore ses tailles : la couleur, la police et le logo se règlent déjà ici.</p>
          )}
          {listes.rayons.length > 0 && (
            <section className="ds-carte" aria-labelledby="ds-rayons">
              <h2 id="ds-rayons" className="ds-petit-titre">
                Coins
              </h2>
              <Segments nom="radius" titre="Rayon des coins des cartes et des photos" aide="Les boutons restent arrondis." choix={listes.rayons} valeur={(valeurs.radius as string | null) ?? listes.rayons[0]!} vide={listes.rayons[0]!} nomDuVide="D'origine" coin poser={(v) => poser("radius", v)} />
            </section>
          )}
        </div>
        <Apercu adresse="/" feuille={feuilleApercu} />
      </div>
      <div className="ds-barre" role="region" aria-label="Enregistrement">
        <p className={`ds-statut ds-statut--${envoi.sorte || "neutre"}`} role="status" aria-live="polite">
          {envoi.message || (modifie ? "Des réglages ne sont pas encore enregistrés." : "Tout est enregistré.")}
        </p>
        <button type="button" className="ds-bouton ds-bouton--second" disabled={!modifie || envoi.en} onClick={() => (setValeurs(origine), setLogo(etat.logo.mediaId), setEnvoi({ en: false, message: "", sorte: "" }))}>
          Annuler
        </button>
        <button type="button" className="ds-bouton" disabled={!modifie || envoi.en} onClick={() => void enregistrer()}>
          {envoi.en ? "Enregistrement…" : "Enregistrer et publier"}
        </button>
      </div>
    </div>
  );
}

/** Le module d'administration de l'extension : EmDash monte la page "/" de identite.mjs. */
export const pages = { "/": Design };
