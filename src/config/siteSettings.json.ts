// src/config/siteSettings.json.ts - interrupteurs globaux du theme : view transitions et animations d'entree.
import type { SiteSettingsProps } from "./types/configDataTypes";

// Deux booleens, lus par BaseHead (ClientRouter) et par les composants animes.
// satisfies garde l'objet litteral : l'autocompletion reste exacte cote pages.
const siteSettings = {
  useViewTransitions: true,
  useAnimations: true,
} satisfies SiteSettingsProps;

export default siteSettings;
