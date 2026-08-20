---
title: "Writing HTML that ages well"
description: "We rebuilt a site we first shipped in 2016, and the markup that survived was never the clever markup. What holds up: elements chosen for meaning, state left where the browser can see it, and a hard limit on what a class name is allowed to know."
pubDate: 2025-09-16
author: en/mara-lindqvist
topic: en/craft
tags: ["html", "semantics", "maintenance"]
cover: ../../../assets/covers/reef-html-qui-vieillit.webp
coverAlt: "Cliffs under dense green cover dropping into a turquoise sea, in veiled morning light"
featured: false
draft: false
---

We spent August rebuilding a site the studio first shipped in 2016. Nine years, four design directions, two CMS migrations, one framework the client no longer wants to name. Before deleting anything I went through the old templates line by line, because a rebuild is the only honest code review you ever get: the code has already been judged by time, and all you have to do is read the verdict.

The verdict was not flattering to my younger self, but it was consistent. Everything clever died. The plainest markup was still there, still working, and in two cases had quietly gained features I did not write.

## Elements are an interface, not decoration

An HTML element is a contract with three parties at once: the rendering engine, the accessibility tree, and whoever opens the file in 2034. Picking `div` for everything breaks all three contracts to save four characters.

The clearest example in the old codebase was a set of FAQ accordions built in 2016 out of divs, a click handler, a boolean in a component's state, and roughly ninety lines of ARIA that were wrong in two places. It worked. It also had to be rewritten every time the site changed stacks, because the behaviour lived in the framework, not in the document.

### The details element earned its keep

The replacement is markup a client could edit:

```html
<section>
  <h2 id="faq">Common questions</h2>

  <details name="faq" open>
    <summary>Do you work with existing design systems?</summary>
    <p>Usually yes. We audit the tokens first and tell you what is
       missing before we touch a component.</p>
  </details>

  <details name="faq">
    <summary>How long does a rebuild take?</summary>
    <p>Six to ten weeks for a marketing site of this size, including
       content migration.</p>
  </details>
</section>
```

Keyboard support, screen reader announcements, find in page, and the print stylesheet all come free. The `name` attribute is the part that surprised the team: give several `details` the same name and the browser closes the others when one opens, which is exactly the exclusive accordion we used to hand-roll. It is [in the HTML standard](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element) and supported across current browsers, so the ninety lines of ARIA became zero lines of anything.

The same logic applies further up the page. A modal is `<dialog>` with `showModal()`: focus moves into it, the background goes inert, Escape closes it, and `::backdrop` is styleable. A site search wrapper is `<search>`. A publication date is `<time datetime="2025-09-16">`, which is what lets a feed reader, a rich result and a sort function agree on what "September" means. None of these are new. Most of them predate the JavaScript we wrote to replace them.

## State the browser already owns

The second thing that aged badly was state we kept in variables the document could not see.

When a checkbox is checked, the browser knows. When a `details` is open, the browser knows, and `:open` will style it. When a form is invalid, `:user-invalid` knows, and it waits until the user has actually finished typing before it says so, which is politeness we used to implement with timers. With `:has()`, a parent can respond to any of it without a single line of script:

```html
<label>
  <input type="checkbox" name="terms" required>
  I have read the terms
</label>
```

```css
form:has(input[name="terms"]:not(:checked)) [type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}
```

That rule is not more elegant than the JavaScript it replaces. It is more durable, which matters more. It survives a rewrite of the component layer, it runs before hydration, and it cannot get out of sync with the DOM because it *is* the DOM.

> If the browser has an opinion about how something should behave, it is usually a better opinion than mine, and it is certainly better maintained.

The exception is real: some interactions have no element. Combo boxes, drag reordering, and anything with a virtualised list still need code, and pretending otherwise produces worse accessibility, not better. The rule is not "never write JavaScript". The rule is that JavaScript should start where the platform stops, and you should be able to say out loud where that line is.

---

## What a class name is allowed to know

The third lesson was about naming, and it cost us the most time in the rebuild.

Class names that described what something *looked like* were all dead: `card--wide`, `text-blue`, `mt-40`, `sidebar-right`. Every one of them became a lie the first time the design changed, and a lie in a class name is worse than no name at all, because you cannot grep for it safely. You end up with a `sidebar-right` that renders on the left and a `card--wide` used for the narrow variant, and now nobody dares delete either.

Class names that described what something *was* mostly survived: `article-meta`, `topic-badge`, `field-error`. The design moved under them twice and the names stayed true, because they were never making a claim about pixels.

### A test that takes ten seconds

Read the class name out loud, then ask: if the designer changed their mind tomorrow about how this looks, would the sentence still be true? `field-error` passes. `text-red` fails. This is the whole rule, and it is the difference between a stylesheet you can refactor and one you can only add to. The corollary is that utility classes are fine precisely because they are not names: `p-4` never claimed to be a concept, so it never becomes a stale one. What ruins a codebase is the middle layer, the half-semantic name that encodes last year's layout and gets copied into eleven templates before anyone notices.

## What actually survived from 2016

Three things, in the end. The form markup, because it was plain and the browser did the work. The heading structure, because we had written it for a reader instead of for a search engine, and readers have not been deprecated. And a print stylesheet nobody has looked at in nine years, which still produces a decent PDF of every article page, because it was forty lines of CSS attached to semantic elements rather than to a component tree.

Everything else was replaced. That ratio does not depress me. It is roughly the ratio you should expect, and the useful conclusion is not "write less code", it is "know which layer you are writing in". The document layer outlives the style layer, which outlives the behaviour layer, which outlives the build tooling by a comfortable margin. Put your decisions in the deepest layer that can carry them, and the next rebuild will read your work as a favour rather than an obstacle.
