// src/worker.frontal.ts - le Worker frontal de Reef : plans, barre finale et langue du visiteur, pages figees, puis le cache des pages devant le Worker du moteur (module frontal du socle).
//
// Fichier du SITE : le socle ne le reecrit jamais. Le moteur de cache vient du
// socle (src/frontal/cache.ts) ; ce fichier ne fait que lui passer les regles
// d'adresses de Reef, les memes fonctions et dans le meme ordre que
// src/worker.moteur.ts, pour qu'une redirection parte d'ici sans reveiller
// EmDash. Le back office, l'API, la page introuvable et toute session passent
// au moteur (voir frontal/LISEZMOI.md du socle).
import { ADRESSES_DU_SEO } from "./moteur/seo/identite.mjs";
import { creerFrontal } from "./frontal/cache.ts";
import { barreFinale, planDuSite } from "./worker-adresses.ts";
import { redirectionDeLangue } from "./worker-langue.ts";

const PLANS = ["/sitemap-index.xml", "/sitemap-moteur.xml"];

export default creerFrontal({
  // Les adresses du SEO (plans, robots.txt, llms.txt) passent au moteur : il
  // les sert depuis la base et repond 301 pour les anciens plans (extension
  // seo du socle). Sans ce relais, le frontal servirait les fichiers du build.
  versLeMoteur: ADRESSES_DU_SEO,
  avantLeCache(request) {
    const chemin = new URL(request.url).pathname;
    if (chemin.startsWith("/_")) return null;
    return planDuSite(request, PLANS) ?? barreFinale(request) ?? redirectionDeLangue(request);
  },
});
