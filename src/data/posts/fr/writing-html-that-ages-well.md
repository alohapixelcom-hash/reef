---
title: "Écrire du HTML qui vieillit bien"
description: "Nous avons refait un site livré pour la première fois en 2016, et le balisage qui a survécu n'a jamais été le balisage malin. Ce qui tient : des éléments choisis pour leur sens, un état laissé là où le navigateur le voit, et une limite stricte à ce qu'un nom de classe a le droit de savoir."
pubDate: 2025-09-16
author: fr/mara-lindqvist
topic: fr/craft
tags: ["html", "semantique", "maintenance"]
cover: ../../../assets/covers/reef-html-qui-vieillit.webp
coverAlt: "Les mains d'un menuisier poussent un rabot sur une planche, un copeau de bois s'enroulant à la sortie de l'outil"
featured: false
draft: false
---

Nous avons passé le mois d'août à refaire un site que le studio avait livré en 2016. Neuf ans, quatre directions artistiques, deux migrations de CMS, un framework que le client refuse désormais de nommer. Avant de supprimer quoi que ce soit, j'ai relu les anciens gabarits ligne par ligne, parce qu'une refonte est la seule revue de code honnête qu'on obtienne jamais : le code a déjà été jugé par le temps, il ne reste qu'à lire le verdict.

Le verdict n'a pas été tendre avec la développeuse que j'étais, mais il a été constant. Tout ce qui était malin est mort. Le balisage le plus simple était encore là, encore fonctionnel, et dans deux cas il avait discrètement gagné des fonctionnalités que je n'avais pas écrites.

## Un élément est une interface, pas une décoration

Un élément HTML est un contrat passé avec trois parties à la fois : le moteur de rendu, l'arbre d'accessibilité, et la personne qui ouvrira le fichier en 2034. Mettre `div` partout rompt les trois contrats pour économiser quatre caractères.

L'exemple le plus net dans l'ancien code : une FAQ en accordéon construite en 2016 avec des div, un gestionnaire de clic, un booléen dans l'état d'un composant, et environ quatre-vingt-dix lignes d'ARIA fausses à deux endroits. Ça marchait. Et il fallait tout réécrire à chaque changement de stack, parce que le comportement vivait dans le framework, pas dans le document.

### L'élément details a justifié sa place

Le remplaçant tient dans un balisage qu'un client pourrait éditer :

```html
<section>
  <h2 id="faq">Questions fréquentes</h2>

  <details name="faq" open>
    <summary>Travaillez-vous avec un design system existant ?</summary>
    <p>En général oui. On audite les tokens d'abord et on vous dit ce
       qui manque avant de toucher au moindre composant.</p>
  </details>

  <details name="faq">
    <summary>Combien de temps prend une refonte ?</summary>
    <p>Six à dix semaines pour un site vitrine de cette taille,
       migration des contenus comprise.</p>
  </details>
</section>
```

Le clavier, les annonces du lecteur d'écran, la recherche dans la page et la feuille de style d'impression viennent avec, gratuitement. L'attribut `name` est ce qui a surpris l'équipe : donnez le même nom à plusieurs `details` et le navigateur referme les autres quand l'un s'ouvre, ce qui est exactement l'accordéon exclusif que nous bricolions à la main. C'est [dans le standard HTML](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element) et c'est géré par tous les navigateurs à jour, donc les quatre-vingt-dix lignes d'ARIA sont devenues zéro ligne de quoi que ce soit.

La même logique vaut plus haut dans la page. Une fenêtre modale, c'est `<dialog>` et `showModal()` : le focus entre dedans, l'arrière-plan devient inerte, Échap referme, et `::backdrop` se stylise. Un bloc de recherche, c'est `<search>`. Une date de publication, c'est `<time datetime="2025-09-16">`, et c'est ce qui permet à un lecteur de flux, à un résultat enrichi et à une fonction de tri de tomber d'accord sur ce que veut dire « septembre ». Rien de tout cela n'est nouveau. La plupart de ces éléments sont antérieurs au JavaScript que nous avions écrit pour les remplacer.

## L'état que le navigateur possède déjà

La deuxième chose qui a mal vieilli, c'est l'état que nous gardions dans des variables invisibles au document.

Quand une case est cochée, le navigateur le sait. Quand un `details` est ouvert, le navigateur le sait, et `:open` le stylise. Quand un champ est invalide, `:user-invalid` le sait, et il attend que la personne ait fini de taper avant de le dire, politesse que nous implémentions autrefois avec des minuteurs. Avec `:has()`, un parent réagit à tout cela sans une ligne de script :

```html
<label>
  <input type="checkbox" name="terms" required>
  J'ai lu les conditions
</label>
```

```css
form:has(input[name="terms"]:not(:checked)) [type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}
```

Cette règle n'est pas plus élégante que le JavaScript qu'elle remplace. Elle est plus durable, ce qui compte davantage. Elle survit à une réécriture de la couche de composants, elle s'applique avant toute hydratation, et elle ne peut pas se désynchroniser du DOM puisqu'elle *est* le DOM.

> Quand le navigateur a un avis sur la façon dont une chose doit se comporter, c'est en général un meilleur avis que le mien, et c'est à coup sûr un avis mieux entretenu.

L'exception existe vraiment : certaines interactions n'ont pas d'élément. Les listes déroulantes éditables, le réordonnancement par glisser-déposer, tout ce qui virtualise une longue liste demandent du code, et prétendre le contraire produit une accessibilité pire, pas meilleure. La règle n'est pas « ne jamais écrire de JavaScript ». La règle, c'est que le JavaScript commence là où la plateforme s'arrête, et qu'on doit être capable de dire à voix haute où passe cette frontière.

---

## Ce qu'un nom de classe a le droit de savoir

La troisième leçon portait sur le nommage, et c'est celle qui nous a coûté le plus de temps pendant la refonte.

Les noms de classe qui décrivaient une *apparence* étaient tous morts : `card--wide`, `text-blue`, `mt-40`, `sidebar-right`. Chacun est devenu un mensonge dès le premier changement de design, et un mensonge dans un nom de classe est pire que pas de nom du tout, parce qu'on ne peut plus le chercher sans risque. On finit avec un `sidebar-right` affiché à gauche et un `card--wide` utilisé pour la variante étroite, et plus personne n'ose supprimer ni l'un ni l'autre.

Les noms de classe qui décrivaient une *nature* ont presque tous survécu : `article-meta`, `topic-badge`, `field-error`. Le design a bougé deux fois sous eux et les noms sont restés vrais, parce qu'ils n'avaient jamais rien promis sur des pixels.

#### Un test qui prend dix secondes

Lisez le nom de classe à voix haute, puis demandez-vous : si la designer change d'avis demain sur l'apparence, la phrase reste-t-elle vraie ? `field-error` passe. `text-red` échoue. Toute la règle est là, et c'est ce qui sépare une feuille de style qu'on peut refactorer d'une feuille de style à laquelle on ne peut qu'ajouter. Le corollaire, c'est que les classes utilitaires vont très bien justement parce que ce ne sont pas des noms : `p-4` n'a jamais prétendu être un concept, donc il ne peut pas devenir un concept périmé. Ce qui ruine un projet, c'est la couche intermédiaire, ce nom à moitié sémantique qui encode la mise en page de l'année dernière et se retrouve copié dans onze gabarits avant que quiconque s'en aperçoive.

## Ce qui a réellement survécu depuis 2016

Trois choses, au bout du compte. Le balisage des formulaires, parce qu'il était simple et que le navigateur faisait le travail. La structure des titres, parce que nous l'avions écrite pour un lecteur et non pour un moteur de recherche, et que les lecteurs n'ont pas été dépréciés. Et une feuille de style d'impression que personne n'a rouverte depuis neuf ans, qui produit encore un PDF correct de chaque page d'article, parce que c'étaient quarante lignes de CSS accrochées à des éléments sémantiques plutôt qu'à un arbre de composants.

Tout le reste a été remplacé. Ce rapport ne me déprime pas. C'est à peu près celui auquel il faut s'attendre, et la conclusion utile n'est pas « écrivez moins de code », c'est « sachez dans quelle couche vous écrivez ». La couche document survit à la couche style, qui survit à la couche comportement, qui survit confortablement à l'outillage de build. Placez vos décisions dans la couche la plus profonde capable de les porter, et la prochaine refonte lira votre travail comme une faveur plutôt que comme un obstacle.
