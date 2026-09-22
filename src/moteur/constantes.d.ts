// src/moteur/constantes.d.ts - les constantes que moteur.config.mjs fige au build (define de Vite), declarees pour le controle de types.
//
// Elles n'existent que moteur allume : seuls src/moteur/version.ts,
// src/moteur/langue-bo.ts et les extensions du back office les lisent, et
// aucun d'eux n'entre dans un build statique.

/** La version du package.json, au moment du build. */
declare const __ALOHA_VERSION__: string;

/** L'horodatage ISO du build. Il change a chaque build : c'est la preuve d'un redeploiement. */
declare const __ALOHA_CONSTRUIT__: string;

/** Les caches reellement configures : le bouton "Tout deployer" ne vide que ceux-la, et dit lesquels. */
declare const __ALOHA_CACHES__: { objets: "kv" | "memoire" | null; routes: string | null };

/** ALOHA_BO_LANGUE : la langue par defaut du back office ("fr"), ou null quand le navigateur decide seul. */
declare const __ALOHA_BO_LANGUE__: string | null;

/** ALOHA_BO_FUSEAU : le fuseau des heures affichees dans le back office (Europe/Paris par defaut). */
declare const __ALOHA_BO_FUSEAU__: string;
