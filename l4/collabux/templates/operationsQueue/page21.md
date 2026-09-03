# operationsQueue — experience `workQueueSplit` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, transitions — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An operations desk: **a queue on one side, the item under work on the other**, both on
stage at once. The operator scans the queue by status and priority, opens an item without
losing the queue, acts on it (assign, start, complete — whatever the contract's
transitions allow), and watches it move or leave. Where `cardTriageMobile` is a deck of
cards for a thumb in motion, this is a dense two-region desk for someone seated with the
whole shift in view. Target: from "what is next?" to "acted on it" without a page change.

## How to instantiate from the defs (the slots)

- **The queue is the list query.** Rows are compact and dense: identity, current status
  (small chip, one consistent shape), the urgency fact (due time, priority) right-aligned.
  Group or sort by status/priority as the contract's query declares; the worst waits at
  the top.
- **Status filters come from the declared statuses** — a single row of filter chips above
  the queue, counts on each chip only if the contract provides them. Never invent a
  status the contract does not declare.
- **The item panel binds to the selected row**: identity first, then the facts the
  contract exposes, then the transition actions. Selecting a row fills the panel; it
  never navigates away.
- **Transition commands render as contextual actions in the panel** — only the
  transitions valid for the item's current status appear; the others are absent, not
  disabled. Each action label names the outcome ("Start", "Complete"), verb-first.
- **Session/context inputs never render as fields**: who is acting, which site — shown at
  most as a quiet caption, never editable. Ids are never typed; the target is always the
  selected row.

## Attention hierarchy (the spine of this experience)

1. The queue — what is waiting, worst first.
2. The selected item's panel — facts, then its valid actions.
3. Filter chips — the lens, quiet until touched.
4. Everything else (counts, captions), demoted.

## Loops

- Scan queue → select → read the panel → fire a transition → the row updates its status
  chip or leaves the current filter → the panel follows the item or empties with a quiet
  "select the next item" — the loop restarts with zero navigation.
- After a transition the queue keeps its scroll position and filter; the operator's place
  in the shift is never lost.
- With nothing selected, the panel says once, quietly, what selecting will show — never a
  blank region, never an auto-selected item acting as if the operator chose it.

## Feedback & feedforward

- A transition in flight locks only the panel's actions; the queue stays scannable and
  selectable.
- Command failure renders inside the panel, above its actions, in normal body color, with
  retry — the queue is untouched.
- Success is local: the status chip changes where the eye already is; no page banner, no
  blocking dialog for routine transitions.
- Actions that need an input (an assignee, a cancel reason) collect it inline in the
  panel, with the confirm button disabled until valid and labeled with the outcome.
- Alarm color belongs only to genuinely late/critical facts in rows — never to whole rows
  or the page frame.

## Disciplines (transversal — always)

- The page name appears once, in the header; the queue and the panel never repeat it, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, actions transition, and no
  action doubles as a link.
- Link color only on real links; status chips and captions use muted or semantic tones,
  never link color.
- One consistent row anatomy for the whole queue; density is uniform, not per-status.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- One-card-at-a-time layouts, swipes, or advancing status directly on a queue row in two
  taps — that is the `cardTriageMobile` experience, not this one.
- Navigating to a detail page to act; the panel is the detail.
- Showing transition buttons that are invalid for the item's current status (disabled
  ghosts included).
- Typed ids for the item, the assignee, or anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation, blocking success dialogs, redirects after a
  transition.
- Inventing statuses, priorities or counts the contract does not declare; empty queue
  states padded with placeholder rows.
