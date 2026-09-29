// src/moteur/extensions/courriels/ecrans/brancher.ts - l'ecran "Brancher les courriels" : quatre etapes guidees, chacune avec son etat relu (adresse, domaine et DNS, liaison du Worker, essai).
import type { Configuration } from "../configuration.ts";
import { IDENTITE } from "../identite.mjs";
import { attendus, type Verdict } from "../noyau/dns.ts";
import { domaineDe, type Reglages } from "../noyau/regles.ts";
import { type Bloc, date, type Reponse } from "./blocs.ts";
import type { Textes } from "./textes.fr.ts";

export const ACTIONS = { verifier: "brancher:verifier", essai: "brancher:essai", choisir: "brancher:choisir" } as const;

export interface DonneesBrancher {
  reglages: Reglages;
  liaison: boolean;
  /** Le fournisseur choisi dans Reglages > Courriels (null : aucun). */
  livreur: string | null;
  /** null : pas encore de domaine a verifier. */
  dns: Verdict[] | null;
  verifieLe: number;
  /** L'adresse du compte connecte, destinataire de l'essai. */
  moi: string | null;
  /** Vrai quand le dernier essai du journal est parti. */
  essaiReussi: boolean;
  configuration: Configuration;
  /** Le resultat d'un essai, pose sous son bouton. */
  bandeau?: Bloc;
}

const etape = (t: Textes, titre: string, fait: boolean): Bloc => ({ type: "header", text: `${titre} · ${fait ? t.brancher.fait : t.brancher.aFaire}` });

function etapeDns(t: Textes, d: DonneesBrancher, domaine: string): Bloc[] {
  if (!domaine || !d.dns) return [{ type: "context", text: t.brancher.dnsSansDomaine }];
  const verdicts = new Map(d.dns.map((v) => [v.cle, v]));
  const tous = d.dns.every((v) => v.etat === "ok");
  const double = d.dns.some((v) => v.etat === "double");
  const injoignable = d.dns.every((v) => v.etat === "injoignable");
  const blocs: Bloc[] = [
    { type: "section", text: t.brancher.dnsTitre, accessory: { type: "button", action_id: ACTIONS.verifier, label: t.brancher.verifier, style: "secondary" } },
    {
      type: "table",
      page_action_id: "brancher:dns",
      empty_text: "",
      columns: [
        { key: "type", label: t.brancher.dnsColonnes.type },
        { key: "nom", label: t.brancher.dnsColonnes.nom },
        { key: "attendu", label: t.brancher.dnsColonnes.attendu },
        { key: "lu", label: t.brancher.dnsColonnes.lu },
        { key: "etat", label: t.brancher.dnsColonnes.etat, format: "badge" },
      ],
      rows: attendus(domaine).map((a) => {
        const v = verdicts.get(a.cle);
        return {
          type: `${a.type} · ${t.brancher.dnsNoms[a.cle]}`,
          nom: a.nom,
          attendu: a.valeur,
          lu: v?.lu.join(" | ") || "-",
          etat: t.brancher.dnsEtats[v?.etat ?? "injoignable"],
        };
      }),
    },
  ];
  if (injoignable) blocs.push({ type: "banner", variant: "alert", description: t.brancher.dnsInjoignable });
  else if (double) blocs.push({ type: "banner", variant: "error", description: t.brancher.dnsDouble });
  else blocs.push({ type: "banner", variant: tous ? "default" : "alert", description: tous ? t.brancher.dnsOk : t.brancher.dnsKo });
  blocs.push({ type: "context", text: t.brancher.dnsVerifie(date(t, d.verifieLe)) });
  return blocs;
}

export function brancher(t: Textes, d: DonneesBrancher): Reponse {
  const { reglages, configuration: c } = d;
  const domaine = domaineDe(reglages.expediteur);
  const dnsBon = !!d.dns && d.dns.every((v) => v.etat === "ok");
  const blocks: Bloc[] = [
    { type: "header", text: t.pages.brancher },
    { type: "section", text: t.brancher.intro },
    { type: "divider" },

    etape(t, t.brancher.etape1, !!reglages.expediteur),
    reglages.expediteur
      ? { type: "section", text: t.brancher.etape1Ok(reglages.expediteur, domaine) }
      : { type: "banner", variant: "alert", description: t.brancher.etape1Ko },
    { type: "divider" },

    etape(t, t.brancher.etape2, dnsBon),
    { type: "section", text: t.brancher.etape2Texte(domaine || t.brancher.domaineExemple) },
    // Les commandes ne s'adressent qu'a la personne qui a installe le site :
    // repliees, elles ne font pas peur au client, qui transmet la page.
    { type: "accordion", label: t.brancher.installateur, blocks: [{ type: "context", text: t.brancher.etape2Consigne }, { type: "code", language: "bash", code: `npx wrangler email sending enable ${domaine || t.brancher.domaineExemple}\nnpx wrangler email sending dns get ${domaine || t.brancher.domaineExemple}` }] },
    ...etapeDns(t, d, domaine),
    { type: "divider" },

    etape(t, t.brancher.etape3, d.liaison && d.livreur === IDENTITE.id),
  ];
  if (d.liaison) {
    blocks.push({ type: "banner", variant: "default", description: t.brancher.etape3Ok });
    // La liaison ne sert que si Courriels est le fournisseur du canal. En
    // ligne il l'est tout seul ; en developpement, EmDash ajoute sa console
    // et le choix revient a l'administrateur (Reglages > Courriels).
    if (d.livreur === IDENTITE.id) blocks.push({ type: "context", text: t.brancher.livreurOk });
    else
      blocks.push(
        {
          type: "banner",
          variant: "alert",
          description: d.livreur ? t.brancher.livreurAutre(d.livreur === "emdash-console-email" ? t.brancher.console : d.livreur) : t.brancher.livreurAucun,
        },
        { type: "context", text: t.brancher.livreurPourquoi },
        { type: "actions", elements: [{ type: "button", action_id: ACTIONS.choisir, label: t.brancher.choisir, style: "primary" }] },
      );
  } else {
    blocks.push(
      { type: "banner", variant: "alert", description: t.brancher.etape3Ko },
      {
        type: "accordion",
        label: t.brancher.installateur,
        blocks: [
          { type: "context", text: t.brancher.etape3Ligne(c.liaison, c.fichierWrangler) },
          { type: "code", language: "jsonc", code: `"send_email": [{ "name": "${c.liaison}" }],` },
          { type: "context", text: t.brancher.etape3Deployer },
          { type: "code", language: "bash", code: c.deploiement },
        ],
      },
    );
  }
  blocks.push({ type: "divider" }, etape(t, t.brancher.etape4, d.essaiReussi));
  if (d.moi) {
    blocks.push(
      { type: "section", text: t.brancher.etape4Texte(d.moi) },
      { type: "actions", elements: [{ type: "button", action_id: ACTIONS.essai, label: t.brancher.essai, style: "primary" }] },
    );
  } else {
    blocks.push({ type: "context", text: t.brancher.etape4SansAdresse });
  }
  if (d.bandeau) blocks.push(d.bandeau);
  return { blocks };
}
