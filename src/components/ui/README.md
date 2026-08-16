# Primitives UI - le contrat

Chaque primitive vit dans son dossier : `ui/<nom>/<Nom>.astro` + `index.ts` qui
ré-exporte le composant **et** sa config `tv()`. Les composés (Dialog, Table)
ont un fichier par partie et un seul `index.ts`.

Règles, toutes obligatoires :

1. **Tokens sémantiques uniquement.** Le markup écrit `bg-primary`,
   `text-muted-foreground`, `border-border`, `bg-card`, `bg-surface`. Jamais
   une couleur brute, jamais `ink-*` ou `coral-*` (ces noms n'existent que
   dans `tokens.css`).
2. **Variants en `tailwind-variants`.** La config `tv()` est exportée, pour
   qu'un autre composant la réutilise au lieu de la recopier (un lien de
   pagination réutilise `button`, il n'invente pas ses classes).
3. **Zéro JS d'abord.** La plateforme d'abord : `<dialog>` natif,
   `<details>` natif, ancres, `:focus-within`. Un `<script>` court et partagé
   seulement quand la plateforme ne suffit pas. React n'entre jamais ici
   (les îlots vivent dans `src/components/islands`).
4. **`data-slot="<nom>"`** sur l'élément racine de chaque partie, pour le
   ciblage CSS et les tests.
5. **Accessibilité non négociable.** Rôles et `aria-*` corrects, ordre de
   tabulation naturel, cibles tactiles de 44px minimum sur mobile. Le
   `:focus-visible` global s'occupe de l'anneau de focus.
6. **Boutons = pilules.** `rounded-pill`, toujours. Pas d'exception.
7. **En-tête de fichier** : une ligne de commentaire, chemin + rôle.
8. **Jamais de tiret cadratin** dans le code, les commentaires ou la copie.
   Des traits d'union simples.
9. **Aucun fichier au-dessus de 400 lignes.**

Utilitaires generés par les tokens, disponibles partout :
`font-display`, `font-script` (alias de `font-display`),
`text-display-sm|md|lg|xl`,
`rounded-card|panel|pill`, `shadow-float|lift|glass`,
`animate-rise|marquee|pulse-slow`, et les classes maison de `global.css` :
`.prose` (la colonne de lecture, avec `.prose-wide` et `.prose-dropcap`),
`.accent-script`, `.glass`, `.glass-light`, `.container-page`,
`.measure-prose`, `.measure-wide`.

`Button` est l'exemple canonique : lis-le avant d'écrire ta première primitive.
