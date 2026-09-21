# Le moteur de publication

Reef se construit de deux façons, et c'est une variable qui choisit.

| | Moteur éteint (défaut) | Moteur allumé (`ALOHA_MOTEUR=emdash`) |
|---|---|---|
| Les billets vivent | dans `src/data/posts/*.md` | en base (Cloudflare D1), médias dans R2 |
| Publier | commit, puis build | un clic dans le back office, visible sans build |
| Le site | 100 % statique, aucun hébergeur imposé | Worker Cloudflare : pages gérées rendues à la demande, le reste figé |
| Le back office | aucun | EmDash, à `/_emdash/admin` |

Moteur éteint, le build est identique à celui d'un Reef sans moteur : les 63 fichiers HTML, XML et TXT ont été comparés un par un (21 septembre 2026).

Le moteur est [EmDash](https://github.com/emdash-cms/emdash) (licence MIT), un CMS fait pour Astro et Cloudflare. Reef ne le réécrit pas : il s'y branche.

## Allumer le moteur en local

```bash
pnpm dev:moteur                                          # http://localhost:4321, back office à /_emdash/admin
node scripts/moteur-import.mjs --url http://localhost:4321   # verse les billets Markdown en base, une fois
```

Au premier démarrage, EmDash crée ses tables et applique `seed/seed.json`, qui décrit le SCHÉMA de Reef (la collection `posts` et ses champs). Le contenu, lui, passe par l'API : l'import fait subir à chaque billet la même validation qu'un billet saisi à la main. Il est rejouable : un billet déjà présent (même slug, même langue) est sauté.

En local, `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` ouvre une session d'administrateur sans clé d'accès. Cette porte n'existe qu'en développement.

## Comment c'est branché

Cinq pièces, et aucune page ne sait d'où vient un billet.

1. **`moteur.config.mjs`** pose l'adapter Cloudflare, React (l'interface du back office), EmDash et son extension « Tout déployer », uniquement quand la variable est là. Il porte aussi LA liste des pages gérées (`PAGES_GEREES`) : celles-là se rendent à la demande, toutes les autres restent figées au build.
2. **L'alias `@moteur/source`** pointe vers `src/moteur/source.fichiers.ts` ou `src/moteur/source.emdash.ts`. Les deux exportent les mêmes fonctions (`billetsPublies`, `billetParSlug`, `corpsDuBillet`) et rendent la même forme : une entrée de collection `posts`. Aucun composant n'a été réécrit pour le moteur.
3. **`src/js/posts.ts`** reste le seul endroit qui liste des billets. Il lit la source par l'alias ; le tri, les références et le temps de lecture valent pour les deux.
4. **`src/moteur/chemins.ts`** : une page rendue à la demande ne reçoit pas de props. `propsDeLaPage(Astro, getStaticPaths)` rejoue le `getStaticPaths` de la page et y cherche l'adresse demandée. Ce qui existe au build existe à la demande, au même endroit ; une adresse que le build n'aurait pas produite répond 404.
5. **`src/moteur/TexteRiche.*.astro`** rend le corps d'un billet de la base (Portable Text) dans la colonne de lecture, avec les mêmes ancres d'intertitre (`github-slugger`, comme Astro) et la même coloration du code (Shiki, deux thèmes).

### Ajouter une page gérée

1. L'inscrire dans `PAGES_GEREES` (`moteur.config.mjs`).
2. Dans la page : `const props = await propsDeLaPage<Props>(Astro, getStaticPaths); if (!props) return introuvable();`.
3. Lire les billets par `@js/posts`, jamais par `getCollection("posts")`.

Une page oubliée resterait figée sur le contenu du dernier build : c'est exactement le défaut que le moteur corrige.

### Deux pièges déjà payés

- **`/blog/2/` arrive sur la route d'article.** À la demande, un paramètre nommé (`[id]`) passe avant un paramètre de reste (`[...page]`). `blog/[id].astro` reconnaît un numéro et rend l'archive ; le rendu vit dans `src/components/Pages/`.
- **`trailingSlash: "always"` casse l'API du moteur.** Ses routes s'appellent sans barre finale. Moteur allumé, le réglage passe à `"ignore"`.

## Déployer

`wrangler.moteur.jsonc` décrit le Worker : base `DB`, médias `MEDIA`, et un cron à la minute pour les publications programmées. Au premier `wrangler deploy`, Wrangler crée la base et le compartiment s'ils n'existent pas.

```bash
pnpm build:moteur
pnpm wrangler deploy --config wrangler.moteur.jsonc
```

## Tout déployer

Publier se voit sans rien faire : les pages gérées lisent la base à chaque requête. Le bouton **Tout déployer** (menu du back office, section des modules d'extension) sert à la fin d'une séance de modifications, et il ne dit que ce qu'il a fait. Il est ouvert à qui a le droit de tout publier (rôle Éditeur et au-dessus).

Un clic fait trois choses, dans l'ordre :

1. **La garde.** Un déclenchement de build par minute au plus. Un clic refusé ne fait rien, caches compris, et le dit.
2. **Les caches du contenu.** Le cache d'objets se vide avec les fonctions d'invalidation d'EmDash, sur tous ses espaces ; le cache de routes (Workers Cache) par `cache.purge({ purgeEverything: true })`. Ce qui n'est pas configuré n'est pas vidé : sans cache, la page répond « Aucun cache configuré, rien à vider ».
3. **Le build des pages figées.** Un `POST` sur le Deploy Hook de Cloudflare Workers Builds, dont l'adresse vit dans la variable secrète `ALOHA_DEPLOY_HOOK`. Elle n'est écrite ni dans le dépôt, ni dans le journal, ni dans un message.

```bash
pnpm wrangler secret put ALOHA_DEPLOY_HOOK --config wrangler.moteur.jsonc   # en ligne
echo 'ALOHA_DEPLOY_HOOK=https://...' > .dev.vars                            # en local, fichier ignoré par git
```

Le Deploy Hook se crée dans Cloudflare, réglages du Worker, Builds. Variable absente : les caches sont traités, la page dit que le build n'a PAS été relancé et rappelle la commande. Seule une adresse `https` est acceptée ; `astro dev` accepte en plus `http://localhost` et `http://127.0.0.1`, pour essayer le bouton contre un faux hook.

### La preuve

`/version.json` (rendu à la demande, jamais mis en cache) donne la version du `package.json` et l'horodatage du build, figé au build :

```json
{ "version": "2.3.0", "construit": "2026-09-21T18:09:52.762Z", "moteur": "emdash" }
```

Tant que l'ancien Worker répond, l'horodatage ne bouge pas ; dès que le nouveau est en ligne, il change. La page compare cet horodatage au dernier déclenchement réussi et affiche « Redéploiement prouvé » ou « Build demandé, pas encore en ligne ». Elle montre aussi l'heure du dernier déclenchement, le code HTTP rendu par le hook, et les cinq derniers clics (qui, quand, caches, build, code). Le journal garde cinquante clics, dans le stockage de l'extension, donc dans la base du site.

### Les caches

Aucun par défaut. `ALOHA_CACHE_OBJETS=kv` garde les lectures de la base dans Cloudflare KV (liant `CACHE` à déclarer dans `wrangler.moteur.jsonc`) ; `ALOHA_CACHE_OBJETS=memoire` les garde dans la mémoire du processus, pour les essais locaux. Un cache de routes posé dans la configuration d'Astro (`cache.provider`) est détecté tout seul. Attention avant d'en poser un : Workers Cache garde deux heures une réponse sans `Cache-Control`, ce qui casserait « publier se voit tout de suite » tant que les pages gérées ne déclarent pas leur durée.

### Où c'est rangé

`src/moteur/deployer/` est une extension EmDash **native** (elle agit avec l'autorité du site : une extension « sandbox » ne peut ni vider un cache de l'hôte ni lire un secret du Worker), enregistrée par `moteur.config.mjs`, moteur allumé seulement. La page est décrite en Block Kit, sans React : le back office la rend avec ses propres composants, elle hérite donc de `back-office.css`. `regles.ts` porte la logique pure (garde, adresse du hook, heure de Paris), vérifiée par `pnpm test`.

Essayé le 21 septembre 2026, en local : le `POST` arrive une fois au faux hook et le second clic dans la minute est refusé ; hook éteint ou en erreur 500, la page l'écrit dans un bandeau d'erreur ; avec `ALOHA_CACHE_OBJETS=memoire`, un titre modifié directement en base reste l'ancien sur le site jusqu'au clic, puis passe au nouveau. **Non prouvé en local** : la purge réelle de Workers Cache (`cache.purge` n'existe pas dans le workerd local, la page répond alors « NON vidé ») et l'appel d'un vrai Deploy Hook, qui demandent un déploiement.

## Ce qui a été mesuré

Build de production servi par workerd en local, trois passes, 21 septembre 2026 :

| Geste | Visible sur le site après |
|---|---|
| Publier | 55 à 93 ms (billet, liste et flux RSS) |
| Corriger un titre et republier | 47 à 57 ms |
| Dépublier | 44 à 54 ms (la page repasse en 404) |

Un brouillon répond 404 tant qu'il n'est pas publié. Ces chiffres sont locaux : en ligne s'ajoutent le réseau et le cache de Cloudflare, à mesurer après le premier déploiement.
