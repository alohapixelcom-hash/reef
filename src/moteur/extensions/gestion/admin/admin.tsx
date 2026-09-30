// src/moteur/extensions/gestion/admin/admin.tsx - les ecrans de l'extension "Gestion" dans le back office d'EmDash, sa feuille de style et la pastille des messages non lus.
/** @jsxImportSource react */
//
// EmDash importe ce module dans son application d'administration (adminEntry
// du descripteur) et monte chaque composant sous
// /_emdash/admin/plugins/aloha-gestion/<chemin>. A l'import, il pose une fois
// sa feuille (classes gs-*, variables natives du back office) et branche la
// pastille du rail : aucun intergiciel a declarer dans le site.
import fiche from "../styles/fiche.css?raw";
import feuille from "../styles/gestion.css?raw";
import { Abonnes } from "./abonnes";
import { Journal } from "./journal";
import { Messages } from "./messages";
import { brancherLaPastille } from "./pastille";

if (typeof document !== "undefined" && !document.querySelector("style[data-aloha-gestion]")) {
  const style = document.createElement("style");
  style.dataset.alohaGestion = "";
  style.textContent = `${feuille}\n${fiche}`.replace(/\/\*[\s\S]*?\*\//g, "");
  document.head.appendChild(style);
  brancherLaPastille();
}

export const pages = {
  "/messages": Messages,
  "/abonnes": Abonnes,
  "/journal": Journal,
};
