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

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
Everything above holds: the concept, the modes, the loops, feedback and disciplines. Only the
shape changes, because the grid and the panel can no longer sit side by side. Where this section
and the layout described above differ, this section wins on mobile.

- **Side by side becomes a sequence**: list → item → mode. Each is a view of its own, with back.
  The list is the home view, and the item opens in read mode on selection.
- **The grid becomes a list of rows**, one product per row: identity first, then the current
  balance with its unit, which is the loudest element of the row. Minimum level and status are
  secondary in the row. Low stock still marks the balance number, never the whole row. No table
  and no horizontal scroll.
- **The filter bar stays quiet**: the search field at the top of the list, and the low-stock
  filter as one toggle next to it. Filters and scroll survive a round trip to an item and back.
- **The item view keeps the panel's modes** (read, edit, movement) as views of their own, switched
  by explicit controls. Only one mode is on screen, never two stacked. The current balance stays
  visible at the top of every mode, so the operator sees what a movement lands on.
- **Movement on a phone**: the direction is a large two-option control (in / out), and the
  quantity uses a numeric keyboard and is always positive. The commit button names the outcome
  and sits where the thumb reaches it, at the bottom of the view.
- **Creating an item** is its own view, opened by one clear action from the list. After it
  commits, the new item opens in read mode.
- **After any commit**, return to the item in read mode with the new balance. Back returns to
  the list, at the same place, with the row updated.
- **The danger zone** stays at the foot of the read mode, below everything else.
- **Touch**: every target is at least 44px high, and the primary action of a view is one tap
  away. Nothing depends on hover.

Mobile attention hierarchy: 1. the content of the current view, 2. its primary action,
3. the way back.

Forbidden on mobile:
- wide tables or any horizontal scroll;
- a side panel or drawer that covers part of the list to show the item;
- multi-column forms;
- a list, an item and a form stacked on one long screen.

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
