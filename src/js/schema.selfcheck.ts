// src/js/schema.selfcheck.ts - self-check des constructeurs JSON-LD, sans framework.
// Lancer : node src/js/schema.selfcheck.ts
// (Node 22.18+ execute le TypeScript directement ; avant, ajouter --experimental-strip-types.)
//
// L'identite du jeu d'essai est volontairement neutre : Example Studio,
// example.com, Example Author. Ce fichier est le meme dans les cinq themes de
// la maison, et il portait la marque de demonstration de l'un d'eux. Un
// acheteur qui ouvrait le sien y lisait donc le nom d'un produit absent du
// theme achete. Un jeu d'essai n'appartient a aucun theme : il ne nomme ni un
// produit reel, ni la demonstration d'un voisin.
import assert from "node:assert/strict";
import {
  article,
  breadcrumbList,
  faqPage,
  organization,
  softwareApplication,
  website,
} from "./schema.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// organization : les champs absents disparaissent, ils ne trainent pas en undefined.
const org = organization({ name: "Example Studio", url: "https://example.com/" });
is(
  org,
  { "@context": "https://schema.org", "@type": "Organization", name: "Example Studio", url: "https://example.com/" },
  "organization stays minimal without optional fields",
);
is(
  organization({ name: "Example Studio", url: "https://example.com/", sameAs: ["https://x.com"] }).sameAs,
  ["https://x.com"],
  "organization keeps its social profiles",
);

// website : forme exacte.
const site = website({ name: "Example Studio", url: "https://example.com/", description: "A demonstration site, used here as a fixture." });
is(
  site,
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Example Studio",
    url: "https://example.com/",
    description: "A demonstration site, used here as a fixture.",
  },
  "website carries name, url and description",
);

// article : dates normalisees, noeuds imbriques sans @context.
const post = article({
  title: "A title the fixture can assert on",
  description: "How the fixture exercises every builder.",
  url: "https://example.com/blog/reading-the-room/",
  datePublished: new Date("2026-05-04T08:00:00.000Z"),
  authorName: "Example Author",
});
is(post["@type"], "Article", "article declares its type");
is(post.datePublished, "2026-05-04T08:00:00.000Z", "a Date is converted to ISO 8601");
is(post.mainEntityOfPage, post.url, "mainEntityOfPage mirrors the canonical url");
is(post.author, { "@type": "Person", name: "Example Author" }, "author is a nested Person without @context");
assert.ok(!("dateModified" in post), "an absent dateModified is not serialized");
assert.ok(!("publisher" in post), "an absent publisher is not serialized");
checks += 2;
is(
  article({
    title: "t",
    description: "d",
    url: "https://example.com/blog/t/",
    datePublished: "2026-05-04",
    authorName: "Example Author",
  }).datePublished,
  "2026-05-04",
  "a preformatted date string passes through untouched",
);

// faqPage : une paire Question/Answer par entree.
const faq = faqPage([
  { question: "Does this fixture cover every builder?", answer: "Yes, all six." },
  { question: "Is there a free plan?", answer: "Yes, up to three seats." },
]);
is(
  faq.mainEntity,
  [
    {
      "@type": "Question",
      name: "Does this fixture cover every builder?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, all six." },
    },
    {
      "@type": "Question",
      name: "Is there a free plan?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, up to three seats." },
    },
  ],
  "faqPage maps every entry to a Question with its Answer",
);

// breadcrumbList : positions 1-based, ordre conserve.
const trail = breadcrumbList([
  { name: "Home", url: "https://example.com/" },
  { name: "Blog", url: "https://example.com/blog/" },
]);
is(
  trail.itemListElement,
  [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://example.com/" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://example.com/blog/" },
  ],
  "breadcrumb positions are 1-based and ordered",
);

// softwareApplication : les defauts s'appliquent, un prix de zero survit a compact().
const app = softwareApplication({
  name: "Example Studio",
  description: "A demonstration site, used here as a fixture.",
  url: "https://example.com/",
  price: 0,
});
is(app.applicationCategory, "BusinessApplication", "applicationCategory defaults sensibly");
is(app.operatingSystem, "Web", "operatingSystem defaults to Web");
is(app.offers, { "@type": "Offer", price: 0, priceCurrency: "USD" }, "a price of zero survives, free plans are real");
assert.ok(!("aggregateRating" in app), "no rating block without both value and count");
checks += 1;
assert.ok(
  !(
    "aggregateRating" in
    softwareApplication({ name: "Example Studio", description: "d", url: "https://example.com/", ratingValue: 4.8 })
  ),
  "a rating value alone is not enough for an AggregateRating",
);
checks += 1;

// Contrat commun : chaque noeud porte le @context racine et survit tel quel a JSON.
for (const node of [org, site, post, faq, trail, app]) {
  is(node["@context"], "https://schema.org", `every node declares the schema.org context (${node["@type"]})`);
  is(JSON.parse(JSON.stringify(node)), node, `every node survives a JSON round-trip unchanged (${node["@type"]})`);
}

console.log(`schema self-check: ${checks} assertions passed`);
