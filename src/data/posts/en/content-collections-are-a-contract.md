---
title: "Content collections are a contract, not a folder"
description: "A schema that fails the build is worth more than a CMS that lets anyone publish a broken page. What we validate in Astro, what we deliberately leave alone, and the three rules that keep a Zod schema from slowly turning into a second CMS."
pubDate: 2026-01-13
updatedDate: 2026-03-02
author: en/mara-lindqvist
topic: en/craft
tags: ["astro", "zod", "content"]
cover: ../../../assets/covers/reef-collections-contrat.webp
coverAlt: "A sea turtle gliding over a coral reef, holding its line above the structure below"
featured: false
draft: false
---

The best bug report we got last year was a build failure. A writer had typed `topc: performance` in a frontmatter block, the build stopped, and the message named the file, the line and the expected key. Total cost: forty seconds. On the previous version of that site, the same typo produced a published page with no category, discovered five weeks later by someone auditing the sitemap.

That is the argument for schemas, and it is not really about types. It is about *when* you find out.

## The schema is a promise about shape

An Astro collection is two things: a loader that says where entries come from, and a schema that says what a valid entry looks like. Ours for this journal is about thirty lines:

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
        message: "updatedDate cannot be earlier than pubDate",
        path: ["updatedDate"],
      }),
});
```

Four of those lines are worth more than the rest put together.

### reference() turns a typo into a build error

`reference("authors")` does not just validate a string. It checks, at build time, that an entry with that id actually exists in the other collection. A misspelled author is not a page with a blank byline in production, it is a red terminal on the machine of the person who made the mistake, thirty seconds after they made it.

### image() prevents a whole class of layout shift

Declaring `cover: image()` hands Astro the file rather than a path. It gets optimised, and the intrinsic dimensions come back with it, so the template can write width and height and reserve the space before the bytes arrive. That is one of the two causes of layout shift on an article page. [The other one is the font swap](/blog/the-real-cost-of-a-web-font/), and it has its own fix.

### coerce.date() ends the string versus Date argument

YAML gives you a string or a date depending on quoting, timezone handling and the phase of the moon. `z.coerce.date()` gives you a `Date`, always, and a clear error when the value cannot become one. Every date formatting bug we used to have was really this bug wearing a hat.

### refine() is where the rules that are actually yours live

Types cannot express "revised before it was written". The `refine` above can, and it is the right place for every rule that is about your editorial process rather than about JavaScript.

> A schema is not documentation for the machine. It is the shortest possible list of things you are unwilling to publish.

## Three rules that keep it from becoming a CMS

The failure mode of a good schema is that it grows. Someone needs a wide layout for one post, so a `layout` field appears. Then `heroStyle`, then `showToc`, then `ctaVariant`, and eighteen months later the frontmatter is a configuration language with no documentation, no UI, and one user.

We hold the line with three rules.

1. **Frontmatter describes the content, never the page.** `topic` is content. `featured` is content, arguably. `heroStyle` is not: it describes rendering, and rendering decisions belong to the template where they can be changed once for every post at the same time.
2. **A field must be answerable by whoever writes the post.** If a writer cannot fill it in without asking a developer, it does not belong in frontmatter. It belongs in code, in config, or in a convention.
3. **A field earns its place by removing a decision, not by adding an option.** `draft: true` removes the decision "should I push this yet". `ctaVariant: "b"` adds one, forever, to every future post.

The third rule is the one that hurts, and it is the one that keeps the schema readable after two years.

## What we deliberately do not validate

Body content. We do not check heading order, we do not enforce a word count, and we do not lint prose in the schema. Frontmatter is structured data and belongs in Zod; a paragraph is not structured data and every attempt to pretend otherwise ends with a writer fighting a robot at eleven at night.

We also do not validate that exactly one post is featured, even though that is a real editorial rule. Zod sees one file at a time and cannot count the others, so the check lives where it can actually see the whole collection: the page that renders the feature slot takes the most recent one and ignores any extra. The rule is enforced by a place that has the information, which is a more general principle than it looks.

## Reading it back

Everything downstream is ordinary code, because the shape is already guaranteed:

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
  <p>By {author?.data.name}</p>
  <nav aria-label="On this page">
    <ul>
      {headings.filter((h) => h.depth === 2).map((h) => (
        <li><a href={`#${h.slug}`}>{h.text}</a></li>
      ))}
    </ul>
  </nav>
  <Content />
</article>
```

Note what is absent: no optional chaining on `pubDate`, no defensive check that `tags` is an array, no fallback title. The schema already made those impossible, so the template says what it means. That is the actual return on the thirty lines, and it compounds across every template that touches the collection.

## The migration you will eventually run

Schemas change, and the change is a small ceremony rather than a crisis. Add the field as optional, backfill the entries you care about, then make it required and watch the build tell you precisely which files you forgot. The failure list is exhaustive, it takes five seconds to produce, and it is the same list a database migration would have cost you a weekend to obtain.
