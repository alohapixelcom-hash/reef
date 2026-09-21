// src/moteur/constantes.d.ts - les constantes que moteur.config.mjs fige au build (define de Vite), declarees pour le controle de types.
//
// Elles n'existent que moteur allume : seuls src/moteur/version.ts et
// src/moteur/deployer/ les lisent, et aucun des deux n'entre dans un build
// statique.

/** La version du package.json, au moment du build. */
declare const __ALOHA_VERSION__: string;

/** L'horodatage ISO du build. Il change a chaque build : c'est la preuve d'un redeploiement. */
declare const __ALOHA_CONSTRUIT__: string;

/** Les caches reellement configures : le bouton "Tout deployer" ne vide que ceux-la, et dit lesquels. */
declare const __ALOHA_CACHES__: { objets: "kv" | "memoire" | null; routes: string | null };
