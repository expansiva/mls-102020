# approvalWorkflow — experience `decisionQueue` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, transitions, fields — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An **inbox of pending decisions, cleared without leaving the list**. Every pending
request is a card carrying just enough facts to decide the easy cases; approve and reject
sit on the card; a decided card leaves the queue and the next one takes its place. The
page's success is its own shrinking — inbox zero is the designed destination. Where
`readAndDecide` slows one consequential decision down, this page keeps many routine
decisions moving. Target: a clear-cut request decided in seconds, in place, and the hard
ones recognized fast and sent to deeper reading.

## How to instantiate from the defs (the slots)

- **The queue is the pending-items query**: one card per request, oldest or most urgent
  first as the contract's ordering declares. Each card carries the *minimum decisive
  set*: who asks, for what, the one or two values the decision hinges on (amount, dates)
  — right-aligned, tabular when numeric. No narrative body, no trail on the card.
- **A queue headline above the cards**: one sentence computed from the queue ("7 requests
  waiting") — text, not a tile.
- **Inline outcomes come from the declared transitions**: approve and reject (and only
  what the contract declares) as compact controls on each card, outcome-named. Reject
  expands the card in place to collect the required reason before its button enables —
  the list never navigates.
- **The card's identity is a drill-down link** for the cases too big to decide from a
  card — that link is the exit toward full reading, and the only navigation here.
- **Session/context inputs never render as fields**: the approver is known; show it at
  most once as a quiet caption. Ids are never typed — the card is the target.
- Filters (by type, by requester) appear only if the contract declares such inputs, as
  one quiet row of chips above the queue.

## Attention hierarchy (the spine of this experience)

1. Queue headline — how much is waiting, one sentence.
2. The first card — the next decision, facts and outcomes together.
3. The remaining cards, uniform, in the contract's order.
4. Filters and captions, demoted.

## Loops

- Read a card → decide on it → the card leaves the queue with a brief exit → the headline
  count drops → the next card is already in position. The loop repeats with zero
  navigation and no scroll jumps.
- Too complex for a card? Drill into the identity link, decide in the full record, come
  back to a shorter queue holding its scroll position.
- **The empty queue is the designed victory state**: one calm sentence ("Nothing waiting
  for your decision"), no illustration circus, no redirect. It must feel earned.

## Feedback & feedforward

- The reject reason validates at the field, in words, before its button enables; buttons
  name outcomes ("Approve", "Reject"), never "OK" or "Submit".
- While one card's decision runs, only that card locks and shows a running state; every
  other card stays decidable.
- Failure renders inside the failed card, in normal body color, with retry — the queue
  and the other cards stay untouched, and an entered reason is never lost.
- Success is the card's own exit plus the headline decrementing — no page banner, no
  blocking dialog, no toast.
- Alarm color only on facts the contract flags (over threshold, overdue) — never as row
  decoration, never on the reject control by default.

## Disciplines (transversal — always)

- The page name appears once, in the header; the headline and cards never repeat it, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the identity link navigates, the outcome
  buttons decide, and neither borrows the other's role.
- Link color only on the drill-down identity link; facts and captions are muted.
- One consistent card anatomy for the whole queue; a decided card never lingers as a
  grayed ghost.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the headline, the minimum decisive set on each card, the inline outcomes,
the card that leaves, the drill-down for hard cases, inbox zero and the disciplines. On a phone the
queue is cleared with the thumb, one card at a time, so each card must fit on the screen with its
outcomes. Where this section and the layout described above differ, this section wins on mobile.

- **The headline, then the cards in one column**, in the contract's order. Declared filter chips sit
  under the headline in one row that wraps.
- **Each card fits on one screen**: who asks and for what (the identity link), then the one or two
  decisive values, large, with unit; then approve and reject at the card's foot, large, each
  labeled with its outcome. Facts and outcomes always travel together.
- **Reject expands the card in place** with the required reason field; the field and its button
  stay above the keyboard, and the button enables once the reason is valid.
- **A decided card leaves** with a brief exit; the next card moves up into the same place, under
  the thumb, and the headline count drops. No scroll jump.
- **Hard ones go to deeper reading**: the card's identity link is the "open to read" exit to the
  full record. Back returns to the queue at the same scroll place, shorter if it was decided there.
- **Inbox zero**: the calm sentence takes the first screen; nothing else to look at.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the headline, 2. the first card and its outcomes, 3. the remaining
cards, 4. the filter chips.

Forbidden on mobile:
- cards side by side, a sideways carousel of cards, or any horizontal scroll;
- swipe gestures that decide — every decision is a labeled tap;
- a card taller than the screen, whose outcomes need scrolling to reach;
- confirmation dialogs on routine approvals, or a bar that decides several cards at once.

## Forbidden

- Rendering one request's full narrative and trail with the decision at the end of a
  reading path — that is the `readAndDecide` experience, not this one.
- Confirmation dialogs on routine approvals; the inline decision IS the deliberate act
  (the reject reason is its own guard).
- Cards demanding scroll to reach their own outcome buttons; facts and decision always
  travel together.
- Selecting multiple cards for a bulk verdict unless the contract explicitly declares a
  bulk command.
- Typed ids for the request, the requester, or anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; redirects after deciding; inventing facts,
  counts or orderings the contract does not declare.
