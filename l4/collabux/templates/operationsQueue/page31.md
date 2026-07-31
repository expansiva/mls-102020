# operationsQueue — experience `cardTriageMobile` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, transitions — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A deck of work cards for an operator **on their feet, hands mostly busy, glancing at a
phone**: kitchen pass, warehouse floor, service round. Each queue item is one card that
carries everything needed to act on it; advancing its status takes **two touches on the
card itself** — no panel, no detail page. Where `workQueueSplit` is a seated desk with a
queue and a working panel, this is the queue AS the workspace. Target: status advanced in
under five seconds, one thumb, without losing the place in the deck.

## How to instantiate from the defs (the slots)

- **The deck is the list query, one card per item**: identity large and readable at arm's
  length, the urgency fact (due time, priority) prominent, current status as a chip. Cards
  stack vertically; touch targets one step larger than desktop default.
- **Status chips above the deck are the only filter** — one chip per declared status (plus
  an "all" when useful), single row, horizontally scrollable if needed. Tapping a chip
  refilters the deck in place. Never invent statuses or counts the contract does not
  declare.
- **Each card shows exactly one primary transition**: the natural next step for its
  current status as declared by the contract's transitions ("Start", "Complete") —
  verb-first, outcome-named, big enough for a gloved thumb. First touch arms it, second
  touch on the visible confirmation commits it; remaining valid transitions (pause,
  cancel) live behind one quiet overflow control on the card.
- **Progress is inline on the card** when the contract exposes it (elapsed time, items
  done of total) — a thin quiet indicator, not a chart.
- **Session/context inputs never render as fields**: who is acting is known; show it at
  most once as a quiet caption above the deck. Ids are never typed — the card IS the
  target.

## Attention hierarchy (the spine of this experience)

1. The top card of the current filter — the next thing to do.
2. Each card's primary transition — the one obvious act.
3. Status chips — the lens for switching lanes.
4. Overflow actions and captions, demoted.

## Loops

- Glance at the deck → tap the primary action → confirm on the second touch → the card
  animates to its new status (changing chips, or leaving the current filter) → the next
  card is already under the thumb. Zero navigation, zero typing in the happy path.
- Transitions requiring an input by contract (a cancel reason) expand the card in place to
  collect it — the deck stays behind, nothing navigates.
- Refiltering by chip keeps the deck's rhythm: same card anatomy, same actions, new lane.

## Feedback & feedforward

- The armed state is unmistakable feedforward: the button plainly shows what the second
  touch will do, and disarms by itself if abandoned.
- While a transition runs, only that card locks and shows a running state; the rest of the
  deck stays live.
- Failure lands inside the failed card, in normal body color, with retry — never a toast,
  never at the top of the page.
- Success is the card's own movement (chip change or exit from the lane); no page banner,
  no blocking dialog.
- An empty lane says once, quietly, what will appear there — never placeholder cards.

## Disciplines (transversal — always)

- The page name appears once, in the header; cards never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: chips filter, the primary button
  transitions, and nothing on a card both opens and acts.
- Link color only on real links; status and progress use muted or semantic tones, never
  link color.
- Alarm color only on genuinely late/critical facts; a deck that is all red ranks nothing.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A master list with a separate working panel, or any two-region split — that is the
  `workQueueSplit` experience, not this one.
- Detail pages or drill-down navigation to perform a transition; the card is the
  workspace.
- Desktop-dense rows, hover-revealed actions, or touch targets that shrink on narrow
  screens — this page is built thumb-first.
- More than one primary action visible per card; invalid transitions shown as disabled
  ghosts.
- Typed ids or free-typed fields for anything the defs marks as selection/session/context.
- Page-level toasts for validation, blocking success dialogs, redirects after a
  transition; inventing metrics, statuses or progress the contract does not declare.
