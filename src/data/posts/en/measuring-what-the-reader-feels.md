---
title: "Load time measured on the reader's phone, not in the lab"
description: "Lab tools measure a robot on fibre. Field data measures your readers on a bus. Here is the smallest honest setup we could build: three metrics, one endpoint, no third party script, and the week our two sets of numbers disagreed by two and a half seconds."
pubDate: 2026-05-05
updatedDate: 2026-06-30
author: en/noor-benali
topic: en/performance
tags: ["web vitals", "rum", "measurement"]
featured: false
draft: false
---

Last autumn a client's site scored 98 in Lighthouse and had a Largest Contentful Paint of 1.4 seconds on our test runs. The same site, in Chrome's field data, sat at 3.9 seconds at the 75th percentile. Both numbers were correct. They were answers to different questions, and only one of the questions was about the client's readers.

That gap is the reason we now install field measurement on every site we ship, before launch, as part of the build rather than as an afterthought.

## Two instruments, two jobs

| | Lab (synthetic) | Field (real users) |
| --- | --- | --- |
| Who is measured | One scripted visit | Everyone, on their own device |
| Network | Simulated, consistent | Whatever they have |
| Best at | Catching regressions, comparing two builds | Telling you what is actually happening |
| Blind to | Caches, consent banners, logged in states, geography | Anything nobody visited yet |
| Available | Before launch | After launch, with a delay |

The mistake is not using one of them. The mistake is believing that a good number from the first one is a claim about the second. Lab data is a controlled experiment: change one thing, see what moves. Field data is an observation of reality, and reality includes the reader who opened your article on a train, on a four year old phone, behind a consent banner, with a battery saver throttling their CPU.

## The three metrics worth collecting

Core Web Vitals are three numbers because three is roughly the number of independent things a reader can notice.

- **LCP** answers "did the main thing appear". Under 2.5 seconds at p75 is the published threshold; we target 2.0 to leave headroom.
- **INP** answers "did the page respond when I touched it". It replaced First Input Delay in March 2024 and it is much harder to fake, because it looks at every interaction of the visit rather than just the first one. Under 200 ms.
- **CLS** answers "did the page move while I was reading". Under 0.1, and the honest target is 0.

We collect nothing else in the first pass. Extra metrics are a way of avoiding the conclusion the first three already gave you.

## The smallest honest setup

No analytics vendor, no tag manager, one endpoint of our own. The whole client side is about twenty lines, using the [web-vitals](https://github.com/GoogleChrome/web-vitals) attribution build, which tells you not only that something was slow but which element was responsible:

```js
import { onCLS, onINP, onLCP } from "web-vitals/attribution";

const queue = [];

function record(metric) {
  const a = metric.attribution;
  queue.push({
    name: metric.name,
    // CLS is unitless, so store it scaled to keep the payload integer only.
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

### Four deliberate choices

Four decisions in there are deliberate.

`sendBeacon` rather than `fetch`, because it survives the page being closed and does not delay navigation. `visibilitychange` rather than `unload`, because `unload` is unreliable on mobile and disables the back forward cache, which would slow down the very readers we are trying to help.[^order] The `culprit` field, because "INP was 480 ms" starts an investigation and "INP was 480 ms on the topic filter button" ends one. And a sample rate, which is not in the snippet: on a site with real traffic we send from a random slice of sessions, because a hundred percent of visits is a lot of rows to learn nothing extra from.

[^order]: Ordering matters here. The web-vitals library registers its own `visibilitychange` listener when it is imported, and finalises pending values there. Since listeners run in registration order, importing the library before adding the flush listener is what guarantees the queue is full when the beacon leaves.

The server side is a handler that validates the shape, drops anything with an unknown metric name, and appends a row. Ours writes to a SQLite file and a small query aggregates the p75 per template per week. There is no dashboard product in this stack, and after two years there has been no moment where we wished for one.

---

## When lab and field disagree, the field is right

Back to the client with the 1.4 second lab score and the 3.9 second field number. The attribution data made the investigation short.

The LCP element in the field was the hero image, and its breakdown showed almost all the time in resource load delay rather than in the download itself. In other words the browser knew what to fetch and could not start. The cause was a consent management script loaded synchronously in the head, which took 600 ms to arrive, then wrote inline styles that hid the hero until a decision was made. Our lab runs never saw it: our test profile had already consented, and the script short circuited.

The second contributor was less dramatic and more common: eleven percent of the client's visits came in on an effective connection type of `3g`, from a region that was not on anyone's list of important markets and turned out to be their second largest source of orders. The p75 of the whole audience was being set by an audience nobody had looked at.

We moved the consent script to a deferred load with a reserved space for its banner, preloaded the hero, and served AVIF at three widths. Field LCP at p75 went from 3.9 to 2.1 seconds over the following four weeks, which is the lag inherent to a 28 day rolling window rather than a slow fix.

## Two checks that cost nothing

Before writing any code, spend five minutes with the public field data for the origin. If the site has enough traffic, Chrome already collected it:

```bash
curl -s "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin":"https://example.com","formFactor":"PHONE"}' \
  | jq '.record.metrics | to_entries[] | {(.key): .value.percentiles.p75}'
```

And keep the lab test in continuous integration, aimed at the [performance budget](/blog/a-performance-budget-that-survives-contact/) rather than at a score. The two instruments do different jobs: the lab tells you that this pull request made things worse, in a comparison you control. The field tells you whether the site is any good, in the only comparison that pays.

If you can only have one, take the field data. It is less convenient, it arrives late, it cannot be run on a branch, and it is the only one that has ever changed a client's mind.
