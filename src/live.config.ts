// src/live.config.ts - les collections lues A LA DEMANDE. Moteur eteint il n'y en a aucune ; allume, c'est la base.
//
// Le choix passe par l'alias "@moteur/live" et pas par un import direct :
// moteur eteint, rien d'EmDash ne doit entrer dans le build statique.
export { collections } from "@moteur/live";
