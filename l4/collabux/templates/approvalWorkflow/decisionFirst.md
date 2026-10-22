# approvalWorkflow — experience `decisionFirst`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**Act first, read only if you need to.** The record under review opens with its outcome
already in front of the reviewer: identity, the one decisive value, and the decision
buttons, all on the first screen — the facts, the narrative and the trail follow BELOW, as
evidence the reviewer may consult, never as a gate. Where `readAndDecide` makes the reviewer
read down to a decision at the end, and `decisionQueue` decides many requests inline on
cards in a shrinking list, this page holds one record at a time and inverts its reading
order: decision on top, reading underneath. Built for the reviewer who usually already
knows — a manager who recognizes the request at a glance. Target: the common case is one
glance and one click; the uncommon case scrolls down and finds everything.

## How to instantiate from the defs (the slots)

- **The record is the main object query**, resolved from context (a notification, a link,
  a related list). Opened cold with nothing carried, the page shows the contract's picker
  for the record in full and keeps the decision row inert until one is chosen.
- **The top of the record, in this order:**
  1. *a status band* — a full-width band across the record's top edge with the current
     status in words, using the design system's status tokens; not a small chip;
  2. *the identity line* — who asks, for what, and the ONE decisive value the contract
     exposes (amount, date, quantity) large beside it, with its unit;
  3. *the decision row* — the declared decision commands (approve, reject, request
     changes — only what the contract declares) as large buttons in one row, labeled by
     outcome, the contract's primary path first. Nothing preselected.
- **Below the decision row, the evidence**: the remaining facts, the narrative (description,
  line items), and the trail (comments, history) — quiet, chronological where it applies.
  This is reference, never a precondition for the buttons.
- **A reason the contract requires** (reject, request changes) opens inline right under
  the decision row, still at the top; its button enables once the reason is valid.
- **When the contract also declares a collection of pending requests**, it renders as a
  board of cards (identity, decisive value, status band) — never a table — and opening a
  card raises the record as an overlay above the board (a drawer on desktop). Cards
  never carry the decision buttons themselves.
- Session/context inputs never render as fields — the reviewer is known; ids are never
  typed, the record comes from context or the picker.

## Attention hierarchy (the spine of this experience)

1. The decision row — the outcomes, on the first screen, always.
2. The identity line and its decisive value — enough to decide the common case.
3. The status band — where the record stands, in color and words.
4. The evidence below — facts, narrative, trail, consulted on demand.

## Loops

- Open the record → glance at identity and value → click the outcome → the decision row
  becomes one line saying what was decided; the record stays open for reference.
- Unsure? Scroll down through the evidence, scroll back up and decide — reading never
  moves the buttons, and nothing has to be read before they enable.
- With a board: open a card → decide at the top of the overlay → close → the card's
  status band shows the new status in place; the board keeps scroll and filters.

## Feedback & feedforward

- The identity line is the feedforward: the decisive value sits beside the buttons, so a
  one-click decision is never blind.
- Success replaces the decision row with one calm line (what, by whom, when); no banner, no
  redirect, no auto-advance to another record.
- Failure shows right above the decision row, in normal body color, with retry; an entered
  reason is never lost. A running decision locks only the decision row.
- Alarm color only on facts the contract flags (over budget, past due) — never on the
  reject button by default, never on the frame.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (the evidence section is never titled like an outcome).
- A control is navigation OR action, never both: cards open, outcome buttons decide, trail
  links navigate.
- Link color only on real links; the trail and captions are muted.
- Numbers carry their unit or currency as the contract declares; a bare number is a guess.

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
Everything above holds: the status band, the identity with its decisive value, the decision row
before any evidence, the inline reason, feedback and disciplines. The row of large buttons no longer
fits across the screen, so the outcomes stack, still above the evidence. Where this section and the
layout described above differ, this section wins on mobile.

- **First screen**: the status band, the identity line with the decisive value large under it,
  then the outcomes as stacked full-width buttons, the contract's primary path first. All of it
  fits without scrolling.
- **The evidence follows below** in one column: facts as label and value pairs, line items as rows
  (what, then amount right-aligned), the trail with its latest entries and one control expanding
  the rest in place. No table, no horizontal scroll.
- **The inline reason** opens right under the outcome buttons; field and button stay above the
  keyboard.
- **A board, when present, becomes one column of full-width cards**; the record opens as a view of
  its own with back, inside this page, returning to the same card and scroll.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the outcomes, 2. the identity and decisive value, 3. the status
band, 4. the evidence below.

Forbidden on mobile:
- outcomes pushed below the first screen, or placed after the evidence;
- outcomes small or side by side, where a mistap decides;
- cards side by side, a sideways carousel, or any horizontal scroll;
- swipe gestures that decide.

## Forbidden

- The decision block at the end of the reading path, after facts and trail — that is
  `readAndDecide`.
- Approve/reject buttons on each card or row of a list that shrinks as it is cleared — that
  is `decisionQueue`.
- A table, or a list with column headers, for the collection; the record beside the
  collection (split view).
- A small chip as the only status signal of the record or its cards.
- Auto-advancing to another record after deciding; double dialogs on any outcome.
- Typed ids; page-level toasts carrying validation; inventing facts the contract lacks.

## Signals (how to check the generated page)

1. **S1 decision first:** in the record, the outcome buttons come before any fact,
   narrative or trail (document order and visual order).
2. **S2 status band:** the record opens with a full-width status band at its top edge, not
   only a small badge.
3. **S3 no split:** no list or board sits beside the record; when a collection exists it is
   a grid of cards (no `<table>`) and the record opens over it or as its own view.
4. **S4 decided in place:** after an outcome, the decision row is replaced by one line
   stating the decision while the record stays open.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "grid",
    "actionStyle": "standard",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupTriggerAction", "groupViewCard"],
    "forbid": ["groupViewTable"]
  }
}
```
