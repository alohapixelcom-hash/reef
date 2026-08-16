/**
 * capacitor.config.ts - la coquille native.
 *
 * Deux valeurs a changer avant de publier : appId et appName. Le reste est
 * regle pour qu'une application construite depuis ce theme se comporte comme
 * une application, et non comme un site dans un cadre.
 *
 *   pnpm app          construit dist/ pour une coquille native
 *   npx cap add ios   une seule fois
 *   npx cap sync      apres chaque pnpm app
 *   npx cap open ios  ouvre Xcode
 *
 * Voir wiki/subsystems/mobile-app.md pour la liste complete avant soumission.
 */

/**
 * Le type est declare ici plutot qu'importe de "@capacitor/cli".
 *
 * Pourquoi : le theme annonce huit dependances et les tient. Importer le type
 * obligerait tout acheteur a installer Capacitor pour que `pnpm check` passe,
 * meme s'il ne fait jamais d'application. Ce serait une dependance imposee pour
 * une ligne de typage.
 *
 * Des que vous installez Capacitor, remplacez tout ce bloc par :
 *   import type { CapacitorConfig } from "@capacitor/cli";
 * Les champs ci-dessous sont un sous-ensemble strict du type officiel : le
 * remplacement ne casse rien.
 */
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  ios?: {
    scrollEnabled?: boolean;
    backgroundColor?: string;
    contentInset?: "automatic" | "scrollableAxes" | "never" | "always";
  };
  android?: { backgroundColor?: string; allowMixedContent?: boolean };
  server?: { url?: string; cleartext?: boolean; androidScheme?: string };
  plugins?: Record<string, Record<string, unknown>>;
};

const config: CapacitorConfig = {
  // Identifiant inverse de votre domaine. A CHANGER.
  appId: "app.alohapixel.aloha",
  // Le nom affiche sous l'icone. A CHANGER.
  appName: "Aloha",

  // Le build Astro, prepare par `pnpm app`.
  webDir: "dist",

  ios: {
    // Le rebond du WebView donne l'impression que la page se decolle du haut
    // de l'ecran. Il n'a de sens que sur du contenu reellement defilant, et le
    // theme gere deja son propre defilement.
    scrollEnabled: true,
    // Le fond visible pendant le rebond doit etre celui du theme, jamais blanc.
    backgroundColor: "#021c24",
    // Le clavier ne doit pas redimensionner la vue : cela casse les hauteurs
    // en svh et fait sauter les elements en position fixe.
    contentInset: "always",
  },

  android: {
    backgroundColor: "#021c24",
    // Autoriser le contenu mixte serait la porte ouverte a du contenu non
    // chiffre dans une application signee.
    allowMixedContent: false,
  },

  server: {
    // En developpement, pointer sur le serveur Astro permet le rechargement a
    // chaud dans la coquille. A COMMENTER avant toute publication : une
    // application qui charge une URL distante est refusee par Apple.
    // url: "http://192.168.1.10:4321",
    // cleartext: true,
    androidScheme: "https",
  },

  plugins: {
    // L'ecran de lancement doit disparaitre des que la page est prete, pas
    // apres un delai fixe : un delai fixe se voit toujours, en trop court ou
    // en trop long.
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: "#021c24",
      showSpinner: false,
    },
  },
};

export default config;
