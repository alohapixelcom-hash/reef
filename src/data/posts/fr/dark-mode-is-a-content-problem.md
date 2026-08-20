---
title: "Le mode sombre est un problème de contenu"
description: "Inverser une palette prend un après-midi. Le difficile, c'est tout ce que la palette ne contrôle pas : les photos, les captures d'écran, les graphiques, les vidéos intégrées, et cette couleur de marque qui ne veut plus rien dire une fois le fond passé au noir."
pubDate: 2026-02-17
author: fr/tomas-abaroa
topic: fr/design
tags: ["design", "mode sombre", "css"]
cover: ../../../assets/covers/reef-mode-sombre.webp
coverAlt: "Ouverture d'une grotte marine sur un lagon turquoise, la lumière du jour entrant par le fond"
featured: false
draft: false
---

Tous les devis de mode sombre que j'ai écrits se sont trompés dans le même sens. Les couleurs prennent un après-midi. Le mois part dans ce qui n'est pas de la couleur : un logo client avec un fond blanc incrusté, une bibliothèque de graphiques qui code en dur `#333`, une photo de produit sur fond blanc infini qui perce désormais un trou dans la page, et un corail de marque qui paraissait sûr de lui sur le papier et devient radioactif à neuf heures du soir.

Le mode sombre n'est pas un thème. C'est une seconde édition du contenu.

## La palette est vraiment la partie facile

Deux fonctionnalités CSS ont supprimé l'essentiel de la plomberie.

D'abord, dites au navigateur ce que vous savez faire, pour que les contrôles de formulaire, les barres de défilement, les soulignements du correcteur et le fond par défaut cessent de vous contredire :

```css
:root {
  color-scheme: light dark;
}
```

Ensuite, laissez une seule déclaration porter les deux valeurs :

```css
:root {
  --surface: light-dark(oklch(99% 0.005 250), oklch(21% 0.02 250));
  --text: light-dark(oklch(28% 0.02 250), oklch(92% 0.01 250));
  --border: light-dark(oklch(90% 0.01 250), oklch(32% 0.02 250));
}
```

`light-dark()` choisit une valeur selon le schéma de couleurs utilisé, et ne fonctionne que si `color-scheme` est renseigné, ce qui est une jolie idée de conception d'API : la fonction refuse de marcher tant que vous n'avez pas écrit la déclaration qui répare de toute façon les widgets natifs.

Si l'on écrit ces valeurs en OKLCH plutôt qu'en hexadécimal, c'est parce que le premier nombre y est la clarté perçue. Inverser une palette hexadécimale en retournant les chiffres produit des couleurs mathématiquement opposées et visuellement fausses, parce que le sRGB n'a aucune idée de la luminosité qu'un humain croit voir. En OKLCH, on peut dire « même teinte, même chroma, clarté 21 au lieu de 99 » et obtenir un résultat qui se lit comme la même couleur dans une autre pièce.

Une correction qui surprend : en mode sombre, du blanc pur sur du noir pur est pire, pas mieux. Ça vibre, ça bave pour les lecteurs astigmates, et ça fatigue sur un article long. Nos valeurs par défaut tournent autour de 92 % de clarté sur 21 %, ce qui donne un fort contraste sans l'éblouissement.

## Ce que la palette ne contrôle pas

Voici la liste qui consomme réellement le budget.

- **Les photos sur fond blanc.** Un packshot sur fond blanc infini devient un rectangle de plein jour au milieu d'une page sombre. Soit vous obtenez des détourages avec transparence, soit vous acceptez un petit compromis : `filter: brightness(0.92) contrast(1.02)` casse l'agressivité sans changer visiblement le produit.
- **Les captures d'écran.** La capture d'une interface claire ne se rattrape pas au filtre, et l'inverser est un mensonge. Soit on photographie l'interface deux fois, soit on la pose sur une carte volontairement claire dans les deux modes, cadrée pour qu'elle se lise comme une citation.
- **Les graphiques et les schémas.** Tout ce qui a des couleurs de trait codées en dur réclame une vraie variante sombre. Le SVG est le seul format raisonnable ici, parce qu'il peut hériter de `currentColor` et cesser complètement d'être un problème d'image.
- **Les blocs de code.** Deux thèmes, commutés avec le reste de la page. Un bloc clair sur un article sombre est la première chose qu'un développeur remarque et la dernière qu'il pardonne.
- **Les intégrations tierces.** Lecteurs vidéo, cartes, modules de commentaires et bandeaux de consentement ont chacun leur avis. Certains acceptent un paramètre. D'autres non. Prévoyez du budget pour ceux qui refusent.
- **La couleur de marque.** Celle-là mérite sa propre section.

## La couleur de marque aura besoin d'une jumelle

Une valeur d'accentuation unique ne peut pas servir les deux modes. Voici le corail de nos propres tokens, mesuré sur les deux fonds :

| Couleur | Sur fond clair | Sur fond sombre |
| --- | --- | --- |
| Corail 55 | 4,7:1, passe pour du texte courant | 2,1:1, échoue partout |
| Corail 72 | 2,3:1, échoue | 6,4:1, passe confortablement |

Aucune valeur unique de cette colonne ne fonctionne deux fois. La solution honnête, ce sont deux tokens sous un seul nom sémantique : `--accent` vaut Corail 55 en clair et Corail 72 en sombre, et le balisage ne sait jamais lequel il a reçu. Les WCAG demandent 4,5:1 pour le texte courant et 3:1 pour les grands textes et les parties visibles des composants d'interface : une couleur de lien qui ne passe que dans un mode est une couleur qui échoue pour la moitié de votre lectorat.

> Si un token réclame une surcharge `dark:` dans le balisage, c'est le token qui est faux. Corrigez la couche qui définit la couleur, pas les onze endroits qui l'utilisent.

## Le clignotement, et le seul script que nous autorisons

Un thème qui respecte une préférence enregistrée pose un vrai problème : le serveur ne connaît pas cette préférence, donc le premier rendu peut être faux. Le remède est un petit script bloquant dans le head, et c'est l'un des rares endroits où un script bloquant est la bonne réponse :

```astro
---
// src/components/ThemeInit.astro - s'exécute avant le premier rendu, volontairement.
---

<script is:inline>
  const stored = localStorage.getItem("theme");
  const dark = stored
    ? stored === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
</script>
```

### Deux pièges en sept lignes

Deux détails nous ont coûté un bug chacun. `is:inline` est obligatoire, sans quoi le bundler déplace le script et il ne s'exécute plus avant le rendu. Et si le site utilise les view transitions, l'échange remplace les attributs de l'élément `<html>` par ceux rendus côté serveur : il faut donc réappliquer la classe sur `astro:after-swap`, sinon la page repasse en clair au deuxième clic.

Tant que vous êtes dans le head, livrez l'habillage de navigateur qui va avec :

```html
<meta name="theme-color" content="#fbfaf8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131a22" media="(prefers-color-scheme: dark)">
```

C'est la barre d'adresse sur Safari et Chrome mobiles. Le rater, c'est la différence entre un site qui a l'air dessiné et un site qui a l'air d'un document imprimé dans un navigateur.

## Ce que nous disons aux clients désormais

Le mode sombre est chiffré comme un livrable de contenu, pas comme une tâche de mise en forme, et le devis comprend trois lignes actionnables : un jeu d'images à fond transparent, une décision sur la couleur de marque en contexte sombre, et une personne nommée qui regardera les dix pages les plus visitées dans les deux modes avant la mise en ligne.

Le dernier point n'est pas une plaisanterie. Tous les bugs de mode sombre que nous avons livrés se trouvaient sur une page que personne n'avait pensé à regarder deux fois : une page de mentions légales avec un style de tableau hérité, une 404 avec une image de fond, un gabarit d'e-mail qui ne fait même pas partie du site. La palette est un système, et les systèmes sont bons sur les pages que vous avez dessinées. Le contenu n'est pas un système, et il vous attendra sur la page que vous avez oubliée.
