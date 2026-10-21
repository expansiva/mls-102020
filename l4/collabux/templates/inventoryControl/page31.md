# inventoryControl — experience `alertFirstReplenishment` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This page exists to REPLENISH, not to browse. It opens on the trouble: every item whose
balance breached its minimum is a row in an **actionable queue that owns the top of the
page**, each row carrying its own quick inline adjustment. The full catalog exists, but
demoted — collapsed below or behind one quiet link. Where `splitViewOperations` is a
neutral desk for any stock task, this is a checklist the operator works down until it is
empty. Target: every low item restocked, one row at a time, without opening anything.

## How to instantiate from the defs (the slots)

- **The queue comes from the low-stock data**: the collection filtered by its alert
  semantic (below minimum, flagged low) — worst first: the furthest below its minimum at
  the top. If the contract exposes the filter as an input, this page arrives with it
  already applied; the queue never shows healthy items.
- **Each queue row carries exactly what the decision needs**: identity, current balance
  against minimum ("2 of 10", the deficit in alarm color), and the inline adjust — a
  positive quantity input plus one commit button from the adjust command, right there in
  the row. Direction is fixed by purpose: this queue only adds stock; the row never asks
  in-or-out.
- **The headline is the queue count**, one sentence above it — "7 items below minimum" —
  computed from the queue. Text, not a tile.
- **The full catalog is demoted**: one collapsed section or quiet link below the queue
  ("All stock items") revealing a compact read-only list from the main query. Record
  editing and removal are NOT this page's job; rows there may link to where that happens
  when the contract declares such a route, and otherwise stay read-only.
- Session/context inputs never render as fields; ids are never typed — the row IS the
  item. Never invent minimums, deficits or suggested quantities the contract does not
  provide; a suggested amount appears only if the contract computes it.

## Attention hierarchy (the spine of this experience)

1. The headline — how much trouble, one sentence.
2. The queue, worst first, each row ready to act.
3. Row-level facts: deficit in alarm color, balance and minimum beside it.
4. The demoted catalog — reachable, invisible until wanted.

## Loops

- Read the top row → type the quantity → commit → the row confirms, then leaves the queue
  (its item is no longer low) → the next row is already under the thumb. The page's
  success is its own shrinking.
- The headline count follows the queue live; when the queue empties, the page says so
  calmly and proudly — one sentence ("Nothing is below minimum"), the demoted catalog
  still reachable below. Design this state; never auto-redirect.

## Feedback & feedforward

- The row's commit button stays disabled until its quantity is valid (positive, present);
  its label names the outcome ("Add stock", not "OK").
- Validation speaks at the field, in the row, in words — never a toast.
- A failed adjustment reports inside its own row, normal body color, with retry; the rest
  of the queue stays live and usable.
- Success is local: brief inline confirmation on the row, then the row's exit. No
  page-level banners; the headline updating IS the page-level feedback.

## Disciplines (transversal — always)

- The page name appears once, in the header; the queue has no title repeating it, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: queue rows act, catalog rows (if
  linked) navigate — never one row doing both.
- Link color only on real links; alarm color only on the deficit numbers — the frame,
  headline and buttons stay neutral.

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
Everything above holds: the queue first, worst first, the inline adjustment on each row, the
fixed direction, the demoted catalog, the empty state and the disciplines. On a phone the queue is
worked with the thumb, so each row must carry its own adjustment within reach. Where this section
and the layout described above differ, this section wins on mobile.

- **The headline and the queue own the first screen**: the one-sentence count, then the queue
  rows in one column, worst first. Nothing else comes before them.
- **Each queue row is a compact block**: identity first; then "2 of 10", the deficit in alarm
  color; then the adjustment on its own line — a positive quantity field with a numeric keyboard
  and, beside it, a large "Add stock" button. There is still no in/out choice: this queue only
  adds, so the movement control of `splitViewOperations` is reduced here to quantity and commit.
- **After a commit**, the row confirms briefly and leaves; the next row moves up into the same
  place, under the thumb, and the headline count follows. No scroll jump, no view to close. While
  typing, the row and its button stay above the keyboard.
- **The catalog stays demoted**: one quiet collapsed section at the end of the queue ("All stock
  items"). Opened, it is a compact read-only list of rows — identity and balance with its unit —
  no table; rows navigate only when the contract declares a route.
- **The empty queue**: the calm sentence takes the first screen, the catalog section still below.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the headline, 2. the top queue row and its adjustment, 3. the rest
of the queue, 4. the catalog section.

Forbidden on mobile:
- an in/out choice or a signed quantity on queue rows;
- opening an item view, sheet or dialog to adjust — the adjustment happens on the row;
- the catalog as a tab, a toggle next to the headline, or anything above the queue;
- wide tables or any horizontal scroll;
- the keyboard covering the button of the row being typed in.

## Forbidden

- A dense full-catalog grid with a modal side panel as the page's center — that is the
  `splitViewOperations` experience, not this one.
- A direction choice on queue rows, negative quantities, or reusing the queue for stock
  exits.
- Making the full catalog compete with the queue: no equal-weight tabs, no side-by-side
  split.
- Record editing, creation or removal inside the queue; this page adjusts quantities
  only.
- Typed ids for anything the defs marks as selection/session/context.
- Placeholder queue rows, invented "suggested order" amounts, or hiding the empty state —
  an empty queue is the goal, shown with pride.
