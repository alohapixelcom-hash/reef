// src/moteur/extensions/courriels/ecrans/blocs.ts - le sous-ensemble de Block Kit que les ecrans des courriels emploient, et les formats de date partages.
//
// POURQUOI BLOCK KIT : c'est le format natif des pages d'extension d'EmDash.
// Le back office rend ces blocs avec SES composants (tuiles de chiffres,
// jauge, tableaux, formulaires, bandeaux) : les ecrans heritent de son allure,
// de ses deux modes et de l'habillage du theme sans une ligne de style, et le
// theme ne gagne ni composant React ni dependance. Les types ci-dessous sont
// ceux de @emdash-cms/blocks 0.38, recopies pour ce qu'on emploie : le paquet
// n'est pas une dependance directe, et le moteur valide chaque reponse.
import type { Textes } from "./textes.fr.ts";

export type Element =
  | { type: "button"; action_id: string; label: string; style?: "primary" | "secondary" | "danger"; value?: unknown; confirm?: { title: string; text: string; confirm: string; deny: string } }
  | { type: "select"; action_id: string; label: string; options: { label: string; value: string }[]; initial_value?: string };

export type Champ = (
  | { type: "text_input"; action_id: string; label: string; placeholder?: string; initial_value?: string; multiline?: boolean }
  | { type: "number_input"; action_id: string; label: string; initial_value?: number; min?: number; max?: number }
  | { type: "toggle"; action_id: string; label: string; description?: string; initial_value?: boolean }
) & { condition?: { field: string; eq: unknown } };

export type Bloc = { block_id?: string } & (
  | { type: "header"; text: string }
  | { type: "section"; text: string; accessory?: Element }
  | { type: "context"; text: string }
  | { type: "divider" }
  | { type: "fields"; fields: { label: string; value: string }[] }
  | { type: "stats"; items: { label: string; value: string | number; description?: string }[] }
  | { type: "meter"; label: string; value: number; max?: number; custom_value?: string }
  | { type: "banner"; title?: string; description: string; variant: "default" | "alert" | "error" }
  | { type: "code"; code: string; language?: "bash" | "jsonc" }
  | { type: "actions"; elements: Element[] }
  | { type: "accordion"; label: string; blocks: Bloc[]; default_open?: boolean }
  | { type: "form"; fields: Champ[]; submit: { label: string; action_id: string } }
  | { type: "table"; columns: { key: string; label: string; format?: "text" | "badge" }[]; rows: Record<string, string>[]; page_action_id: string; empty_text: string }
);

export interface Reponse {
  blocks: Bloc[];
  toast?: { message: string; type: "success" | "error" | "info" };
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** "28 sept. 2026, 14:03" a l'heure de Paris, dans la langue de l'ecran. */
export function date(t: Textes, ms: number | null): string {
  if (!ms) return t.jamais;
  let f = formats.get(t.locale);
  if (!f) {
    f = new Intl.DateTimeFormat(t.locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
    formats.set(t.locale, f);
  }
  return f.format(new Date(ms));
}

/** "28 sept. 18:12" : la date courte des listes, qui doivent tenir sur un telephone. */
export function dateCourte(t: Textes, ms: number): string {
  let f = formats.get(`${t.locale}:court`);
  if (!f) {
    f = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    formats.set(`${t.locale}:court`, f);
  }
  return f.format(new Date(ms));
}

/** "1 octobre 2026" : la date seule, pour dire quand le compteur repart. */
export function jour(t: Textes, ms: number): string {
  return new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(ms));
}

/** "il y a 3 minutes" ; la date exacte au-dela d'un mois. */
export function depuis(t: Textes, ms: number | null, maintenant: number): string {
  if (!ms) return t.jamais;
  const ecart = (ms - maintenant) / 1000;
  const relatif = new Intl.RelativeTimeFormat(t.locale, { numeric: "auto" });
  const pas: [number, Intl.RelativeTimeFormatUnit, number][] = [
    [60, "second", 1],
    [3600, "minute", 60],
    [86400, "hour", 3600],
    [86400 * 30, "day", 86400],
  ];
  for (const [limite, unite, diviseur] of pas) if (Math.abs(ecart) < limite) return relatif.format(Math.round(ecart / diviseur), unite);
  return date(t, ms);
}
