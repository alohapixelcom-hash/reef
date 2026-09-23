// src/moteur/catalogue-emdash.d.ts - le type du catalogue de messages d'EmDash, atteint par l'alias "@moteur/catalogue-emdash".
//
// PIECE DU SOCLE (voir en tete de catalogue-bo.ts).
//
// POURQUOI UN ALIAS ET PAS L'IMPORT DIRECT. @emdash-cms/admin est une
// dependance d'emdash, pas du site : avec l'arborescence stricte de pnpm,
// src/ ne peut pas ecrire `import ... from "@emdash-cms/admin/locales"`.
// catalogue-bo.config.mjs resout le chemin reel depuis emdash lui-meme et le
// pose sous ce nom. Ce fichier n'en decrit que ce que catalogue-bo.ts utilise.

/** Les messages compiles par Lingui : un identifiant court vers sa forme compilee. */
export type MessagesCompiles = Record<string, unknown>;

/** La langue de l'administration pour cette requete : cookie `emdash-locale`, puis Accept-Language, puis l'anglais. */
export declare function resolveLocale(request: Request): string;

/** Le sens d'ecriture d'une langue ("ltr" par defaut, "rtl" pour l'arabe et le persan). */
export declare function getLocaleDir(code: string): "ltr" | "rtl";

/** Le libelle d'une langue dans sa propre langue ("Français"). */
export declare function getLocaleLabel(code: string): string;

/** Le catalogue compile d'une langue. Une langue inconnue retombe sur l'anglais. */
export declare function loadMessages(locale: string): Promise<MessagesCompiles>;

/** La langue source du moteur : l'anglais. */
export declare const DEFAULT_LOCALE: string;

/** Les langues que l'administration propose dans ses reglages. */
export declare const SUPPORTED_LOCALES: readonly { code: string; label: string; dir?: "ltr" | "rtl" }[];

/** Les codes de ces memes langues. */
export declare const SUPPORTED_LOCALE_CODES: ReadonlySet<string>;
