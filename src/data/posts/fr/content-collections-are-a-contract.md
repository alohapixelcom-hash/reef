---
title: "Une collection de contenu est un contrat, pas un dossier"
description: "Un schéma qui casse le build vaut mieux qu'un CMS qui laisse n'importe qui publier une page cassée. Ce que nous validons dans Astro, ce que nous laissons volontairement tranquille, et les trois règles qui empêchent un schéma Zod de devenir un second CMS."
pubDate: 2026-01-13
updatedDate: 2026-03-02
author: fr/mara-lindqvist
topic: fr/craft
tags: ["astro", "zod", "contenu"]
cover: ../../../assets/covers/reef-collections-contrat.webp
coverAlt: "Une boussole de laiton ouverte posée sur une vieille carte marine gravée d'un voilier"
featured: false
draft: false
---

Le meilleur rapport de bug de l'année dernière était un échec de build. Une rédactrice avait tapé `topc: performance` dans un bloc de frontmatter, la construction s'est arrêtée, et le message nommait le fichier, la ligne et la clé attendue. Coût total : quarante secondes. Sur la version précédente de ce site, la même faute de frappe produisait une page publiée sans catégorie, découverte cinq semaines plus tard par quelqu'un qui auditait le sitemap.

C'est tout l'argument des schémas, et il ne parle pas vraiment de types. Il parle du *moment* où l'on apprend la nouvelle.

## Le schéma est une promesse de forme

Une collection Astro, ce sont deux choses : un loader qui dit d'où viennent les entrées, et un schéma qui dit à quoi ressemble une entrée valide. Le nôtre, pour ce carnet, tient en une trentaine de lignes :

```ts
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/data/posts" }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(80),
        description: z.string().min(80).max(220),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        author: reference("authors"),
        topic: reference("topics"),
        tags: z.array(z.string()).default([]),
        cover: image().optional(),
        draft: z.boolean().default(false),
      })
      .refine((data) => !data.updatedDate || data.updatedDate >= data.pubDate, {
        message: "updatedDate ne peut pas précéder pubDate",
        path: ["updatedDate"],
      }),
});
```

Quatre de ces lignes valent plus que toutes les autres réunies.

### reference() transforme une faute de frappe en erreur de build

`reference("authors")` ne se contente pas de valider une chaîne. Il vérifie, au moment du build, qu'une entrée portant cet identifiant existe réellement dans l'autre collection. Un nom d'auteur mal orthographié ne devient pas une page à signature vide en production : c'est un terminal rouge sur la machine de la personne qui vient de se tromper, trente secondes après l'erreur.

### image() supprime toute une famille de décalages

Déclarer `cover: image()` donne à Astro le fichier plutôt qu'un chemin. Il est optimisé, et ses dimensions intrinsèques reviennent avec lui, si bien que le gabarit peut écrire une largeur et une hauteur et réserver la place avant l'arrivée des octets. C'est l'une des deux causes de décalage sur une page d'article. [L'autre est la bascule de police](/fr/blog/the-real-cost-of-a-web-font/), et elle a son propre remède.

### coerce.date() clôt le débat chaîne contre Date

YAML vous rend une chaîne ou une date selon les guillemets, le fuseau horaire et la phase de la lune. `z.coerce.date()` rend une `Date`, toujours, et une erreur claire quand la valeur ne peut pas en devenir une. Tous nos anciens bugs de formatage de date étaient en réalité ce bug déguisé.

### refine() est l'endroit des règles qui vous appartiennent

Les types ne savent pas exprimer « révisé avant d'avoir été écrit ». Le `refine` ci-dessus le sait, et c'est le bon endroit pour toute règle qui relève de votre processus éditorial plutôt que de JavaScript.

> Un schéma n'est pas de la documentation pour la machine. C'est la liste la plus courte possible de ce que vous refusez de publier.

## Trois règles pour qu'il ne devienne pas un CMS

Le mode de défaillance d'un bon schéma, c'est la croissance. Quelqu'un veut une mise en page large pour un article, un champ `layout` apparaît. Puis `heroStyle`, puis `showToc`, puis `ctaVariant`, et dix-huit mois plus tard le frontmatter est un langage de configuration sans documentation, sans interface, et avec un seul utilisateur.

Nous tenons la ligne avec trois règles.

1. **Le frontmatter décrit le contenu, jamais la page.** `topic` est du contenu. `featured` en est, à la rigueur. `heroStyle` n'en est pas : il décrit un rendu, et les décisions de rendu appartiennent au gabarit, là où on peut les changer une fois pour tous les articles à la fois.
2. **Un champ doit pouvoir être rempli par la personne qui écrit.** Si une rédactrice ne peut pas le renseigner sans demander à un développeur, sa place n'est pas dans le frontmatter. Elle est dans le code, dans la configuration, ou dans une convention.
3. **Un champ gagne sa place en supprimant une décision, pas en ajoutant une option.** `draft: true` supprime la décision « est-ce que je pousse maintenant ». `ctaVariant: "b"` en ajoute une, pour toujours, à tous les articles à venir.

La troisième règle est celle qui fait mal, et c'est celle qui garde le schéma lisible au bout de deux ans.

## Ce que nous ne validons volontairement pas

Le corps du texte. Nous ne vérifions pas l'ordre des titres, nous n'imposons pas de nombre de mots, et nous ne passons pas la prose au correcteur dans le schéma. Le frontmatter est une donnée structurée et sa place est dans Zod ; un paragraphe n'est pas une donnée structurée, et toute tentative de prétendre le contraire finit par une rédactrice qui se bat contre un robot à onze heures du soir.

Nous ne validons pas non plus qu'un seul article est à la une, alors que c'est une vraie règle éditoriale. Zod voit un fichier à la fois et ne sait pas compter les autres : le contrôle vit donc là où il peut voir la collection entière, dans la page qui affiche l'emplacement à la une, laquelle prend le plus récent et ignore les surnuméraires. La règle est appliquée par l'endroit qui dispose de l'information, principe plus général qu'il n'en a l'air.

## La relecture, côté gabarit

Tout ce qui suit est du code ordinaire, puisque la forme est déjà garantie :

```astro
---
import { getCollection, getEntry, render } from "astro:content";

const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);

const latest = posts[0]!;
const author = await getEntry(latest.data.author);
const { Content, headings } = await render(latest);
---

<article>
  <h1>{latest.data.title}</h1>
  <p>Par {author?.data.name}</p>
  <nav aria-label="Sur cette page">
    <ul>
      {headings.filter((h) => h.depth === 2).map((h) => (
        <li><a href={`#${h.slug}`}>{h.text}</a></li>
      ))}
    </ul>
  </nav>
  <Content />
</article>
```

Remarquez ce qui manque : aucun chaînage optionnel sur `pubDate`, aucune vérification défensive que `tags` est bien un tableau, aucun titre de repli. Le schéma a déjà rendu tout cela impossible, donc le gabarit dit ce qu'il veut dire. C'est le vrai rendement des trente lignes, et il se cumule sur chaque gabarit qui touche à la collection.

## La migration que vous finirez par lancer

Un schéma évolue, et cette évolution est une petite cérémonie plutôt qu'une crise. Ajoutez le champ en optionnel, remplissez les entrées qui comptent, puis rendez-le obligatoire et regardez le build vous dire exactement quels fichiers vous avez oubliés. La liste est exhaustive, elle met cinq secondes à sortir, et c'est la même liste qu'une migration de base de données vous aurait fait payer un week-end.
