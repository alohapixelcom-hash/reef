// src/moteur/extensions/gestion/admin/journal.tsx - l'ecran "Journal des courriels" : chaque envoi du site, parti ou non, a chercher, renvoyer, supprimer ou exporter.
/** @jsxImportSource react */
import { useState } from "react";
import { ListeGeree, type GesteDeMasse } from "./liste";
import { appeler, Avis, Bouton, date, depuis, Entete, Etiquette, Filtres, pluriel, Recherche, type Ton, useListe } from "./outils";

type Etat = "envoye" | "refuse" | "plafonne";

interface Envoi {
  id: string;
  quand: number;
  formulaire: string;
  destinataire: string;
  sujet: string;
  etat: Etat;
  pourquoi: string | null;
  renvoi_de: string | null;
  message: { a: string[]; sujet: string; texte: string } | null;
}

const ETATS: Record<Etat, { libelle: string; ton: Ton }> = {
  envoye: { libelle: "Parti", ton: "succes" },
  refuse: { libelle: "Refusé", ton: "erreur" },
  plafonne: { libelle: "Bloqué", ton: "attention" },
};

const ORIGINES: Record<string, string> = {
  contact: "Contact",
  lettre: "Lettre",
  commande: "Commande",
  accuse: "Accusé de réception",
  essai: "Essai",
  systeme: "Back office",
  autre: "Autre",
};

export function Journal() {
  const [etat, setEtat] = useState<Etat | "">("");
  const [formulaire, setFormulaire] = useState("");
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState<Envoi | null>(null);
  const liste = useListe<Envoi>("journal", { etat, formulaire, q });
  const gestes: GesteDeMasse<Envoi>[] = [
    {
      id: "renvoyer",
      libelle: "Renvoyer",
      pour: (e) => e.etat !== "envoye" && e.message !== null,
      confirmer: (n) => ({ titre: `Renvoyer ${pluriel(n, "courriel", "courriels")} ?`, texte: `${pluriel(n, "courriel repart", "courriels repartent")} à l'identique (50 au plus par clic). Chaque renvoi s'inscrit au journal.`, bouton: "Renvoyer" }),
      faire: async (ids) => {
        const r = await appeler<{ envoyes: number; refuses: number; message?: string }>("journal-renvoyer", { ids });
        return r.message ?? `${pluriel(r.envoyes, "courriel reparti", "courriels repartis")}${r.refuses ? `, ${pluriel(r.refuses, "encore refusé", "encore refusés")} (la raison est dans le journal)` : ""}.`;
      },
    },
    {
      id: "supprimer",
      libelle: "Supprimer",
      danger: true,
      confirmer: (n) => ({ titre: `Supprimer ${pluriel(n, "ligne", "lignes")} du journal ?`, texte: `${pluriel(n, "ligne sera effacée", "lignes seront effacées")} du journal, avec le contenu du courriel. Les compteurs du mois en tiennent compte. Cette action ne peut pas être annulée.`, bouton: "Supprimer", danger: true }),
      faire: async (ids) => `${pluriel((await appeler<{ n: number }>("journal-supprimer", { ids })).n, "ligne supprimée", "lignes supprimées")} du journal.`,
    },
  ];
  return (
    <div className="gs-ecran">
      <Entete titre="Journal des courriels" chapeau="Chaque courriel du site, parti ou non, avec la raison d'un refus. Un courriel refusé n'est jamais perdu : cochez-le et cliquez « Renvoyer » une fois la cause réglée. Le journal se vide seul au-delà de 400 jours." />
      <div className={`gs-maitre${ouvert ? " gs-maitre--ouvert" : ""}`}>
        <ListeGeree<Envoi>
          etiquette="Journal des courriels"
          items={liste.items}
          idDe={(e) => e.id}
          total={liste.total}
          charge={liste.charge}
          erreur={liste.erreur}
          suite={liste.suite !== null}
          continuer={() => void liste.continuer()}
          recharger={() => void liste.recharger()}
          tout={liste.tout}
          filtresCle={`${etat}|${formulaire}|${q}`}
          ouvrir={setOuvert}
          ouverte={ouvert?.id ?? null}
          exporter={{ prefixe: "journal-des-courriels" }}
          gestes={gestes}
          vide={{ titre: q || etat || formulaire ? "Aucun envoi ne correspond" : "Aucun courriel pour l'instant", texte: q || etat || formulaire ? "Essayez une autre recherche, ou choisissez « Tous »." : "Le premier courriel du site s'inscrira ici." }}
          outils={
            <>
              <Filtres<Etat | "">
                libelle="État"
                valeur={etat}
                onChange={setEtat}
                options={[
                  { valeur: "", libelle: "Tous" },
                  { valeur: "envoye", libelle: "Partis" },
                  { valeur: "refuse", libelle: "Refusés" },
                  { valeur: "plafonne", libelle: "Bloqués" },
                ]}
              />
              <label className="gs-choix">
                <span className="gs-masque">Origine</span>
                <select value={formulaire} onChange={(e) => setFormulaire(e.target.value)}>
                  <option value="">Toutes les origines</option>
                  {Object.entries(ORIGINES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <Recherche valeur={q} onChange={setQ} placeholder="Destinataire ou sujet" />
            </>
          }
          colonnes={[
            { cle: "quand", titre: "Quand", rendu: (e) => <span title={date(e.quand)}>{depuis(e.quand)}</span>, csv: (e) => date(e.quand) },
            { cle: "origine", titre: "Origine", rendu: (e) => ORIGINES[e.formulaire] ?? e.formulaire, csv: (e) => ORIGINES[e.formulaire] ?? e.formulaire },
            { cle: "sujet", titre: "Courriel", principale: true, rendu: (e) => <span className="gs-deux-lignes"><strong>{e.sujet}</strong><span className="gs-discret">à {e.destinataire}</span></span>, csv: (e) => e.sujet },
            { cle: "etat", titre: "État", rendu: (e) => <Etiquette ton={ETATS[e.etat]?.ton ?? "neutre"}>{ETATS[e.etat]?.libelle ?? e.etat}</Etiquette>, csv: (e) => ETATS[e.etat]?.libelle ?? e.etat },
            { cle: "pourquoi", titre: "Pourquoi", repliable: true, rendu: (e) => (e.pourquoi ? <span className="gs-discret">{e.pourquoi}</span> : null), csv: (e) => e.pourquoi ?? "" },
            { cle: "destinataire", titre: "Destinataire", cachee: true, rendu: () => null, csv: (e) => e.destinataire },
          ]}
        />
        {ouvert ? <FicheEnvoi e={ouvert} fermer={() => setOuvert(null)} renvoye={() => void liste.recharger()} /> : null}
      </div>
    </div>
  );
}

function FicheEnvoi({ e, fermer, renvoye }: { e: Envoi; fermer: () => void; renvoye: () => void }) {
  const [occupe, setOccupe] = useState(false);
  const [avis, setAvis] = useState<{ ton: "succes" | "erreur"; texte: string } | null>(null);
  const renvoyer = async () => {
    setOccupe(true);
    try {
      const r = await appeler<{ envoyes: number; message?: string }>("journal-renvoyer", { ids: [e.id] });
      setAvis(r.envoyes ? { ton: "succes", texte: "Courriel reparti. Le renvoi est inscrit en tête du journal." } : { ton: "erreur", texte: r.message ?? "Le courriel est encore refusé : la raison est en tête du journal." });
      renvoye();
    } catch (x) {
      setAvis({ ton: "erreur", texte: x instanceof Error ? x.message : String(x) });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <aside className="gs-detail" aria-label={`Envoi : ${e.sujet}`}>
      <button type="button" className="gs-retour" onClick={fermer}>Retour à la liste</button>
      <p className="gs-surtitre">{date(e.quand)} · {ORIGINES[e.formulaire] ?? e.formulaire}</p>
      <h2 className="gs-fiche-titre">{e.sujet}</h2>
      <p className="gs-de">à {e.destinataire} <Etiquette ton={ETATS[e.etat]?.ton ?? "neutre"}>{ETATS[e.etat]?.libelle ?? e.etat}</Etiquette></p>
      {e.pourquoi ? <div className="gs-avis gs-avis--erreur"><span>{e.pourquoi}</span></div> : null}
      {e.message ? <div className="gs-texte">{e.message.texte}</div> : <p className="gs-discret">Le contenu de ce courriel n'est pas gardé (courriel du back office, qui porte un lien de connexion).</p>}
      <Avis avis={avis} />
      {e.etat !== "envoye" && e.message ? (
        <div className="gs-gestes">
          <Bouton variant="primary" loading={occupe} onClick={() => void renvoyer()}>Renvoyer ce courriel</Bouton>
        </div>
      ) : null}
    </aside>
  );
}
