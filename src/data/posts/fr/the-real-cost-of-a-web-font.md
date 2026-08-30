---
title: "Ce que coûte vraiment une police web"
description: "Une police variable n'est pas automatiquement moins chère que deux graisses statiques, le sous-ensemble économise moins qu'on ne le croit, et la partie coûteuse reste la police de secours que personne n'a dessinée. Le vrai prix d'un caractère, en octets, en requêtes et en décalage."
pubDate: 2025-11-25
author: fr/tomas-abaroa
topic: fr/typography
tags: ["typographie", "polices", "performance"]
cover: ../../../assets/covers/reef-cout-police.webp
coverAlt: "Palmiers verts penchés au-dessus d'une plage de Polynésie française, l'eau turquoise derrière eux"
featured: false
draft: false
---

Un client nous a demandé le mois dernier s'il était possible d'ajouter une seconde police à son site. La licence était déjà payée : de son point de vue, c'était donc gratuit. L'hypothèse est légitime et elle est fausse, et l'explication a fini par devenir la note que j'aurais aimé qu'on me tende il y a dix ans.

Une police web se facture en quatre monnaies : des octets, des requêtes, un décalage de mise en page, et une décision de design que vous prendrez, que vous la remarquiez ou non.

## Les octets, mesurés correctement

Commençons par le tableau des formats, parce que la moitié de la confusion vient de là.

| Ce que vous servez | Une graisse latine de labeur | Bon à savoir |
| --- | --- | --- |
| WOFF2 | 18 à 26 Ko | Compressé en Brotli, géré partout où ça compte |
| WOFF | 28 à 40 Ko | Uniquement pour des navigateurs plus vieux que votre CMS |
| TTF ou OTF | 90 à 160 Ko | Le fichier envoyé par la fonderie. Ne le servez jamais |
| Variable, un axe, sous-ensemble latin | 35 à 60 Ko | Le cas intéressant, voir plus bas |

Ce sont des fourchettes relevées sur nos propres builds, pas des chiffres de plaquette commerciale. Une romane à large jeu de caractères se place en haut de chaque fourchette, une linéale géométrique aux tables de crénage serrées en bas.

Le nombre qui compte n'est aucune ligne prise isolément. C'est le total, parce qu'une police bloque le rendu dans le seul sens qui importe : le texte l'attend ou bien il est remplacé en cours de route, et les deux se paient.

## Une police variable n'est pas automatiquement moins chère

C'est l'idée reçue que j'entends le plus souvent et elle mérite une réponse franche. Une police variable range toutes les graisses comprises entre ses extrêmes dans un seul fichier, plus les données d'interpolation qui permettent de circuler entre elles. Ce fichier est plus gros qu'une graisse statique et plus petit que cinq.

Le point de bascule se situe autour de trois :

- **Deux graisses** (romain, gras) : les deux fichiers statiques gagnent, en général de 15 à 20 Ko.
- **Trois graisses** : à peu près à égalité. Choisissez selon l'envie de garder de la souplesse plus tard.
- **Quatre graisses ou plus**, ou n'importe quel usage d'une graisse absente de la liste initiale : la variable gagne, et elle gagne de plus en plus à mesure que le design grandit.

Il existe un second argument en faveur de la variable, sans rapport avec le poids. Avec un axe de graisse, on peut poser `font-weight: 560` sur un titre et cesser de faire semblant que le design n'a jamais voulu que du demi-gras. Avec l'axe de taille optique (`opsz`), le caractère ajuste lui-même son contraste et son approche entre un texte de labeur à 14 px et un titre à 72 px, ce que le plomb faisait tout seul et que le numérique a mis trente ans à réapprendre.

## Le sous-ensemble économise moins qu'espéré

Faire un sous-ensemble, c'est ne livrer que les glyphes utiles. L'outil s'appelle `fonttools`, et la commande n'a rien de spectaculaire :

```bash
pyftsubset SourceSerif4-Variable.ttf \
  --output-file=source-serif-latin.woff2 \
  --flavor=woff2 \
  --layout-features="kern,liga,onum,tnum,frac" \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2122"
```

Deux avertissements tirés de l'expérience. D'abord, le gain est plus faible qu'annoncé pour un caractère purement latin, parce qu'un sous-ensemble latin représente déjà l'essentiel du fichier : les chiffres spectaculaires qu'on cite viennent du retrait du cyrillique et du grec d'une police panéeuropéenne. Ensuite, attention à `--layout-features`. Retirez `kern` et vos titres se désagrègent. Retirez `liga` et certaines polices perdent le `fi` sur lequel vous comptiez. Et si le site est multilingue, souvenez-vous que le français réclame les guillemets chevrons et la ligature œ, tous deux hors de la plage ASCII, qui disparaissent sans bruit si vous découpez de mémoire plutôt que d'après le contenu réel.

Le bon réflexe consiste à déclarer aussi le sous-ensemble en CSS, pour que le navigateur puisse éviter un téléchargement inutile sur une page donnée :

```css
@font-face {
  font-family: "Source Serif Var";
  src: url("/fonts/source-serif-latin.woff2") format("woff2");
  font-weight: 200 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+2122;
}
```

## La police de secours que personne n'a dessinée

Voici la partie coûteuse, et elle ne pèse pas un octet.

<dl>
  <dt>FOIT, texte invisible</dt>
  <dd>Le navigateur masque le texte pendant le chargement de la police. Rien n'est lisible, la mise en page est stable, et le lecteur contemple une colonne vide. C'est ce que produit font-display: block.</dd>

  <dt>FOUT, texte non stylé</dt>
  <dd>La police de secours s'affiche tout de suite, puis la police web la remplace. Lisible immédiatement, mais la page bouge au moment de la bascule. C'est font-display: swap.</dd>

  <dt>Décalage à la bascule</dt>
  <dd>Le coût mesurable du FOUT : la police de secours et la police web n'ont pas les mêmes métriques, donc les lignes se recomposent et tout ce qui suit saute. Cela atterrit dans le Cumulative Layout Shift, et c'est parfaitement évitable.</dd>
</dl>

Évitable, parce que le CSS sait forcer une police système à imiter les métriques de celle qui se télécharge encore :

```css
@font-face {
  font-family: "Source Serif fallback";
  src: local("Georgia"), local("Times New Roman");
  size-adjust: 96.4%;
  ascent-override: 98%;
  descent-override: 24%;
  line-gap-override: 0%;
}

:root {
  --font-body: "Source Serif Var", "Source Serif fallback", Georgia, serif;
}
```

Ces quatre valeurs dépendent du couple de polices et ne se calculent pas à la main. Des outils comme [Fallback Font Generator](https://screenspan.net/fallback) ou le greffon `fontaine` mesurent les deux caractères et impriment la déclaration. Bien réglée, la bascule devient presque invisible : mêmes coupures de ligne, même hauteur de page, un simple changement de forme.

Si vous préférez ne pas mener ce combat, `font-display: optional` demande au navigateur de n'utiliser la police web que si elle est déjà en cache ou si elle arrive en une centaine de millisecondes, et de conserver la police de secours pour toute la visite sinon. Zéro décalage, garanti, au prix de quelques premiers visiteurs qui ne verront jamais votre caractère. Pour un site de texte avec un lectorat qui revient, l'échange est meilleur qu'il n'en a l'air.

## Les requêtes, et la seule règle de préchargement

Préchargez exactement les polices utilisées au-dessus de la ligne de flottaison, ce qui pour un site de texte veut dire une, éventuellement deux :

```html
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/source-serif-latin.woff2" crossorigin>
```

L'attribut `crossorigin` est obligatoire même pour un fichier servi depuis votre domaine, parce que les polices sont récupérées en mode CORS ; sans lui, le navigateur télécharge le fichier deux fois et vous avez aggravé la situation avec le sentiment d'avoir été malin. Précharger cinq polices est la même erreur à plus grande échelle : si tout est prioritaire, plus rien ne l'est.

Hébergez vos polices vous-même. Un hébergeur tiers, c'est une résolution DNS, une poignée de main TLS et un second cache ; or les navigateurs cloisonnent leur cache HTTP par site depuis 2020, donc le vieil argument du cache partagé entre sites ne tient plus. [Fontsource](https://fontsource.org) empaquette les familles libres en modules npm, sous-ensembles déjà découpés.

## Alors, combien coûte une seconde police ?

Pour ce client, honnêtement : environ 45 Ko, un préchargement supplémentaire que nous ne pouvions pas nous offrir, un couple de polices de secours à calibrer, et le risque d'une bascule visible sur la page à laquelle il tient le plus. Nous l'avons quand même livrée, financée par l'abandon d'une graisse qu'il n'utilisait pas. Toute la discipline est là. Rien n'est gratuit, tout se justifie si l'on connaît le prix, et la seule réponse inacceptable est de ne pas le connaître.
