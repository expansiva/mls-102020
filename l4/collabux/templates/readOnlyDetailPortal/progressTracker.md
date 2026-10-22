# readOnlyDetailPortal — experience `progressTracker`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The record is read as a journey, the way a parcel is tracked: **where it is now, what has already
happened, and what comes next** — one vertical timeline of milestones with the current one
standing out. A stakeholder does not want the record's contents first; they want to know how far
along it is and when it will be done. Where `summaryFirstStatement` leads with one giant value and
`printableDocument` renders the formal sheet, this page answers **"where is it, and what happens
next?"** Zero write actions; the timeline is a reading surface. Target: a client or requester
following an order, a request, a case or a project from outside, often from a link in a message.

## How to instantiate from the defs (the slots)

- **The current stage comes from the record's status**: the status field the contract declares
  becomes the headline in plain words ("Out for delivery", "Under review"), large, at the top, with
  the moment it was reached when the contract provides it.
- **Milestones come from the contract, never from imagination**: the ordered values of the status
  enumeration, a list of events or history the query returns, or dated fields of the record
  (created, approved, shipped, delivered). Each milestone shows its label, its date when present,
  and one short note when the contract carries one.
- **Three states per milestone, visually distinct**: done (filled marker, date), current (larger
  marker, emphasized, the headline repeated in small), and upcoming (hollow marker, muted, its
  expected date only when the contract declares one). A state the contract marks as exceptional
  (rejected, on hold, cancelled) is shown at the current milestone in alarm color, only on it.
- **Degrade when there is no ordered path**: if the contract exposes a status without an order and
  without events, the timeline shows only the reached milestones it can date, then the current
  status; no invented upcoming steps. With no status at all, the page shows the record's facts as a
  quiet list and says once that progress is not available.
- **Record facts follow the timeline**: identity, parties, reference numbers, as a compact muted
  block of label and value pairs — context, not the show.
- **Actions only as declared** (acknowledge, print): one contextual control after the timeline,
  labeled with its outcome. No command in the contract means no buttons.

## Attention hierarchy (the spine of this experience)

1. The current stage — the headline in words, with its moment.
2. The next milestone — what to expect, and when if known.
3. The past milestones — what has happened, dated.
4. Record facts and declared actions.

## Loops

- Open → read where it is → glance at what is next → leave; or come back later and see the marker
  has moved. The page succeeds when the question "where is it?" is answered without scrolling.
- Freshness is stated once under the headline ("updated 10:40") when the contract provides it;
  no live ticker, no auto-refresh animation.

## Feedback & feedforward

- Loading: the timeline's spine with hollow markers first, labels after — the shape of a journey
  before its data.
- If the record fails, one sentence in normal body color with retry where the headline would be.
- A finished journey is a calm, complete state: all markers filled, the headline in words ("Delivered
  on 14 March"), no upcoming section.
- Acknowledge (when declared) is disabled until loaded; success replaces it with a quiet
  confirmation and the moment it happened.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; milestone labels are data, not headings.
- A control is navigation OR action, never both; almost nothing here is either — passive text is
  muted, link color only on real links.
- Dates follow one format throughout; relative words ("today", "2 days ago") only next to the
  absolute date, never instead of it.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the timeline is in the contract's order.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, raw status
  codes) is never rendered as visible text — statuses speak in business words.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the current stage first, the vertical timeline of done, current and
upcoming, honest degradation, zero writes, feedback and disciplines. A vertical timeline already
fits a phone; only spacing and the facts block change. Where this section and the layout described
above differ, this section wins on mobile.

- **The headline fits the first screen**: the current stage in words and its moment, then the next
  milestone right under it, before any past milestone.
- **The timeline is one vertical line** at the left edge, markers on it, label and date to the
  right, wrapping when long; past milestones below the current one fold to the three most recent
  with one "show full history" control that expands in place.
- **Record facts** follow as one label and value pair per row, muted.
- **A declared action** is one full-width control after the timeline, where the thumb reaches.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the current stage, 2. the next milestone, 3. the recent past,
4. the record facts.

Forbidden on mobile:
- a horizontal stepper or a timeline that scrolls sideways;
- the facts block above the timeline;
- dates or labels truncated;
- a sticky action bar over the headline.

## Forbidden

- One giant value (total, balance) as the headline with a breakdown below — that is the
  `summaryFirstStatement` experience, not this one.
- A formal document sheet with letterhead, tabulated body and footer — that is the
  `printableDocument` experience, not this one.
- Invented milestones, expected dates, percentages complete or ETAs the contract does not declare.
- A horizontal progress bar with a percentage as the only representation of progress.
- Any write affordance, editable-looking field, or action beyond the declared commands.
- Tabs, filters or pagination; steps that the reader must click through.

## Signals (how to check the generated page)

1. **S1 Current stage on top:** the first content under the header is the current status in words.
2. **S2 Vertical timeline:** milestones render on one vertical line with visibly distinct done,
   current and upcoming (or only done and current when no order exists) markers.
3. **S3 No writes:** no form fields or edit controls; at most the declared acknowledge/print.
4. **S4 Facts after:** the record's reference facts render below the timeline, not above it.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "timeline",
    "steps": "vertical",
    "expand": "collapsible"
  },
  "groups": {
    "prefer": ["groupViewData"],
    "forbid": ["groupNavigateSection"]
  }
}
```
