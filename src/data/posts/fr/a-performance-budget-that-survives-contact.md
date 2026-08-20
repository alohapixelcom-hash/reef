---
title: "Un budget de performance qui résiste au client"
description: "Un budget, ce n'est pas un score Lighthouse, et ce n'est pas un message dans Slack. Voici celui que nous écrivons désormais dans le contrat : quatre nombres, l'appareil sur lequel on les mesure, et la phrase qui tranche quand on nous demande une vidéo en en-tête en semaine neuf."
pubDate: 2025-10-21
updatedDate: 2026-02-10
author: fr/noor-benali
topic: fr/performance
tags: ["performance", "budgets", "process"]
cover: ../../../assets/covers/reef-budget-performance.webp
coverAlt: "Vague turquoise qui se creuse, crête translucide éclairée à contre-jour et voile d'écume blanche"
featured: false
draft: false
---

Tous les studios disent qu'ils tiennent à la performance. Presque aucun n'est capable de dire, avant le début du projet, quel nombre le pousserait à refuser une fonctionnalité. C'est là qu'est tout le problème : sans seuil convenu à l'avance, « rapide » est une affaire de goût, et le goût perd toutes ses discussions contre un service marketing.

Nous avons commencé à inscrire un budget de performance dans le devis en 2023. Il a échoué deux fois, et ces deux échecs nous ont appris plus que les réussites.

## Les quatre nombres

Un budget à neuf métriques est une liste de vœux. Le nôtre en compte quatre, et chacune existe parce qu'elle protège quelqu'un de différent.

| Métrique | Cible | Protège |
| --- | --- | --- |
| Largest Contentful Paint | 2,0 s au p75[^p75] | La personne qui décide si elle reste |
| Interaction to Next Paint | 200 ms au p75 | Celle qui ouvre le menu sur un téléphone bas de gamme |
| Cumulative Layout Shift | 0,05 | Celle qui vient de perdre sa ligne |
| Poids de la page, gabarit d'article | 180 Ko compressés | Le client, contre nous |

La dernière ligne est celle sur laquelle les clients posent des questions, et c'est celle qui nous importe le plus. Les trois Core Web Vitals sont des résultats : ils bougent pour des raisons que vous ne maîtrisez pas entièrement, y compris le CDN, le réseau du visiteur et le téléphone qu'il a en poche. Le poids de la page, lui, est une entrée. C'est le nombre que l'équipe fixe réellement, chaque jour, à chaque décision, et le seul qu'on puisse vérifier sans rien déployer.

[^p75]: Le p75, c'est le 75e centile des visites réelles : trois lecteurs sur quatre obtiennent cette expérience ou mieux. Les données de terrain de Chrome l'agrègent sur une fenêtre glissante de 28 jours, ce qui explique aussi pourquoi le correctif livré mardi dernier n'apparaît pas encore dans le rapport.

## L'appareil fait partie du nombre

Une cible sans appareil n'est pas une cible. « LCP sous deux secondes » mesuré sur un MacBook branché à la fibre du bureau est une information sur notre bureau, pas sur le site.

Nous mesurons sur un téléphone Android de milieu de gamme vieux de trois ans, sur une connexion bridée, et nous l'écrivons noir sur blanc. Concrètement, cela revient à un bridage processeur d'environ 4x et à un profil réseau proche d'une 4G lente, ce que simule par défaut le préréglage mobile de Lighthouse. La première fois qu'un client voit son propre site dans ces conditions, la réunion change complètement de nature. Plus personne n'a besoin d'être convaincu ensuite, et aucune présentation n'a jamais fait ce travail aussi bien.

## L'écrire là où le build peut le lire

Un budget que personne n'automatise expire discrètement vers la sixième semaine. Le nôtre vit dans un fichier :

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "document", "budget": 20 },
      { "resourceType": "script", "budget": 40 },
      { "resourceType": "stylesheet", "budget": 25 },
      { "resourceType": "font", "budget": 95 },
      { "resourceType": "total", "budget": 400 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 4 }
    ],
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2000 },
      { "metric": "cumulative-layout-shift", "budget": 0.05 }
    ]
  }
]
```

Les tailles sont en kibioctets, les temps en millisecondes, et le fichier est compris directement par la ligne de commande Lighthouse :

```bash
npx lighthouse "https://recette.exemple.com/journal/premier-article/" \
  --budget-path=./perf/budget.json \
  --form-factor=mobile \
  --output=json --output-path=./perf/rapport.json \
  --chrome-flags="--headless=new"
```

Le contrôle tourne sur chaque pull request qui touche aux gabarits, et le job échoue sur un dépassement de budget, pas sur un score. Un score est une moyenne pondérée qui change d'une version de Lighthouse à l'autre ; un budget est une promesse avec une unité. Quand le nombre bouge, la pull request vous dit quel type de ressource l'a fait bouger, et la discussion prend deux minutes au lieu d'un après-midi.

## La clause qui fait le vrai travail

L'automatisation attrape les régressions. Elle ne répond pas à la question politique, qui arrive toujours vers la semaine neuf et paraît toujours raisonnable. C'est le contrat qui y répond :

1. **Le budget est une quantité fixe, pas un objectif.** On ne demande à personne d'être en dessous en moyenne.
2. **Tout poids ajouté oblige à retirer l'équivalent.** Une vidéo d'en-tête de 90 Ko passe si 90 Ko d'autre chose partent, et c'est le client qui choisit quoi.
3. **Les tiers comptent comme les nôtres.** Une balise de mesure d'audience, un module de discussion et un gestionnaire de consentement font trois des quatre tiers autorisés : le quatrième est donc une décision, pas un accident.
4. **Un dépassement bloque la mise en ligne, il ne devient pas un ticket.** Le site part lent ou il part plus tard. Il n'y a pas de troisième option, ni de backlog où le faire disparaître.

L'intérêt de coucher cela sur le papier n'est pas juridique. Nous ne l'avons jamais brandi. Sa vraie fonction, c'est de déplacer la discussion de la semaine neuf, quand le budget est consommé et tout le monde fatigué, à la semaine zéro, quand elle reste abstraite entre gens qui s'apprécient encore.

## Là où nos budgets ont échoué

Deux fois, et pour la même raison : le site avait quitté nos mains.

### Les balises que personne ne surveillait

Premier échec, un client dont l'équipe marketing a ajouté six balises via un gestionnaire de balises le mois suivant la mise en ligne. Le poids de la page a triplé. Rien dans notre processus ne surveillait quoi que ce soit, puisque notre automatisation tournait sur les pull requests, et qu'il n'y avait plus de pull requests. Aujourd'hui, le même passage de Lighthouse tourne chaque semaine contre la production, et le rapport arrive dans la boîte du client, pas dans la nôtre.

### La photo de quatre mégaoctets

Deuxième échec, un problème de contenu déguisé en problème technique. Une rédactrice a téléversé une photo de 4,2 Mo via le CMS, qui l'a poliment redimensionnée pour l'affichage et a tout de même servi l'original sur la page d'article, parce que le gabarit demandait le fichier source. C'est notre bug, pas le sien, et le correctif a été une chaîne de traitement qui rend l'erreur impossible : tout téléversement est transcodé en AVIF et en WebP avec des dimensions explicites, et le gabarit ne peut plus référencer un fichier original du tout.

Les deux échecs ont une forme commune qui mérite un nom. Un budget protège le code que vous écrivez. Il ne fait rien contre les contenus et les balises qui arrivent après, et c'est pourtant là que le poids s'accumule sur la vie d'un site. Si vous ne mettez en place qu'un seul contrôle automatique après la mise en ligne, n'en faites pas un test synthétique de votre propre gabarit. Faites-en un passage hebdomadaire sur la page en ligne, sur le téléphone que vos lecteurs utilisent vraiment, envoyé à la personne qui a le pouvoir de dire non.

## Ce que ça coûte

Un après-midi en début de projet, un job d'intégration continue d'une trentaine de lignes, et la discipline de laisser un build échouer un vendredi. En échange, vous obtenez un site encore rapide à la fin de la mission, la seule mesure que fasse jamais quelqu'un d'extérieur à l'équipe.
