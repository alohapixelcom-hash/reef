// src/moteur/extensions/gestion/admin/abonnes.tsx - l'ecran "Abonnes de la lettre" : chercher, cocher, desinscrire, reinscrire, supprimer, trouver les inscriptions suspectes, exporter.
/** @jsxImportSource react */
import { useState } from "react";
import { RAISONS_FR, type Raison } from "../regles.ts";
import { ListeGeree, type GesteDeMasse } from "./liste";
import { appeler, Avis, Bouton, date, depuis, Entete, Etiquette, Filtres, nombre, pluriel, Recherche, type Ton, useListe } from "./outils";

type Etat = "inscrit" | "attente" | "desinscrit";
type Filtre = Etat | "tous";

interface Abonne {
  id: string;
  adresse: string;
  langue: "fr" | "en";
  etat: Etat;
  page: string | null;
  demande_le: number;
  confirme_le: number | null;
  raisons: Raison[];
}

const ETATS: Record<Etat, { libelle: string; ton: Ton }> = {
  inscrit: { libelle: "Abonné", ton: "succes" },
  attente: { libelle: "À confirmer", ton: "attention" },
  desinscrit: { libelle: "Désinscrit", ton: "neutre" },
};

export function Abonnes() {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [q, setQ] = useState("");
  const [imposee, setImposee] = useState<{ ids: string[]; tour: number } | null>(null);
  const [avis, setAvis] = useState<{ ton: "succes" | "erreur" | "info"; texte: string } | null>(null);
  const [cherche, setCherche] = useState(false);
  const liste = useListe<Abonne>("abonnes", { filtre, q });
  const c = (liste.extra.compteurs ?? {}) as { inscrits?: number; attente?: number; desinscrits?: number };
  const geste = (g: "desinscrire" | "reinscrire" | "supprimer", fait: (n: number) => string) => async (ids: string[]) => fait((await appeler<{ n: number }>("abonnes-geste", { ids, geste: g })).n);
  const gestes: GesteDeMasse<Abonne>[] = [
    {
      id: "desinscrire",
      libelle: "Désinscrire",
      pour: (a) => a.etat === "inscrit",
      confirmer: (n) => ({ titre: `Désinscrire ${pluriel(n, "abonné", "abonnés")} ?`, texte: `${pluriel(n, "adresse ne recevra plus", "adresses ne recevront plus")} la lettre. Elles restent dans la liste, et « Réinscrire » les remet.`, bouton: "Désinscrire" }),
      faire: geste("desinscrire", (n) => `${pluriel(n, "abonné désinscrit", "abonnés désinscrits")}.`),
    },
    {
      id: "reinscrire",
      libelle: "Réinscrire",
      pour: (a) => a.etat === "desinscrit" && a.confirme_le !== null,
      faire: geste("reinscrire", (n) => `${pluriel(n, "abonné réinscrit", "abonnés réinscrits")}.`),
    },
    {
      id: "supprimer",
      libelle: "Supprimer",
      danger: true,
      confirmer: (n) => ({ titre: `Supprimer ${pluriel(n, "abonné", "abonnés")} ?`, texte: `${pluriel(n, "adresse sera effacée", "adresses seront effacées")} de la liste pour de bon, sans courriel. Une personne effacée peut se réinscrire depuis le site.`, bouton: `Supprimer ${pluriel(n, "abonné", "abonnés")}`, danger: true }),
      faire: geste("supprimer", (n) => `${pluriel(n, "abonné supprimé", "abonnés supprimés")}.`),
    },
  ];
  const cocherLesSuspects = async () => {
    setCherche(true);
    setAvis(null);
    try {
      const r = await appeler<{ ids: string[]; exemples: string[] }>("abonnes-suspects");
      if (!r.ids.length) setAvis({ ton: "info", texte: "Aucune inscription suspecte : toutes les adresses ont confirmé, ou attendent depuis moins de 24 heures." });
      else {
        setFiltre("tous");
        setQ("");
        setImposee({ ids: r.ids, tour: Date.now() });
        setAvis({ ton: "info", texte: `${pluriel(r.ids.length, "inscription suspecte cochée", "inscriptions suspectes cochées")} (par exemple ${r.exemples.slice(0, 3).join(", ")}). Vérifiez, puis cliquez « Supprimer ».` });
      }
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setCherche(false);
    }
  };
  return (
    <div className="gs-ecran">
      <Entete
        titre="Abonnés de la lettre"
        chapeau="Les adresses inscrites par le formulaire du site. Une inscription n'est active qu'une fois confirmée par la personne (lien reçu par courriel) ; celles qui ne confirment pas sont effacées d'elles-mêmes au bout de 7 jours."
        actions={<Bouton variant="secondary" loading={cherche} onClick={() => void cocherLesSuspects()}>Cocher les inscriptions suspectes</Bouton>}
      />
      <div className="gs-tuiles">
        <div className="gs-tuile"><p className="gs-tuile-libelle">Abonnés</p><p className="gs-tuile-valeur">{nombre(c.inscrits ?? 0)}</p><p className="gs-tuile-detail">reçoivent la lettre</p></div>
        <div className="gs-tuile"><p className="gs-tuile-libelle">À confirmer</p><p className="gs-tuile-valeur">{nombre(c.attente ?? 0)}</p><p className="gs-tuile-detail">n'ont pas encore cliqué le lien</p></div>
        <div className="gs-tuile"><p className="gs-tuile-libelle">Désinscrits</p><p className="gs-tuile-valeur">{nombre(c.desinscrits ?? 0)}</p><p className="gs-tuile-detail">retirés de l'envoi par vous</p></div>
      </div>
      <Avis avis={avis} fermer={() => setAvis(null)} />
      <ListeGeree<Abonne>
        etiquette="Abonnés"
        items={liste.items}
        idDe={(a) => a.id}
        total={liste.total}
        charge={liste.charge}
        erreur={liste.erreur}
        suite={liste.suite !== null}
        continuer={() => void liste.continuer()}
        recharger={() => void liste.recharger()}
        tout={liste.tout}
        filtresCle={`${filtre}|${q}`}
        selectionImposee={imposee}
        exporter={{ prefixe: "abonnes" }}
        gestes={gestes}
        vide={q || filtre !== "tous" ? { titre: "Aucune adresse ne correspond", texte: "Essayez une partie de l'adresse, ou choisissez « Toutes »." } : { titre: "Aucun abonné pour l'instant", texte: "Les inscriptions faites sur le site arrivent ici." }}
        outils={
          <>
            <Filtres<Filtre>
              libelle="État"
              valeur={filtre}
              onChange={setFiltre}
              options={[
                { valeur: "tous", libelle: "Toutes" },
                { valeur: "inscrit", libelle: "Abonnés", compte: c.inscrits ?? 0 },
                { valeur: "attente", libelle: "À confirmer", compte: c.attente ?? 0 },
                { valeur: "desinscrit", libelle: "Désinscrits", compte: c.desinscrits ?? 0 },
              ]}
            />
            <Recherche valeur={q} onChange={setQ} placeholder="Adresse ou domaine (par exemple gmail.com)" />
          </>
        }
        colonnes={[
          { cle: "adresse", titre: "Adresse", principale: true, rendu: (a) => a.adresse, csv: (a) => a.adresse },
          { cle: "etat", titre: "État", rendu: (a) => <Etiquette ton={ETATS[a.etat].ton}>{ETATS[a.etat].libelle}</Etiquette>, csv: (a) => ETATS[a.etat].libelle },
          { cle: "langue", titre: "Langue", rendu: (a) => (a.langue === "fr" ? "Français" : "Anglais"), csv: (a) => (a.langue === "fr" ? "Français" : "Anglais") },
          { cle: "depuis", titre: "Depuis", rendu: (a) => <span title={date(a.confirme_le ?? a.demande_le)}>{depuis(a.confirme_le ?? a.demande_le)}</span>, csv: (a) => date(a.confirme_le ?? a.demande_le) },
          { cle: "suspect", titre: "À vérifier", rendu: (a) => (a.raisons.length ? <Etiquette ton="erreur">{a.raisons.map((r) => RAISONS_FR[r]).join(", ")}</Etiquette> : null), csv: (a) => a.raisons.map((r) => RAISONS_FR[r]).join(", ") },
          { cle: "demande", titre: "Demandé le", cachee: true, rendu: () => null, csv: (a) => date(a.demande_le) },
          { cle: "confirme", titre: "Confirmé le", cachee: true, rendu: () => null, csv: (a) => date(a.confirme_le) },
          { cle: "page", titre: "Page d'inscription", cachee: true, rendu: () => null, csv: (a) => a.page ?? "" },
        ]}
      />
    </div>
  );
}
