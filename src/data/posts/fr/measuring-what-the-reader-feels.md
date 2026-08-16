---
title: "Le chargement mesuré chez le lecteur, pas au labo"
description: "Les outils de laboratoire mesurent un robot sur de la fibre. Les données de terrain mesurent vos lecteurs dans le bus. Voici le dispositif honnête le plus simple que nous ayons su construire : trois métriques, un point d'entrée, aucun script tiers, et la semaine où nos deux séries de chiffres se sont contredites de deux secondes et demie."
pubDate: 2026-05-05
updatedDate: 2026-06-30
author: fr/noor-benali
topic: fr/performance
tags: ["web vitals", "rum", "mesure"]
featured: false
draft: false
---

L'automne dernier, le site d'un client affichait 98 sur Lighthouse et un Largest Contentful Paint de 1,4 seconde sur nos passages de test. Le même site, dans les données de terrain de Chrome, se tenait à 3,9 secondes au 75e centile. Les deux chiffres étaient exacts. C'étaient les réponses à deux questions différentes, et une seule des deux questions portait sur les lecteurs du client.

C'est cet écart qui nous fait installer aujourd'hui une mesure de terrain sur chaque site que nous livrons, avant la mise en ligne, comme partie du projet et non comme rattrapage.

## Deux instruments, deux métiers

| | Laboratoire (synthétique) | Terrain (vrais visiteurs) |
| --- | --- | --- |
| Qui est mesuré | Une visite scriptée | Tout le monde, sur son propre appareil |
| Réseau | Simulé, constant | Celui qu'ils ont |
| Excellent pour | Attraper les régressions, comparer deux builds | Dire ce qui se passe réellement |
| Aveugle à | Caches, bandeaux de consentement, sessions connectées, géographie | Tout ce que personne n'a encore visité |
| Disponible | Avant la mise en ligne | Après, avec du retard |

L'erreur n'est pas d'utiliser l'un des deux. L'erreur est de croire qu'un bon chiffre du premier dit quelque chose du second. Le laboratoire est une expérience contrôlée : on change une chose, on regarde ce qui bouge. Le terrain est une observation du réel, et le réel comprend le lecteur qui a ouvert votre article dans un train, sur un téléphone de quatre ans, derrière un bandeau de consentement, avec un mode économie d'énergie qui bride le processeur.

## Les trois métriques qui valent la peine

Les Core Web Vitals sont au nombre de trois parce que c'est à peu près le nombre de choses indépendantes qu'un lecteur peut remarquer.

- **LCP** répond à « est-ce que l'essentiel est apparu ». Le seuil publié est 2,5 secondes au p75 ; nous visons 2,0 pour garder de la marge.
- **INP** répond à « est-ce que la page a réagi quand j'ai touché l'écran ». Il a remplacé le First Input Delay en mars 2024 et il est bien plus difficile à truquer, puisqu'il regarde toutes les interactions de la visite et non la première seulement. Sous 200 ms.
- **CLS** répond à « est-ce que la page a bougé pendant ma lecture ». Sous 0,1, et l'objectif honnête est zéro.

Nous ne collectons rien d'autre au premier passage. Les métriques supplémentaires sont surtout une façon d'éviter la conclusion que les trois premières ont déjà donnée.

## Le dispositif honnête le plus simple

Aucun prestataire de mesure, aucun gestionnaire de balises, un point d'entrée à nous. Tout le code client tient en une vingtaine de lignes, avec la variante « attribution » de [web-vitals](https://github.com/GoogleChrome/web-vitals), qui vous dit non seulement que quelque chose a été lent, mais quel élément en est responsable :

```js
import { onCLS, onINP, onLCP } from "web-vitals/attribution";

const queue = [];

function record(metric) {
  const a = metric.attribution;
  queue.push({
    name: metric.name,
    // Le CLS est sans unite : on le stocke mis a l'echelle pour n'envoyer que des entiers.
    value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    path: location.pathname,
    culprit: a.interactionTarget ?? a.largestShiftTarget ?? a.element ?? null,
    connection: navigator.connection?.effectiveType ?? null,
  });
}

onLCP(record);
onINP(record);
onCLS(record);

addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden" || queue.length === 0) return;
  navigator.sendBeacon("/api/vitals", JSON.stringify(queue.splice(0)));
});
```

### Quatre choix délibérés

Quatre décisions y sont délibérées.

`sendBeacon` plutôt que `fetch`, parce qu'il survit à la fermeture de la page et ne retarde pas la navigation. `visibilitychange` plutôt que `unload`, parce que `unload` n'est pas fiable sur mobile et désactive le cache de retour arrière, ce qui ralentirait précisément les lecteurs que nous cherchons à aider.[^ordre] Le champ `culprit`, parce que « INP à 480 ms » ouvre une enquête là où « INP à 480 ms sur le bouton de filtre par sujet » la referme. Et un taux d'échantillonnage, absent de l'extrait : sur un site à trafic réel, nous n'envoyons qu'une fraction tirée au hasard des sessions, parce que cent pour cent des visites font beaucoup de lignes pour n'apprendre rien de plus.

[^ordre]: L'ordre compte ici. La bibliothèque web-vitals enregistre son propre écouteur `visibilitychange` au moment de l'import et y finalise les valeurs en attente. Comme les écouteurs s'exécutent dans leur ordre d'enregistrement, importer la bibliothèque avant d'ajouter l'écouteur d'envoi est ce qui garantit que la file est pleine quand le beacon part.

Côté serveur, un gestionnaire valide la forme, jette tout ce qui porte un nom de métrique inconnu, et ajoute une ligne. Le nôtre écrit dans un fichier SQLite et une petite requête agrège le p75 par gabarit et par semaine. Il n'y a aucun produit de tableau de bord dans cette pile, et en deux ans il n'y a pas eu un moment où il nous en ait manqué un.

---

## Quand le laboratoire et le terrain se contredisent, c'est le terrain qui a raison

Revenons au client à 1,4 seconde en laboratoire et 3,9 sur le terrain. Les données d'attribution ont rendu l'enquête courte.

L'élément LCP sur le terrain était l'image d'en-tête, et sa décomposition plaçait presque tout le temps dans le délai avant chargement de la ressource, pas dans le téléchargement lui-même. Autrement dit, le navigateur savait quoi récupérer et n'arrivait pas à commencer. En cause : un script de gestion du consentement chargé de façon synchrone dans le head, qui mettait 600 ms à arriver, puis écrivait des styles en ligne masquant l'en-tête jusqu'à la décision du visiteur. Nos passages de laboratoire ne l'ont jamais vu : notre profil de test avait déjà consenti, et le script se court-circuitait.

Le second contributeur était moins spectaculaire et plus fréquent : onze pour cent des visites arrivaient avec un type de connexion effectif `3g`, depuis une région qui ne figurait sur la liste des marchés importants de personne et se révélait être leur deuxième source de commandes. Le p75 de toute l'audience était fixé par une audience que personne n'avait regardée.

Nous avons repoussé le script de consentement à un chargement différé avec une place réservée pour son bandeau, préchargé l'image d'en-tête, et servi de l'AVIF en trois largeurs. Le LCP de terrain au p75 est passé de 3,9 à 2,1 secondes sur les quatre semaines suivantes, délai inhérent à une fenêtre glissante de 28 jours plutôt qu'à un correctif lent.

## Deux vérifications qui ne coûtent rien

Avant d'écrire la moindre ligne, passez cinq minutes sur les données de terrain publiques de l'origine. Si le site a assez de trafic, Chrome les a déjà collectées :

```bash
curl -s "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin":"https://exemple.com","formFactor":"PHONE"}' \
  | jq '.record.metrics | to_entries[] | {(.key): .value.percentiles.p75}'
```

Et gardez le test de laboratoire dans l'intégration continue, braqué sur le [budget de performance](/fr/blog/a-performance-budget-that-survives-contact/) plutôt que sur un score. Les deux instruments font des métiers différents : le laboratoire vous dit que cette pull request a dégradé quelque chose, dans une comparaison que vous maîtrisez. Le terrain vous dit si le site est bon, dans la seule comparaison qui rapporte.

Si vous ne pouvez en garder qu'un, prenez le terrain. Il est moins pratique, il arrive en retard, il ne se lance pas sur une branche, et c'est le seul qui ait jamais fait changer d'avis un client.
