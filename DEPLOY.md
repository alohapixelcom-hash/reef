<!-- DEPLOY.md - comment la demo en ligne est publiee. Ne concerne pas le theme lui-meme. -->

# Déploiement de la démo

`reef.alohapixel.app` est le Worker Cloudflare **reef-demo**. Depuis le
19 août 2026 il est publié automatiquement par **Workers Builds** à chaque
push sur `main`. Il n'y a plus rien à lancer depuis un Mac.

| Réglage | Valeur |
|---|---|
| Dépôt | `alohapixelcom-hash/reef` |
| Branche de production | `main` |
| Commande de build | `pnpm run build` |
| Commande de déploiement | `npx wrangler deploy` |

## Trois choses à ne pas casser

**`packageManager: pnpm@11.22.0` dans package.json.** La CI Cloudflare part
sinon sur pnpm 10, qui ne lit pas la clé `allowBuilds` de
`pnpm-workspace.yaml` : esbuild et sharp resteraient sans binaire natif, et
le build échouerait sans dire pourquoi. Vérifié le 19 août sur aloha, où
l'erreur exacte était `ERROR packages field missing or empty`.

**`run_worker_first = true` dans wrangler.toml.** Sans lui, Cloudflare sert
`index.html` directement pour `/` et la redirection de langue ne s'exécute
jamais. C'est aussi pour cela que le worker teste lui-même l'extension du
chemin : il voit toutes les requêtes et doit laisser passer les feuilles de
style.

**`wrangler.toml` et `src/worker.ts` appartiennent à la démo.** Ils publient
`reef.alohapixel.app` et rien d'autre. Le thème, lui, compile en HTML
statique et se déploie sur n'importe quel hébergeur sans eux.

## Les images

Les photographies de `src/assets/` viennent de Pexels et sont sous licence
Pexels. Elles ne sont pas versionnées : `scripts/covers.mjs` les rapatrie
avant chaque build, et l'archive du thème les contient déjà. La licence
Pexels en autorise la redistribution, donc rien n'est retiré à personne.
`LICENSE` section 2 et `PHOTOS.md` disent lesquelles, et d'où. Les garder ou
les remplacer par les siennes revient au même du point de vue de la licence.
