// src/moteur/icones.ts - l'icone qu'un editeur choisit dans le back office (generique) : un nom francais, et l'icone du theme que ce nom dessine.
//
// POURQUOI DES NOMS FRANCAIS : le champ "Icone" d'un element (sous-champ icon
// des arguments d'une section) est une liste de choix, et le back office
// montre la valeur telle quelle. Un editeur lit "Enveloppe", pas "mail".
// La table des noms est dans l'adaptateur du theme (theme.ts, ICONES), parce
// que chaque theme a son jeu d'icones ; les valeurs de la graine en sont les
// cles, dans cet ordre, et le self-check du theme le verifie.
//
// Champ vide : l'icone que le theme prevoit a ce rang (le rendu d'origine).
import { ICONES } from "./theme.ts";

type Table = typeof ICONES;
export type NomDIcone = keyof Table;

/** L'icone choisie par l'editeur (son nom francais), ou celle que le theme prevoit si le champ est vide ou inconnu. */
export function iconeChoisie<T extends string>(valeur: unknown, parDefaut: T): Table[NomDIcone] | T {
  return typeof valeur === "string" && valeur in ICONES ? ICONES[valeur as NomDIcone] : parDefaut;
}
