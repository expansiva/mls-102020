# orderManagement — experience `lifecycleLanes` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Orders as a flow you can SEE: one lane per lifecycle stage, side by side in process
order, each order a compact card in its lane. The page's first answer is spatial —
**where is the pile-up** — and its work is advancing orders out of it. Detail exists, but
as a fast overlay peeked and closed, never a destination; the board stays underneath.
Where `orderDeskSplit` verifies one order deeply before acting, this page reads the whole
operation's shape and moves the flow. Target: name the bottleneck in five seconds and
advance the orders that are ready without losing sight of the board.

## How to instantiate from the defs (the slots)

- **Lanes come from the contract's status values**, in process order (created → approved
  → fulfilled, with cancelled apart as the terminal exception). Only statuses the data
  distinguishes; never invent intermediate stages. Each lane shows its count and, when
  the contract provides totals, the lane's summed value — quiet, beside the title.
- **Each order is a card**: identity (number, customer), total with currency, and age in
  stage when the data carries dates — the oldest cards surface first inside each lane.
- **A card opens a quick overlay over the board**: header facts, item lines compact,
  money summary, and the transitions available from its status — each labeled with its
  outcome ("Approve order"). Close returns to the board exactly as it was. The overlay is
  for deciding, not for record editing; editing appears only as a link out when the
  contract declares such a route.
- **Advancing an order** runs the contract's transition command; on success the card
  slides to its new lane and both counts update. Cancel sits apart from progressive
  moves and asks one plain confirmation naming the order.
- Declared filters (period, customer) form one quiet control at the top right — one
  place, never per-lane filter bars.
- Session/context inputs never render as fields; ids are never typed — the card IS the
  order. Never invent lane metrics, SLA timers or targets the contract does not carry.

## Attention hierarchy (the spine of this experience)

1. The lanes' relative fullness — the shape of the operation.
2. The oldest cards in the busiest lane — the bottleneck's face.
3. The transitions on the opened card.
4. Filters and frame — quiet.

## Loops

- Read the board's shape → open the oldest card where the pile-up is → decide → advance →
  the card moves, the lane shrinks → next card. The board's success is its lanes
  draining left to right.
- Peek-and-close is cheap by design: opening a card must never feel like leaving the
  page, so the operator inspects many and acts on the ready ones.

## Feedback & feedforward

- Transition buttons appear only when available from the card's status; labels name the
  outcome, never a bare arrow or "Next".
- A failed transition reports inside the overlay, above its button, normal body color,
  with retry; the card stays in its true lane — the board never shows a move that did
  not happen.
- While a transition runs, its button shows a running state; the rest of the board stays
  live.
- Success is local: the card's movement and the counts updating ARE the confirmation. No
  page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once; lane titles are status names, never the page title, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: cards open the overlay, transition
  buttons act, an edit link (if any) only navigates.
- Link color only on real links; alarm color only on true trouble the contract flags
  (cancelled state, overdue age) — never tinting whole lanes.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A filterable queue beside a full permanent detail panel — that is the `orderDeskSplit`
  experience, not this one.
- Editing lines or amounts inside the overlay; this page transitions, it does not
  compose orders.
- Free drag between arbitrary lanes when the contract provides only specific
  transitions; every move is a named command.
- Lanes for statuses the data cannot express, or reordering lanes by count.
- Typed ids for anything the defs marks as selection/session/context.
- Hiding empty lanes; an empty lane shows once, quietly, what will appear there —
  position stability is how the board is read.
