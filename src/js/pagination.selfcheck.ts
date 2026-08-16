// src/js/pagination.selfcheck.ts - self-check de la pagination pure, sans framework.
// Lancer : node src/js/pagination.selfcheck.ts
// (Node 22.18+ execute le TypeScript directement ; avant, ajouter --experimental-strip-types.)
import assert from "node:assert/strict";
import { buildPageHref, paginate } from "./pagination.ts";

let checks = 0;
function is(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  checks += 1;
}

// Sept elements par trois : la derniere page est partielle.
const source = ["a", "b", "c", "d", "e", "f", "g"];
const pages = paginate(source, 3);
is(pages.length, 3, "seven items in threes make three pages");
is(pages[0]?.items, ["a", "b", "c"], "page 1 carries the first three items in order");
is(pages[2]?.items, ["g"], "the last page keeps the remainder");
is(pages[1]?.page, 2, "pages are numbered from 1");
is(pages[1]?.totalPages, 3, "every page knows the page count");
is(pages[1]?.totalItems, 7, "every page knows the item count");
is([pages[1]?.start, pages[1]?.end], [4, 6], "start and end are 1-based positions");
is([pages[0]?.isFirst, pages[0]?.isLast], [true, false], "page 1 is first, not last");
is([pages[2]?.isFirst, pages[2]?.isLast], [false, true], "the last page is last, not first");
is([pages[0]?.prev, pages[0]?.next], [null, 2], "page 1 has no prev and points to page 2");
is([pages[2]?.prev, pages[2]?.next], [2, null], "the last page has no next");
is(
  pages.flatMap((page) => page.items),
  source,
  "the pages reassemble into the original list",
);
is(source.length, 7, "the input list is never mutated");

// Division exacte : pas de page fantome au bout.
const even = paginate([1, 2, 3, 4], 2);
is(even.length, 2, "an exact division makes no extra page");
is([even[1]?.start, even[1]?.end], [3, 4], "the last page of an exact division ends on the total");

// Liste vide : une page vide, la route de tete existe toujours.
const empty = paginate([], 5);
is(empty.length, 1, "an empty list still yields one page");
is(empty[0]?.items, [], "that page carries no items");
is([empty[0]?.start, empty[0]?.end], [0, 0], "start and end are 0 on an empty page");
is([empty[0]?.isFirst, empty[0]?.isLast], [true, true], "the empty page is both first and last");
is([empty[0]?.prev, empty[0]?.next], [null, null], "the empty page has no neighbors");
is(empty[0]?.totalItems, 0, "totalItems is 0 for an empty list");

// Tailles invalides : on echoue fort, jamais en silence.
assert.throws(() => paginate([1], 0), RangeError, "a size of 0 throws");
assert.throws(() => paginate([1], -2), RangeError, "a negative size throws");
assert.throws(() => paginate([1], 2.5), RangeError, "a fractional size throws");
checks += 3;

// buildPageHref : page 1 a la racine, les suivantes en dessous, slash final partout.
is(buildPageHref("/blog", 1), "/blog/", "page 1 lives at the base path with a trailing slash");
is(buildPageHref("/blog", 2), "/blog/2/", "page 2 lives under the base path");
is(buildPageHref("/blog/", 3), "/blog/3/", "a trailing slash on basePath does not double up");
is(buildPageHref("/blog///", 5), "/blog/5/", "extra trailing slashes are normalized");
is(buildPageHref("", 1), "/", "an empty basePath means the site root");
is(buildPageHref("", 4), "/4/", "root pagination lives directly under /");

// Numeros de page invalides : memes garde-fous que paginate.
assert.throws(() => buildPageHref("/blog", 0), RangeError, "page 0 throws");
assert.throws(() => buildPageHref("/blog", -1), RangeError, "a negative page throws");
assert.throws(() => buildPageHref("/blog", 1.5), RangeError, "a fractional page throws");
checks += 3;

// Contrat croise : les urls de la fenetre de pagination couvrent toutes les pages.
is(
  paginate(source, 3).map((page) => buildPageHref("/blog", page.page)),
  ["/blog/", "/blog/2/", "/blog/3/"],
  "paginate and buildPageHref agree on the full url set",
);

console.log(`pagination self-check: ${checks} assertions passed`);
