# inventoryControl — experience `splitViewOperations` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The stockroom control desk: a dense grid of items with their balances on one side, and a
working panel for the selected item on the other. The panel has **modes** — read, edit,
movement — switched explicitly, never blended into one mega-form. Where
`alertFirstReplenishment` opens on what is missing and exists to refill it, this page is
the neutral instrument for ANY stock work: consulting a balance, fixing a record,
registering a movement. Target: any single stock operation completed without leaving the
page or losing the grid.

## How to instantiate from the defs (the slots)

- **The grid comes from the main collection query**: identity first, then current balance
  (right-aligned, tabular, with unit), then minimum level and status when the contract
  exposes them. Low-stock rows mark their balance in alarm color — the number, not the
  row. Declared filters (low-stock filter, search) form one quiet bar above the grid.
- **The panel opens in read mode** on selection: all contract fields in labeled blocks,
  balance loudest.
- **Edit mode** is an explicit switch: the update command's inputs, prefilled, Save and
  Cancel. Editing the record never touches the balance — corrections of quantity belong
  to movement.
- **Movement mode** hosts the adjust command: **direction is ALWAYS a binary choice**
  (in/out, add/remove — two exclusive options, one must be picked, none preselected when
  the contract does not default it) and **quantity is always entered positive**; the
  direction carries the sign. A reason/note input appears only if the contract declares
  one. The mode shows the current balance beside the form so the operator sees what the
  movement lands on.
- **Removal lives in a danger zone** at the panel's foot in read mode: visually separated,
  labeled with its outcome, one plain confirmation naming the item.
- Session/context inputs never render as fields; ids are never typed — the selection IS
  the id. Never invent balances, thresholds or units the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The selected item's panel in its current mode.
2. The grid — balances scannable in one column.
3. Filter bar and search — servants, quiet.
4. The danger zone — present, subdued, last.

## Loops

- Scan grid → select → read → switch to the mode the task needs → commit → the row's
  balance updates in place → next item. Grid keeps page, scroll and filters.
- After a movement commits, the panel returns to read mode showing the new balance —
  the proof is the number, not a banner.

## Feedback & feedforward

- Required fields visibly required before any mistake; validation at the field, in words
  ("Quantity must be more than zero"), never a toast.
- Command failure renders inside the panel's active mode, above its button, normal body
  color, with retry; grid and other data stay untouched.
- Each mode's commit button stays disabled until its form is valid; the label names the
  outcome ("Record entry", "Save item", never "Submit").
- Success is local: inline confirmation in the panel, updated row in the grid. No
  page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, in the header; panel and mode titles never repeat it, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, mode switches switch,
  buttons commit.
- Link color only on real links; alarm color only on truly low balances — a grid that is
  all red ranks nothing.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Opening the page as a replenishment queue of low-stock items with the catalog demoted —
  that is the `alertFirstReplenishment` experience, not this one.
- Signed or negative quantities, a free-text direction, or a movement form where
  direction is optional or preselected against the contract.
- Editing balances directly in edit mode or in grid cells; movements are the only door to
  quantity.
- One blended form mixing record fields and movement fields; modes never merge.
- Typed ids for anything the defs marks as selection/session/context.
- Removal as a casual grid icon or inside the edit form; destruction stays in the danger
  zone, confirmed, named.
