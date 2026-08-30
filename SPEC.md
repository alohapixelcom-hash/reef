# Reef - cahier des charges

> Reef est le thème blog de la famille Aloha Pixel, un thème Astro gratuit,
> bilingue anglais et français. Ce document dit ce que le thème contient,
> comment il est construit, et les règles qui le tiennent.

## 0. Ce dépôt

Reef expose une écriture : une publication, ses billets, les auteurs qui les
signent et les sujets qui les regroupent. Trois collections de contenu typées
(billets, auteurs, sujets), billets en Markdown ou MDX, flux RSS par langue, et
dix photographies Pexels (un héros, neuf couvertures) livrées avec la
démonstration. La publication de démonstration s'appelle Reef Notes et elle est
fictive : l'utilisateur remplace Reef Notes et garde Reef.

La direction artistique est froide et faite pour la lecture : neutre encre
bleu nuit, turquoise reef en action, corail en second accent rationné, Space
Grotesk en affichage et Instrument Sans en corps ; le mot d'accent garde la
police du titre, passe au turquoise de la maison et porte une vague turquoise
(la marque Aloha Pixel est une vague). Le thème est clair par défaut, avec un
mode sombre composé plutôt qu'inversé ; l'anglais tient la racine, le français
vit sous /fr/.

## 1. Ce que le dépôt contient, mesuré

Chiffres recomptés depuis la source (`pnpm build` vert, `astro check` à 0/0/0).

| Élément | Quantité |
|---|---|
| Pages rendues par `pnpm build` | 55 |
| Collections de contenu | 3 (billets, auteurs, sujets), validées par zod |
| Contenu de démonstration | 9 billets, 3 auteurs, 5 sujets, dans 2 langues |
| Primitives UI (`src/components/ui`) | 36 familles, 63 fichiers `.astro` |
| Composants Section | 24 |
| Icônes dessinées à la main | 60 |
| Utilitaires `animate-*` | 55 au catalogue, plus 3 animations de marque |
| Langues | 2 (anglais à la racine, français sous /fr/) |
| Pages de wiki | 11 |
| Fichiers de conventions (`docs/conventions/`) | 5 |
| Dépendances d'exécution | 9, chacune tracée dans THIRD-PARTY.md |

## 2. Les sous-systèmes

- **Tokens Tailwind v4 CSS-first** : palette brute (ink le neutre, reef le
  turquoise d'action, coral le second accent), puis alias sémantiques
  `--reef-*`, puis utilitaires. Le markup n'écrit qu'un rôle (`bg-primary`), jamais une couleur.
  Le mode sombre ne fait que réaffecter l'étage 2, et `.on-dark` repeint un
  sous-arbre sombre dans une page claire.
- **Primitives zéro-JS d'abord** : `Dialog` est un `<dialog>` natif, `Accordion`
  un groupe `<details>` ; Escape, backdrop et exclusivité viennent du
  navigateur. Variants en `tailwind-variants`. 10 des 63 fichiers portent un
  `<script>`.
- **Collections de contenu** : billets (Markdown/MDX), auteurs et sujets (JSON),
  glob-chargés et validés par zod, classés par langue. Les billets brouillons se
  construisent pour l'aperçu mais restent hors des listes, du RSS et de llms.txt.
- **Couche SEO possédée** : `BaseHead` écrit meta, canonical et OG à la main,
  constructeurs JSON-LD maison (Organization, WebSite, Article, BreadcrumbList),
  `robots.txt`, `llms.txt` et un flux RSS par langue, sitemap. Zéro paquet SEO.
- **Catalogue de motion** : portage sans dépendance, 55 utilitaires `animate-*`,
  garde-fou `prefers-reduced-motion` à trois étages.
- **Config typée** : données de site en `satisfies` et `as const`, types dérivés.
- **Self-checks** : `schema.selfcheck.ts` et `pagination.selfcheck.ts`, sans
  framework de test.
- **Formulaire de contact** : écrit dans `contact.astro` mais livré sans
  `action`, pour ne pas imposer d'hébergeur ni de prestataire à l'utilisateur.

## 3. La base de connaissance et la revue

**`wiki/`** : une base de connaissance markdown maintenue avec le code. Chaque
page porte un frontmatter et cite du `chemin:ligne` réel, pour que la dérive
soit détectable.

**La revue** : la liste de contrôle en fin de `docs/design.md`, quinze points
à passer avant toute publication, avec une preuve `chemin:ligne` par constat.

## 4. Règles non négociables

- **Pas de tiret cadratin ni demi-cadratin nulle part.** Dans le code, les
  commentaires, la copie, la doc. Des traits d'union simples.
- **Le markup n'écrit que des rôles sémantiques**, jamais un nom de palette ni
  un hex.
- **Zéro JavaScript par défaut** ; le filtre, le tri et le sommaire de lecture ne
  cachent ou ne réordonnent que du markup déjà rendu par le serveur.
- **Ni React, ni WebGL, ni bibliothèque d'animation.**
- **Bilingue par construction** : une source par route, une sortie par langue ;
  une clé de dictionnaire manquante est une erreur de build. Un billet existe
  deux fois, sous le même slug.
- **Accessibilité comprise dans le fini** : cibles tactiles de 44px, aria juste,
  focus visible, mouvement réduit respecté.
- **Aucun fichier ne dépasse 400 lignes** ; chaque dépendance tierce est tracée
  dans `THIRD-PARTY.md` avant d'entrer.
