---
title: "A performance budget that survives contact with a client"
description: "A budget is not a Lighthouse score and it is not a Slack message. Here is the one we now write into the contract: four numbers, the device they are measured on, and the sentence that decides what happens when someone asks for a video header in week nine."
pubDate: 2025-10-21
updatedDate: 2026-02-10
author: en/noor-benali
topic: en/performance
tags: ["performance", "budgets", "process"]
cover: ../../../assets/covers/reef-budget-performance.webp
coverAlt: "A turquoise wave drawing itself up, its translucent crest backlit under a veil of white spray"
featured: false
draft: false
---

Every studio says it cares about performance. Almost none of them can tell you, before the project starts, what number would make them refuse a feature. That gap is the whole problem: without a threshold agreed in advance, "fast" is a taste, and taste loses every argument against a marketing department.

We started writing performance budgets into the statement of work in 2023. They have failed twice, which taught us more than the times they worked.

## The four numbers

A budget with nine metrics is a wish list. Ours has four, and each one exists because it protects a different person.

| Metric | Target | Protects |
| --- | --- | --- |
| Largest Contentful Paint | 2.0 s at p75[^p75] | The reader deciding whether to stay |
| Interaction to Next Paint | 200 ms at p75 | Anyone who taps a menu on a cheap phone |
| Cumulative Layout Shift | 0.05 | The reader who just lost their place |
| Page weight, article template | 180 KB compressed | The client, from us |

The last row is the one clients ask about, and it is the one we care about most. The three Core Web Vitals are outcomes: they move for reasons you do not fully control, including the CDN, the visitor's network and the phone in their pocket. Page weight is an input. It is the number the team actually sets, every day, with every decision, and it is the only one you can check without deploying anything.

[^p75]: p75 means the 75th percentile of real visits: three out of four readers get that experience or better. Chrome's field data aggregates it over a rolling 28 day window, which is also why a fix you shipped last Tuesday does not show up in the report yet.

## The device is part of the number

A target without a device is not a target. "LCP under two seconds" measured on a MacBook on office fibre is a statement about our office, not about the site.

We measure on a mid range Android phone from three years ago, on a throttled connection, and we say so in writing. In practice that means CPU throttling around 4x and a network profile close to slow 4G, which is what Lighthouse's mobile preset simulates by default. The first time a client sees their own site under those conditions, the meeting changes character entirely. Nobody needs convincing after that, and no slide deck has ever done the same job.

## Writing it down where the build can read it

A budget nobody automates is a budget that expires quietly around week six. Ours lives in a file:

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

Sizes are in kibibytes, timings in milliseconds, and the file is understood directly by the Lighthouse CLI:

```bash
npx lighthouse "https://staging.example.com/journal/first-post/" \
  --budget-path=./perf/budget.json \
  --form-factor=mobile \
  --output=json --output-path=./perf/report.json \
  --chrome-flags="--headless=new"
```

The run happens on every pull request that touches templates, and the job fails on a budget violation rather than on a score. Scores are a weighted composite that changes between Lighthouse versions; a budget is a promise with a unit attached. When the number moves, the pull request tells you which resource type moved it, and that conversation takes two minutes instead of an afternoon.

## The clause that does the actual work

Automation catches regressions. It does not answer the political question, which always arrives around week nine and always sounds reasonable. The contract answers it:

1. **The budget is a fixed quantity, not a target.** Nobody is asked to be under it on average.
2. **New weight requires equivalent weight to leave.** A 90 KB video header is fine if 90 KB of something else goes, and the client picks what.
3. **Third parties count as ours.** An analytics tag, a chat widget and a consent manager are three of the four allowed third parties, so the fourth is a decision, not an accident.
4. **A violation is a release blocker, not a ticket.** The site ships slow or it ships later. There is no third option and no backlog to hide it in.

The point of writing this down is not legal leverage. We have never invoked it in anger. Its real function is that it moves the argument from week nine, when the budget is spent and everyone is tired, to week zero, when it is an abstract discussion between adults who still like each other.

## Where our budgets failed

Twice, and both times for the same reason: the site left our hands.

### The tags nobody was watching

The first failure was a client whose marketing team added six tags through a tag manager the month after launch. Page weight tripled. Nothing in our process was even watching, because our automation ran on pull requests, and there were no pull requests. Now the same Lighthouse run happens weekly against production on a schedule, and the report goes to the client's inbox, not ours.

### The four megabyte photograph

The second was a content problem dressed as an engineering problem. An editor uploaded a 4.2 MB photograph through the CMS, which resized it politely for display and served the original anyway on the article page, because the template asked for the source. That is our bug, not theirs, and the fix was a pipeline that makes the wrong thing impossible: uploads are transcoded to AVIF and WebP with explicit dimensions, and the template cannot reference an original file at all.

Both failures share a shape worth naming. A budget protects the code you write. It does nothing about the content and the tags that arrive later, which is where the weight actually accumulates over a site's life. If you write only one automated check after launch, do not make it a synthetic test of your own template. Make it a weekly run against the live page, on the phone your readers really use, sent to the person who can say no.

## What it costs

An afternoon at the start of the project, a CI job of about thirty lines, and the discipline to let a build fail on a Friday. In exchange you get a site that is still fast at the end of the engagement, which is the only measurement anyone outside the team ever makes.
