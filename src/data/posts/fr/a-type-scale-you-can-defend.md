---
title: "Une échelle typographique défendable"
description: "Une proportion est facile à choisir et le plus souvent fausse. Une échelle gagne sa place quand chaque palier a un rôle sur une vraie page : cinq tailles, une longueur de ligne qui tient à 320 comme à 1440 pixels, et un clamp() qu'une designer peut lire à voix haute."
pubDate: 2026-06-16
author: fr/tomas-abaroa
topic: fr/typography
tags: ["typographie", "css", "echelle"]
cover: ../../../assets/covers/reef-echelle-typo.webp
coverAlt: "Les mains d'un horloger ouvrent le boîtier d'une montre à la pincette, plusieurs montres démontées posées sur un établi en bois clair"
featured: true
draft: false
---

Demandez à un designer d'où vient son échelle typographique et vous obtenez en général une proportion : une tierce majeure, une quarte juste, le nombre d'or si le projet a de l'ambition. Demandez à quoi sert le quatrième palier et la pièce devient silencieuse.

Une proportion est une façon de produire des candidats. Ce n'est pas une décision de design, et ça ne peut pas l'être, puisqu'elle ignore ce qu'il y a sur votre page. Les échelles qui survivent au contact du contenu réel sont celles où chaque palier a un rôle, et où la personne qui les a choisis sait dire ce qui casse si l'on en supprime un.

## Cinq paliers, cinq rôles

Voici l'échelle de ce carnet. Cinq tailles, dont une utilisée exactement une fois par page.

| Palier | Rôle | Mobile | Bureau | Interligne |
| --- | --- | --- | --- | --- |
| Titre | Le titre de l'article, une fois | 32 px | 56 px | 1,05 |
| Section | h2, la carte du lecteur | 24 px | 30 px | 1,2 |
| Sous-titre | h3 et h4, rares | 20 px | 22 px | 1,3 |
| Labeur | Tout ce qu'on lit vraiment | 18 px | 19 px | 1,6 |
| Annexe | Dates, légendes, notes | 15 px | 15 px | 1,5 |

Deux choix de ce tableau méritent discussion, alors défendons-les.

Le texte de labeur démarre à 18 px, pas à 16. Le défaut de 16 px est une convention de navigateur héritée des écrans de bureau à 96 ppp, et sur un téléphone tenu à bout de bras, c'est petit. Chaque fois que nous avons augmenté la taille du texte courant sur un site client, le temps de lecture a monté, et personne n'a jamais écrit pour se plaindre que le texte était trop grand.

Le texte d'annexe ne rétrécit pas davantage sur mobile. C'est dans les petites tailles que l'accessibilité échoue discrètement, et 15 px est notre plancher. Si quelque chose doit passer sous le plancher pour tenir, c'est la mise en page qui est fausse, pas la typographie.

## La proportion est un point de départ qu'on a le droit de casser

Une proportion de 1,25 à partir d'une base de 18 px donne 18 ; 22,5 ; 28 ; 35 ; 44. C'est propre, et inutile en haut : 44 px n'est pas un titre, c'est un gros intertitre, et la page n'a plus de moment d'arrivée. Nous cassons donc la proportion au palier de titre et sautons à 56, parce que ce palier a un rôle différent du reste de l'échelle. Ce n'est pas « une taille au-dessus d'un intertitre », c'est ce qui annonce que l'article commence.

En bas de l'échelle, nous arrondissons au pixel entier plutôt que de traîner les décimales de la proportion. Les tailles sous-pixel existent vraiment et les navigateurs les rendent, mais elles servent surtout à faire croire que 22,4 px et 22 px sont deux décisions de design différentes. Elles ne le sont pas.

- Paliers calculés par la proportion : labeur, sous-titre, section.
- Paliers posés à la main : titre (c'est une affiche) et annexe (c'est un plancher).
- Paliers supprimés : deux, parce qu'aucun gabarit ne les utilisait, et une échelle inutilisée produit de l'incohérence dès que quelqu'un a besoin d'une taille qui n'y est pas.

## Fluide, sans magie

Entre les deux colonnes du tableau se trouve `clamp()`, et il vaut la peine de l'écrire pour qu'un humain puisse le lire.

```css
:root {
  /* 32px a 320px de large, 56px a 1240px, lineaire entre les deux. */
  --step-display: clamp(2rem, 1.478rem + 2.609vw, 3.5rem);
  --step-section: clamp(1.5rem, 1.37rem + 0.652vw, 1.875rem);
  --step-body:    clamp(1.125rem, 1.103rem + 0.109vw, 1.1875rem);
}
```

La valeur du milieu n'est pas un nombre magique, c'est une droite qui passe par deux points. La pente est l'écart de taille divisé par l'écart de largeur, et l'ordonnée à l'origine est ce qui reste quand on retranche la contribution de la pente au bord inférieur :

```
pente     = (56 - 32) / (1240 - 320) = 0,02609  ->  2.609vw
ordonnee  = 32 - (0,02609 x 320)     = 23,65px  ->  1.478rem
```

### Deux règles qui gardent tout cela honnête

Écrivez l'ordonnée en `rem`, jamais en `px`, pour que l'expression entière réagisse encore quand un lecteur augmente la taille de police par défaut de son navigateur ; un clamp bâti uniquement sur des `px` et des `vw` ignore cette préférence et échoue discrètement au critère [WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). Et ne laissez jamais la plage fluide couvrir tout le design : sous 320 et au-dessus de 1240, la valeur se verrouille, ce qui est exactement souhaitable sur un écran de 1900 px où un titre qui continue de grossir devient un panneau publicitaire. Si l'arithmétique vous ennuie, [Utopia](https://utopia.fyi) génère les mêmes expressions à partir des mêmes quatre entrées.

## Les trois mots dont on discute réellement

<dl>
  <dt>Longueur de ligne</dt>
  <dd>La largeur d'une ligne de texte, comptée en caractères. De 60 à 75 est la plage confortable pour de la prose suivie ; sous 45 l'œil saute trop souvent, au-dessus de 85 il perd le début de la ligne suivante. Réglez-la en ch et elle suivra la police.</dd>

  <dt>Interligne</dt>
  <dd>L'espace entre les lignes, exprimé en line-height sans unité pour qu'il se multiplie par la taille propre de l'élément. Il doit croître quand la ligne s'allonge et diminuer quand la typographie grossit : 1,6 pour le texte courant, 1,05 pour un grand titre.</dd>

  <dt>Approche</dt>
  <dd>L'espacement uniforme entre les lettres. Les grandes tailles réclament presque toujours une approche légèrement négative, les petites tailles et les capitales une approche positive. C'est le réglage vers lequel on se précipite en premier et dont on a le moins besoin.</dd>
</dl>

En CSS, cela fait quatre déclarations, et elles font plus pour la lisibilité que n'importe quel choix de caractère :

```css
.prose {
  max-inline-size: 68ch;
  font-size: var(--step-body);
  line-height: 1.6;
  text-wrap: pretty;
}

.prose h1 {
  font-size: var(--step-display);
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
```

`text-wrap: balance` égalise les lignes d'un titre court pour éviter les cinq mots suivis d'un seul. `text-wrap: pretty` fait le travail plus modeste sur le texte courant, en empêchant le mot orphelin en fin de paragraphe. Ce sont des indications plutôt que des garanties, et les deux ne coûtent rien là où elles ne sont pas gérées.

## Le tester sur les deux largeurs qui comptent

Une échelle qui n'a l'air juste que dans le fichier de maquette n'est pas une échelle. La nôtre est vérifiée sur exactement deux largeurs, avec du contenu réel : 320 px, parce que c'est encore le téléphone le plus étroit dans les données de terrain, et 1440 px, parce que c'est là qu'un titre long a de la place pour vous ridiculiser.

Les tests sont volontairement ennuyeux :

1. Le plus long titre d'article réel tient-il en trois lignes à 320 px sans couper un mot ?
2. À 1440 px, la ligne fait-elle toujours moins de 75 caractères, ou le conteneur a-t-il grandi en douce ?
3. La page tient-elle encore debout à 200 % de zoom navigateur, question qui revient à demander si une taille est verrouillée en px ?
4. Deux paliers voisins se distinguent-ils assez pour qu'un lecteur reconnaisse une section d'une sous-section sans compter les pixels ?

### La question qui tue les échelles

C'est la quatrième qui s'en charge. Si vous ne voyez pas la différence, vous n'avez pas deux paliers, vous avez un palier et une erreur d'arrondi, et le remède est d'en supprimer un plutôt que d'ajouter du contraste ailleurs. Le [coût d'une seconde police](/fr/blog/the-real-cost-of-a-web-font/) est une autre discussion, mais une échelle qui en réclame une pour être lisible n'a jamais été une échelle.
