// src/moteur/extensions/gestion/admin/messages.tsx - l'ecran "Messages" : ce que les visiteurs ont ecrit par le formulaire de contact, a lire, classer, supprimer et a qui repondre.
/** @jsxImportSource react */
import { useEffect, useState } from "react";
import type { MessageDeLaBoite, Statut } from "../boite.ts";
import { ListeGeree, type GesteDeMasse } from "./liste";
import { appeler, Avis, Bouton, date, depuis, Entete, Etiquette, Fenetre, Filtres, pluriel, Recherche, type Ton, useListe } from "./outils";
import { signalerLesNonLus } from "./pastille";

type Filtre = "boite" | "nouveau" | "lu" | "repondu" | "archive" | "tous";

const STATUTS: Record<Statut, { libelle: string; ton: Ton }> = {
  nouveau: { libelle: "Non lu", ton: "info" },
  lu: { libelle: "Lu", ton: "neutre" },
  repondu: { libelle: "Répondu", ton: "succes" },
  archive: { libelle: "Archivé", ton: "neutre" },
};

const extrait = (t: string): string => (t.length > 110 ? `${t.slice(0, 110).trimEnd()}…` : t);

export function Messages() {
  const [filtre, setFiltre] = useState<Filtre>("boite");
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const liste = useListe<MessageDeLaBoite>("messages", { filtre, q });
  const c = (liste.extra.compteurs ?? {}) as Partial<Record<Statut, number>>;
  const peutSupprimer = liste.extra.peutSupprimer !== false;
  const distante = liste.extra.distante === true;
  const classer = (statut: Statut, fait: (n: number) => string) => async (ids: string[]) => fait((await appeler<{ n: number }>("messages-classer", { ids, statut })).n);
  const gestes: GesteDeMasse<MessageDeLaBoite>[] = [
    { id: "lus", libelle: "Marquer lus", pour: (m) => m.statut === "nouveau", faire: classer("lu", (n) => `${pluriel(n, "message marqué lu", "messages marqués lus")}.`) },
    { id: "non-lus", libelle: "Marquer non lus", pour: (m) => m.statut !== "nouveau", faire: classer("nouveau", (n) => `${pluriel(n, "message remis en non lu", "messages remis en non lu")}.`) },
    filtre === "archive"
      ? { id: "desarchiver", libelle: "Remettre dans la boîte", pour: (m) => m.statut === "archive", faire: classer("lu", (n) => `${pluriel(n, "message remis", "messages remis")} dans la boîte.`) }
      : { id: "archiver", libelle: "Archiver", pour: (m) => m.statut !== "archive", faire: classer("archive", (n) => `${pluriel(n, "message archivé", "messages archivés")}. ${n > 1 ? "Ils restent" : "Il reste"} dans « Archivés ».`) },
    ...(peutSupprimer
      ? [{
          id: "supprimer",
          libelle: "Supprimer",
          danger: true,
          confirmer: (n: number) => ({ titre: `Supprimer ${pluriel(n, "message", "messages")} ?`, texte: `${pluriel(n, "message sera effacé", "messages seront effacés")} pour de bon. Cette action ne peut pas être annulée.`, bouton: `Supprimer ${pluriel(n, "message", "messages")}`, danger: true }),
          faire: async (ids: string[]) => `${pluriel((await appeler<{ n: number }>("messages-supprimer", { ids })).n, "message supprimé", "messages supprimés")}.`,
        }]
      : []),
  ];
  return (
    <div className="gs-ecran">
      <Entete
        titre="Messages"
        chapeau={
          distante
            ? "Ce que les visiteurs écrivent par le formulaire de contact. Ces messages sont rangés par la boutique alohapixel.app : un message lu ou archivé ici l'est aussi là-bas."
            : "Ce que les visiteurs écrivent par le formulaire de contact. Chaque message est gardé ici, même si le courriel de notification n'est pas parti. Cochez-en plusieurs pour les classer ou les supprimer d'un coup."
        }
      />
      <div className={`gs-maitre${ouvert ? " gs-maitre--ouvert" : ""}`}>
        <ListeGeree<MessageDeLaBoite>
          etiquette="Messages"
          items={liste.items}
          idDe={(m) => m.id}
          total={liste.total}
          charge={liste.charge}
          erreur={liste.erreur}
          suite={liste.suite !== null}
          continuer={() => void liste.continuer()}
          recharger={() => void liste.recharger()}
          tout={liste.tout}
          filtresCle={`${filtre}|${q}`}
          apres={signalerLesNonLus}
          ouvrir={(m) => setOuvert(m.id)}
          ouverte={ouvert}
          exporter={{ prefixe: "messages" }}
          gestes={gestes}
          vide={q || filtre !== "boite" ? { titre: "Aucun message ne correspond", texte: "Essayez une autre recherche, ou choisissez « Boîte de réception »." } : { titre: "Aucun message pour l'instant", texte: "Les messages envoyés par le formulaire de contact du site arrivent ici." }}
          outils={
            <>
              <Filtres<Filtre>
                libelle="Classement"
                valeur={filtre}
                onChange={(f) => { setFiltre(f); setOuvert(null); }}
                options={[
                  { valeur: "boite", libelle: "Boîte de réception", compte: (c.nouveau ?? 0) + (c.lu ?? 0) + (c.repondu ?? 0) },
                  { valeur: "nouveau", libelle: "Non lus", compte: c.nouveau ?? 0 },
                  { valeur: "repondu", libelle: "Répondus", compte: c.repondu ?? 0 },
                  { valeur: "archive", libelle: "Archivés", compte: c.archive ?? 0 },
                  { valeur: "tous", libelle: "Tous" },
                ]}
              />
              <Recherche valeur={q} onChange={setQ} placeholder="Nom, adresse, sujet ou mot du message" />
            </>
          }
          colonnes={[
            { cle: "de", titre: "De", rendu: (m) => <span className="gs-deux-lignes"><strong className={m.statut === "nouveau" ? "gs-gras" : undefined}>{m.nom}</strong><span className="gs-discret">{m.adresse}</span></span>, csv: (m) => m.nom },
            { cle: "sujet", titre: "Message", principale: true, rendu: (m) => <span className="gs-deux-lignes"><strong className={m.statut === "nouveau" ? "gs-gras" : undefined}>{m.sujet}</strong><span className="gs-discret">{extrait(m.message)}</span></span>, csv: (m) => m.sujet },
            { cle: "recu", titre: "Reçu", rendu: (m) => <span title={date(m.recu_le)}>{depuis(m.recu_le)}</span>, csv: (m) => date(m.recu_le) },
            { cle: "statut", titre: "État", rendu: (m) => <Etiquette ton={STATUTS[m.statut].ton}>{STATUTS[m.statut].libelle}</Etiquette>, csv: (m) => STATUTS[m.statut].libelle },
            { cle: "adresse", titre: "Adresse", cachee: true, rendu: () => null, csv: (m) => m.adresse },
            { cle: "texte", titre: "Texte du message", cachee: true, rendu: () => null, csv: (m) => m.message },
          ]}
        />
        {ouvert ? <FicheMessage id={ouvert} peutSupprimer={peutSupprimer} fermer={() => setOuvert(null)} change={() => { void liste.recharger(); signalerLesNonLus(); }} /> : null}
      </div>
    </div>
  );
}

function FicheMessage({ id, peutSupprimer, fermer, change }: { id: string; peutSupprimer: boolean; fermer: () => void; change: () => void }) {
  const [m, setM] = useState<MessageDeLaBoite | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [avis, setAvis] = useState<{ ton: "succes" | "erreur" | "info"; texte: string } | null>(null);
  const [effacer, setEffacer] = useState(false);
  useEffect(() => {
    let vivant = true;
    setM(null);
    setErreur(null);
    setAvis(null);
    setReponse("");
    appeler<MessageDeLaBoite>("message", { id })
      .then((lu) => { if (vivant) { setM(lu); change(); } })
      .catch((e: unknown) => vivant && setErreur(e instanceof Error ? e.message : String(e)));
    return () => { vivant = false; };
    // Relu a chaque message ouvert ; `change` recharge la liste (le message y passe en lu).
  }, [id]);
  const classer = async (statut: Statut, texte: string) => {
    setOccupe(true);
    try {
      await appeler("messages-classer", { ids: [id], statut });
      setM((x) => (x ? { ...x, statut } : x));
      setAvis({ ton: "succes", texte });
      change();
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setOccupe(false);
    }
  };
  const repondre = async () => {
    setOccupe(true);
    try {
      const r = await appeler<{ ok: boolean; message: string }>("message-repondre", { id, texte: reponse });
      setAvis({ ton: r.ok ? "succes" : "erreur", texte: r.message });
      if (r.ok) {
        setM((x) => (x ? { ...x, statut: "repondu", reponse, repondu_le: Date.now() } : x));
        setReponse("");
        change();
      }
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
    } finally {
      setOccupe(false);
    }
  };
  const supprimer = async () => {
    setOccupe(true);
    try {
      await appeler("messages-supprimer", { ids: [id] });
      change();
      fermer();
    } catch (e) {
      setAvis({ ton: "erreur", texte: e instanceof Error ? e.message : String(e) });
      setOccupe(false);
      setEffacer(false);
    }
  };
  if (erreur) return <aside className="gs-detail"><Avis avis={{ ton: "erreur", texte: erreur }} /><Bouton variant="secondary" onClick={fermer}>Retour à la liste</Bouton></aside>;
  if (!m) return <aside className="gs-detail"><p className="gs-discret">Chargement…</p></aside>;
  return (
    <aside className="gs-detail" aria-label={`Message de ${m.nom}`}>
      <button type="button" className="gs-retour" onClick={fermer}>Retour à la liste</button>
      <p className="gs-surtitre">Reçu le {date(m.recu_le)}{m.page ? ` depuis la page ${m.page}` : ""}</p>
      <h2 className="gs-fiche-titre">{m.sujet}</h2>
      <p className="gs-de"><strong>{m.nom}</strong> <a href={`mailto:${m.adresse}`}>{m.adresse}</a> <Etiquette ton={STATUTS[m.statut].ton}>{STATUTS[m.statut].libelle}</Etiquette></p>
      <div className="gs-texte">{m.message}</div>
      <Avis avis={avis} />
      <div className="gs-gestes">
        {m.statut === "archive" ? (
          <Bouton variant="secondary" size="sm" disabled={occupe} onClick={() => void classer("lu", "Message remis dans la boîte.")}>Remettre dans la boîte</Bouton>
        ) : (
          <Bouton variant="secondary" size="sm" disabled={occupe} onClick={() => void classer("archive", "Message archivé.")}>Archiver</Bouton>
        )}
        <Bouton variant="secondary" size="sm" disabled={occupe || m.statut === "nouveau"} onClick={() => void classer("nouveau", "Message remis en non lu.")}>Marquer non lu</Bouton>
        {peutSupprimer ? <Bouton variant="destructive" size="sm" disabled={occupe} onClick={() => setEffacer(true)}>Supprimer</Bouton> : null}
      </div>
      {m.reponse ? (
        <div className="gs-deja">
          <p className="gs-surtitre">Votre réponse du {date(m.repondu_le)}</p>
          <div className="gs-texte gs-texte--reponse">{m.reponse}</div>
        </div>
      ) : null}
      <label className="gs-champ">
        <span className="gs-champ-titre">Répondre à {m.nom}</span>
        <span className="gs-champ-aide">Le courriel part de l'adresse du site, par Cloudflare Email, avec le message d'origine cité en dessous. La réponse de la personne arrivera dans votre messagerie habituelle.</span>
        <textarea rows={6} value={reponse} onChange={(e) => setReponse(e.target.value)} placeholder="Bonjour, merci pour votre message…" />
      </label>
      <div className="gs-gestes">
        <Bouton variant="primary" disabled={occupe || reponse.trim().length < 2} loading={occupe} onClick={() => void repondre()}>Envoyer la réponse</Bouton>
      </div>
      <Fenetre
        demande={effacer ? { titre: "Supprimer ce message ?", texte: `Le message de ${m.nom} sera effacé pour de bon. Cette action ne peut pas être annulée.`, bouton: "Supprimer le message", danger: true } : null}
        occupe={occupe}
        annuler={() => setEffacer(false)}
        confirmer={() => void supprimer()}
      />
    </aside>
  );
}
