// src/js/haptics.ts - le retour tactile, quand il apporte quelque chose et seulement la.
//
// Trois regles, dans cet ordre :
//
//   Causalite : la vibration part sur l'evenement qui l'a causee, pas a la fin
//   d'une animation. Un retour qui arrive apres coup n'est plus un retour,
//   c'est une notification.
//
//   Harmonie : elle part sur la MEME image que le changement visuel. Quelques
//   dizaines de millisecondes d'ecart suffisent a defaire l'illusion que les
//   deux sont la meme chose.
//
//   Utilite : uniquement sur les moments qui comptent (validation, erreur,
//   accrochage). Une interface qui vibre a chaque survol apprend a son
//   utilisateur a ne plus rien sentir.
//
// Sur le web, l'API Vibration existe sur Android et pas sur iOS Safari. Dans
// une coquille Capacitor, le module @capacitor/haptics prend le relais et rend
// le retour identique sur les deux plateformes : s'il est present, on l'utilise.
// Sinon on retombe sur Vibration, et sinon on ne fait rien. Une interface ne
// doit jamais dependre d'un canal que la moitie des appareils n'ont pas.

export type HapticKind = "select" | "commit" | "warn" | "error";

// Motifs volontairement tres courts. Un retour tactile perceptible dure entre
// 8 et 15 ms ; au-dela, ca ne se sent plus comme une texture mais comme une
// alarme de telephone pose sur une table.
const PATTERNS: Record<HapticKind, number | number[]> = {
  // Accrochage, bascule, arrivee sur un cran : le plus discret des quatre.
  select: 8,
  // Action validee : une seule impulsion, un peu plus franche.
  commit: 14,
  // Attention : deux impulsions courtes, le rythme porte le sens.
  warn: [10, 40, 10],
  // Echec : trois impulsions, lues comme un refus.
  error: [12, 40, 12, 40, 12],
};

interface CapacitorHaptics {
  impact?: (options: { style: string }) => Promise<void>;
  notification?: (options: { type: string }) => Promise<void>;
}

function capacitorHaptics(): CapacitorHaptics | null {
  const global = window as unknown as {
    Capacitor?: { Plugins?: { Haptics?: CapacitorHaptics }; isNativePlatform?: () => boolean };
  };
  if (!global.Capacitor?.isNativePlatform?.()) return null;
  return global.Capacitor.Plugins?.Haptics ?? null;
}

/**
 * Emet un retour tactile. Ne leve jamais et ne bloque jamais : un canal de
 * confort ne doit pas pouvoir faire echouer l'action qu'il accompagne.
 */
export function haptic(kind: HapticKind = "select"): void {
  try {
    // Le mouvement reduit couvre aussi le tactile : quelqu'un qui demande le
    // calme ne demande pas seulement le calme visuel.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const native = capacitorHaptics();
    if (native) {
      if (kind === "warn" || kind === "error") {
        void native.notification?.({ type: kind === "error" ? "ERROR" : "WARNING" });
      } else {
        void native.impact?.({ style: kind === "commit" ? "MEDIUM" : "LIGHT" });
      }
      return;
    }

    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    // Un navigateur peut refuser la vibration (politique de permission, mode
    // economie). Ce n'est pas une erreur applicative.
  }
}
