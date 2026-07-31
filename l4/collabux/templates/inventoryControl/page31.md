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
