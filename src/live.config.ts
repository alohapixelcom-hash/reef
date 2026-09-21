// src/live.config.ts - les collections lues A LA DEMANDE. Moteur eteint il n'y en a aucune ; allume, c'est la base.
//
// defineLiveCollection doit etre appele ICI et nulle part ailleurs : Astro ne
// donne la vraie fonction qu'a ce fichier precis, et la remplace partout
// ailleurs par une version qui leve "Live collections must be defined in a
// src/live.config.ts file". Seul le chargeur passe donc par l'alias
// "@moteur/live" : moteur eteint il vaut undefined, et rien d'EmDash n'entre
// dans le build statique.
import { defineLiveCollection } from "astro:content";
import { chargeur } from "@moteur/live";

export const collections = chargeur ? { _emdash: defineLiveCollection({ loader: chargeur() }) } : {};
