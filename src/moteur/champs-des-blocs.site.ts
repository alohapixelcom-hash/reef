// src/moteur/champs-des-blocs.site.ts - la carte des champs de chaque bloc de Reef (forme : champs-des-blocs.ts) :
// ce que theme.ts declare (CHAMPS_DES_BLOCS) pour que l'ecran d'un bloc ne montre que les champs qui agissent.
//
// RELEVEE PAR LA SONDE, pas ecrite a la main : chaque champ de chaque bloc change
// par l'API du moteur, publie, les pages du bloc relues sans session (visiteur),
// puis la valeur remise. Un champ figure pour un bloc s'il change le HTML d'une de ses
// pages. Une adresse de bouton est mesuree avec son texte, un mot en couleur
// avec un mot du titre, une image d'attente avec une video ; un sous-champ
// d'element sur tous les elements a la fois (une liste vide en recoit un).
// Un bloc ajoute plus tard, absent de la carte, garde tout. Relever a nouveau
// la carte quand un composant change ce qu'il lit.
import type { ChampsDesBlocs } from "./champs-des-blocs.ts";

export const CHAMPS_DES_BLOCS: ChampsDesBlocs = {
  surveilles: ["title", "eyebrow", "accent", "lede", "body", "image", "video", "video_poster", "arguments", "arguments.title", "arguments.body", "arguments.anchor", "arguments.link", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "note", "breadcrumb", "meta_title", "meta_description", "meta_image", "revised"],
  libelles: {
    "lede": "Texte d'introduction, sous le titre",
    "body": "Texte",
    "arguments.title": "Titre",
    "arguments.body": "Texte",
    "arguments.anchor": "Ancre de la clause dans l'adresse de la page (vide : tirée du titre)",
    "arguments.link": "Adresse du lien (vide : celle prévue par le thème)",
    "note": "Note en petit, sous le bloc",
    "meta_description": "Description de la page dans les résultats de recherche",
  },
  blocs: {
    "a-la-une": ["eyebrow"],
    "a-lire-ensuite": ["title", "accent", "lede", "cta"],
    "a-propos": ["title", "eyebrow", "accent", "lede", "breadcrumb", "meta_title", "meta_description", "meta_image"],
    "a-propos-appel": ["title", "lede", "cta"],
    "a-propos-histoire": ["title", "accent", "arguments", "arguments.body"],
    "a-propos-regles": ["title", "accent", "lede", "image", "arguments", "arguments.title", "arguments.body"],
    "a-propos-signatures": ["title", "accent", "lede", "cta"],
    "archives": ["title", "eyebrow", "accent", "lede", "breadcrumb", "meta_title", "meta_description", "meta_image"],
    "auteurs": ["title", "eyebrow", "accent", "lede", "breadcrumb", "meta_title", "meta_description", "meta_image"],
    "bande-sujets": ["title"],
    "conditions": ["title", "eyebrow", "lede", "arguments", "arguments.title", "arguments.body", "arguments.anchor", "breadcrumb", "meta_image", "revised"],
    "confidentialite": ["title", "eyebrow", "lede", "arguments", "arguments.title", "arguments.body", "arguments.anchor", "breadcrumb", "meta_image", "revised"],
    "contact": ["title", "eyebrow", "accent", "lede", "breadcrumb", "meta_title", "meta_description", "meta_image"],
    "contact-direct": ["title", "lede", "cta", "cta_link"],
    "contact-formulaire": ["title", "cta", "note"],
    "contact-suite": ["title", "arguments", "arguments.body"],
    "dernieres-notes": ["title", "accent", "lede", "cta", "cta_link"],
    "en-tete": ["title", "eyebrow"],
    "hero": ["title", "eyebrow", "accent", "lede", "image", "arguments", "arguments.title", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "meta_title", "meta_description", "meta_image"],
    "introuvable": ["title", "eyebrow", "accent", "lede", "arguments", "arguments.title", "arguments.link", "cta", "cta_link", "cta_secondary", "cta_secondary_link", "meta_title", "meta_description"],
    "lettre": ["title", "accent", "lede", "image", "cta", "note"],
    "lettre-flux": ["title", "lede", "cta", "cta_link"],
    "mentions-legales": ["title", "eyebrow", "lede", "arguments", "arguments.title", "arguments.body", "arguments.anchor", "breadcrumb", "meta_image", "revised"],
    "pied-de-page": ["lede", "body", "cta_secondary", "note"],
    "recherche": ["title", "eyebrow", "accent", "lede", "breadcrumb", "meta_title", "meta_description", "meta_image"],
    "rubriques": ["title", "eyebrow", "accent", "lede", "breadcrumb", "meta_title", "meta_description", "meta_image"],
    "signatures": ["title", "accent", "lede", "cta", "cta_link"],
    "sommaire-legal": ["title", "cta", "note"],
    "studio": ["title", "eyebrow", "accent", "lede", "video", "video_poster", "cta", "cta_link", "cta_secondary", "cta_secondary_link"],
    "sujet": ["eyebrow", "body"],
    "sujets": ["title", "accent", "lede", "cta", "cta_link"],
  },
};
