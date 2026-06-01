# The Brief — Welcome / Nurture Sequence

The email capture that feeds this sequence is now live on every page (footer "The Brief"
strip) and on the insights hub (`what-we-think.html`). Both POST to `/api/subscribe`
(Rust/SQLite `subscribers` table). This document is the sequence those subscribers enter.

It is grounded in the seven essays that already exist on the site, so it is sendable as-is —
no new long-form content required to launch.

---

## Sequence Overview

```
Sequence Name: The Brief — Welcome & Nurture
Trigger:       New row in `subscribers` (footer strip or insights-hub form)
Goal:          Move a cold subscriber to a booked briefing (contact.html)
Secondary:     Establish CausQ as the practitioner-grade voice on AI · networks · quantum security
Length:        5 emails over 16 days
Timing:        Day 0 (instant), Day 2, Day 5, Day 9, Day 16
Exit:          Books a briefing (moves to sales sequence) · unsubscribes · replies (route to human)
Audience:      Enterprise eng leaders / architects / CISOs across US & EMEA who opted in for insight,
               NOT yet a lead. Value before ask.
```

One email, one job. One primary CTA each. The "book a briefing" ask only earns its place
after three value emails.

---

## Email 1 — Welcome + deliver the promised value

```
Send:    Immediately on subscribe
Subject: You're in. Here's the one essay to read first.
Preview: The breach you won't see for a decade, and a no-drama plan for it.
```

Body:

Welcome to The Brief.

You'll get one considered email a month on the three forces reshaping the enterprise:
AI, the networks it runs on, and security in the quantum era. Written by the engineers
doing the work, not the marketing team.

Start here. It's the piece our readers forward most:

**Harvest now, decrypt later: the breach you won't see for a decade.**
Adversaries are already storing your encrypted data to crack once quantum computers mature.
Here's a pragmatic plan to become crypto-agile before the deadline finds you.

CTA: **Read the essay** → `article-harvest-now-decrypt-later.html`

No noise, and unsubscribe in one click whenever you like. Glad you're here.

— The CausQ team

---

## Email 2 — Expand the topic (establish range)

```
Send:    Day 2
Subject: The network is becoming AI's most demanding customer
Preview: Why most enterprise fabrics aren't ready for GPU-scale traffic.
```

Body:

Most AI conversations stop at the model. The harder problem is underneath it.

GPU-scale training and inference push traffic patterns the average enterprise network was
never designed for, lossless RDMA, 400G fabric, collectives that saturate links in bursts.
Get the fabric wrong and the most expensive compute in the building sits idle.

We wrote up what AI-scale workloads actually demand from the network beneath them, and the
three things to check before your next refresh:

CTA: **Read: the network as AI's workload** → `article-network-ai-workload.html`

Reply and tell me which of the three you're wrestling with. I read every response.

— The CausQ team

---

## Email 3 — Problem deep-dive (the insight that reframes their thinking)

```
Send:    Day 5
Subject: Why AI, network and security keep failing separately
Preview: Three programs, three budgets, three roadmaps, one stalled outcome.
```

Body:

Here's the pattern we see in nearly every stalled enterprise program:

AI is one initiative. Network modernization is another. Security is a third. Three teams,
three budgets, three roadmaps, often three vendors. Each is individually reasonable. Together
they compete for the same dollars and quietly cancel each other out.

The enterprises pulling ahead don't run them as three programs. They run them as **one
intelligent system**, where intelligence, connectivity and trust compound instead of
competing.

This essay lays out the operating model that makes that possible:

CTA: **Read: three programs, one system** → `article-three-programs.html`

— The CausQ team

---

## Email 4 — Proof + soft differentiation

```
Send:    Day 9
Subject: What "good" looks like, in numbers
Preview: 3× faster to production · 60% less network overhead · 99.99% uptime.
```

Body:

We're allergic to vague promises, so here's how our work tends to land on enterprise estates
across the US and EMEA:

- **3× faster** AI initiatives reaching production
- **60% reduction** in network operating overhead
- **99.99%** availability sustained on managed estates
- **Two continents** of follow-the-sun delivery

The difference isn't a tool. It's engineering the three forces as one system, with the
governance leadership can actually sign off on.

If you want the longer view on how that plays out in security specifically, this is the one
to read, Zero Trust treated as a way of running the network, not a box you buy:

CTA: **Read: Zero Trust isn't a product** → `article-zero-trust.html`

— The CausQ team

---

## Email 5 — The ask (briefing offer)

```
Send:    Day 16
Subject: 30 minutes with an engineer (no deck)
Preview: Pressure-test your environment. Leave with findings you can use.
```

Body:

You've now seen how we think about AI, networks and quantum-era security. If any of it
landed close to a problem you're carrying, here's the most useful next step.

Not a sales call. A **briefing**: thirty minutes with a senior CausQ engineer, the person
who'd actually do the work. We pressure-test your environment and show you exactly where the
needle moves. You leave with findings you can act on whether or not we ever work together.

- Direct to senior engineers, not a gatekeeper
- Actionable in the first call
- In your timezone, under your compliance regime (US & EMEA)

CTA: **Book a briefing** → `contact.html`

Not ready? Stay on The Brief, the next monthly issue is on its way.

— The CausQ team

---

## After the sequence

Subscribers who don't book roll into the **monthly Brief broadcast** (newsletter cadence).
Keep the remaining essays as broadcast fuel so the welcome series and the newsletter never
overlap:

- Building a cryptographic bill of materials → `article-cbom.html`
- NIS2, DORA and the year compliance got real (EMEA segment) → `article-nis2-dora.html`
- From boxes to fabric → `article-boxes-to-fabric.html`

**Segment tip:** the subscribe form has an optional `name` field and no region field. If you
later add a hidden region/source field (the contact form already captures region), you can
branch Email 4/5: EMEA subscribers get the NIS2/DORA essay as proof instead of the stats block.

---

## Metrics Plan

| Metric | Where | Target (B2B benchmark) |
|---|---|---|
| Confirmed opt-in rate | subscribe → welcome open | > 50% open on Email 1 |
| Welcome open rate | Email 1 | 45–60% (transactional-adjacent) |
| Nurture open rate | Emails 2–5 | 30–45% |
| Click rate to essays | Emails 1–4 | 8–15% |
| Briefing click rate | Email 5 | 3–6% |
| Sequence → briefing booked | end to end | 1–3% of subscribers |
| Unsubscribe rate | per send | < 0.5% |

Instrument by adding a `?utm_source=brief&utm_medium=email&utm_campaign=welcome&utm_content=eN`
query string to each CTA link so booked briefings can be attributed back to the sequence.

## A/B test ideas (per the cro + ab-testing playbooks)

- **Email 1 subject:** curiosity ("The breach you won't see for a decade") vs. direct
  ("Your first CausQ essay is inside").
- **Email 5 CTA copy:** "Book a briefing" vs. "Get a 30-min environment review".
- **Capture friction:** footer email-only (current) vs. email + optional name, measure
  subscribe completion against downstream personalization lift.
