// src/moteur/extensions/gestion/distante.ts - la boite des messages d'un site dont le formulaire est range par un autre Worker (alohapixel.com : la boutique), lue et modifiee par une liaison de service, sans copie.
//
// LE CONTRAT est celui de l'entree RPC "Agence" de la boutique
// (aloha-store, src/boutique/agence.ts) : messages, message, statutMessage,
// messagesEnMasse, repondreMessage, nonLus. Chaque methode ne voit que les
// messages du site appelant : le perimetre est tenu chez elle, pas ici. La
// liaison ne repond a aucune adresse d'Internet et aucune cle ne circule ;
// `qui` (l'administrateur authentifie par EmDash) part au journal de la
// boutique.
//
// Ce que la boutique appelle "trashed" puis "effacer" est la suppression
// d'ici : deux gestes, un seul clic confirme a l'ecran.
import type { Boite, MessageDeLaBoite, Statut } from "./boite.ts";

/** Les formes de la boutique (src/boutique/contrat.ts), reduites a ce qui est lu ici. */
interface LigneDistante {
  id: string;
  creee: number;
  nom: string;
  email: string;
  sujet: string | null;
  apercu?: string;
  message?: string;
  statut: string;
}

interface Agence {
  messages(filtres: Record<string, unknown>): Promise<{ items: LigneDistante[]; suite: string | null; compteurs: Record<string, number> }>;
  message(id: string): Promise<LigneDistante | null>;
  statutMessage(id: string, statut: string, qui: string): Promise<{ ok: boolean; erreur: string | null }>;
  messagesEnMasse(ids: string[], geste: string, qui: string): Promise<{ ok: boolean; touches: number; laisses: number; erreur: string | null }>;
  repondreMessage(id: string, entree: { sujet?: string; texte: string }, qui: string): Promise<{ ok: boolean; envoye: boolean; erreur: string | null }>;
  nonLus(): Promise<number>;
}

const VERS_ICI: Record<string, Statut> = { new: "nouveau", read: "lu", answered: "repondu", archived: "archive", spam: "archive", trashed: "archive" };
const VERS_LA_BAS: Record<Statut, string> = { nouveau: "new", lu: "read", repondu: "answered", archive: "archived" };

const versLaBoite = (l: LigneDistante): MessageDeLaBoite => ({
  id: String(l.id),
  recu_le: Number(l.creee),
  nom: String(l.nom ?? ""),
  adresse: String(l.email ?? ""),
  sujet: l.sujet ? String(l.sujet) : "(sans sujet)",
  message: String(l.message ?? l.apercu ?? ""),
  statut: VERS_ICI[l.statut] ?? "lu",
  page: null,
  repondu_le: null,
  reponse: null,
});

/** Le filtre d'ici dans les mots de la boutique ("" : la boite de reception). */
const filtreLaBas = (f: string | undefined): string => (f && f !== "boite" && f !== "tous" && f in VERS_LA_BAS ? VERS_LA_BAS[f as Statut] : "");

async function liaison(nom: string): Promise<Agence | null> {
  try {
    // @ts-ignore -- module de la plateforme, absent du controle de types du theme
    const plateforme: { env?: Record<string, unknown> } = await import("cloudflare:workers");
    const stub = plateforme.env?.[nom];
    return stub && (typeof stub === "object" || typeof stub === "function") ? (stub as Agence) : null;
  } catch {
    return null;
  }
}

export async function boiteDistante(nom: string): Promise<Boite | null> {
  const agence = await liaison(nom);
  if (!agence) return null;
  const masse = async (ids: readonly string[], geste: string, qui: string): Promise<number> => {
    let n = 0;
    for (let i = 0; i < ids.length; i += 1000) {
      const r = await agence.messagesEnMasse(ids.slice(i, i + 1000), geste, qui);
      if (!r.ok && r.erreur) throw new Error(`La boutique a refusé : ${r.erreur}.`);
      n += Number(r.touches ?? 0);
    }
    return n;
  };
  return {
    distante: true,
    peutSupprimer: true,
    async liste(r) {
      const statut = filtreLaBas(r.filtre);
      const q = r.q ?? "";
      const voulu = Math.min(Math.max(r.limite ?? 50, 1), 5000);
      const items: MessageDeLaBoite[] = [];
      let curseur: string | null = typeof r.depuis === "string" && r.depuis ? r.depuis : null;
      let compteurs: Record<string, number> = {};
      // La boutique rend 100 lignes au plus par appel : "tout" (export) enchaine les pages.
      do {
        const page = await agence.messages({ statut, q, curseur, limite: Math.min(voulu - items.length, 100) });
        compteurs = page.compteurs ?? {};
        items.push(...page.items.map(versLaBoite));
        curseur = page.suite;
      } while (curseur && items.length < voulu);
      const n = (s: string) => Number(compteurs[s] ?? 0);
      const total = statut ? n(statut) : n("boite");
      return { items, suite: curseur, total, compteurs: { nouveau: n("new"), lu: n("read"), repondu: n("answered"), archive: n("archived") } };
    },
    async detail(id, qui = "inconnu") {
      const m = await agence.message(id);
      if (!m) return null;
      if (m.statut === "new") await agence.statutMessage(id, "read", qui);
      return versLaBoite({ ...m, statut: m.statut === "new" ? "read" : m.statut });
    },
    async classer(ids, statut, qui) {
      if (statut === "repondu") throw new Error("« Répondu » se pose en répondant au message.");
      return masse(ids, VERS_LA_BAS[statut], qui);
    },
    async supprimer(ids, qui) {
      await masse(ids, "trashed", qui);
      return masse(ids, "effacer", qui);
    },
    async repondre(id, texte, qui) {
      const m = await agence.message(id);
      if (!m) return { ok: false, message: "Ce message n'existe plus : il a peut-être été supprimé." };
      const r = await agence.repondreMessage(id, { texte }, qui);
      if (r.ok && r.envoye) return { ok: true, message: `Réponse envoyée à ${m.email}.` };
      return { ok: false, message: `La réponse n'est pas partie${r.erreur ? ` : ${r.erreur}` : ""}. Réessayez dans un instant.` };
    },
    nonLus: async () => Number(await agence.nonLus()),
  };
}
