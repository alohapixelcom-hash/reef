// src/moteur/medias/identite.mjs - l'identite de l'extension "Medias" et ses adresses, ecrites une fois.
//
// Lu par la configuration du moteur (Node, d'ou le .mjs), par extension.ts
// dans le Worker, par l'aiguillage en tete du Worker et par le self-check.

export const IDENTITE = { id: "aloha-medias", version: "1.0.0" };

/** La carte du tableau de bord : pas d'entree au rail, la Mediatheque native reste le seul ecran des medias. */
export const CARTE_PHOTOS = "photos";

/** L'envoi en un temps (formulaire multipart) : la seule route d'EmDash 0.38 ou passent les octets d'une photo neuve qu'on peut reecrire. */
export const ROUTE_D_ENVOI = "/_emdash/api/media";

/** La demande d'adresse d'envoi (envoi en deux temps) : l'aiguillage la decline pour les photos, l'admin retombe alors sur ROUTE_D_ENVOI. */
export const ROUTE_D_ADRESSE = "/_emdash/api/media/upload-url";

/** Qui est connecte : EmDash le dit, l'aiguillage le demande avant de depenser une transformation. */
export const ROUTE_DE_L_UTILISATEUR = "/_emdash/api/auth/me";

/** Ou dort l'original d'une photo deja en base, une fois optimisee : EmDash refuse de servir backups/ (route media/file). */
export const PREFIXE_DES_ORIGINAUX = "backups/aloha-medias/";
