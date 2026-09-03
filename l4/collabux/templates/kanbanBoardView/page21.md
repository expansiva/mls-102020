# kanbanBoardView — experience `classicBoard` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The flow of work made physical: one column per status, cards as the work items, and moving
a card IS changing its status. The board answers "where is everything in the process?" in
one sweep, left to right in process order. Cards stay deliberately small so the columns
stay readable; depth lives in an overlay that never costs the board its state. Where
`swimlaneBoard` slices the same work by who carries it, this keeps one lane — the process
itself — and makes the flow the only story.

## How to instantiate from the defs (the slots)

- **Columns come from the contract's status dimension**, in the process order the
  contract declares — never alphabetical. Every status renders as a column even when
  empty; an empty column says once, quietly, what belongs there.
- **Each column header carries its name and its count**; when the contract declares a
  work-in-progress limit, the header shows "count / limit" and crossing the limit marks
  the NUMBER in alarm color — the column frame stays neutral.
- **Each item becomes a compact card**: title, at most two decisive facts the contract
  provides (due date, value), and the owner. Flags color their own fact inside the card
  (an overdue date in alarm color), never the whole card.
- **Dragging a card to another column executes the status command**; every card also
  offers the same move as a quiet action on the card, so drag is never the only way.
- **Create, when the contract declares it**, is one quiet action per column, opening a
  minimal form for that column's status — status is context, never asked.
- **Filters come only from contract inputs**, one quiet row above the board narrowing
  every column at once. Session/context inputs never render as fields; ids never typed.
- **Opening a card raises an overlay panel above the board** with the item's full detail
  and its commands; closing it lands on an unchanged board — same scroll, same filters.

## Attention hierarchy (the spine of this experience)

1. The columns and their counts — the shape of the flow, one glance.
2. The cards — what the work actually is.
3. Limit breaches and flagged facts — trouble inside the data, not around it.
4. Filters and create, quiet at the edges.

## Loops

- Scan the board → drag what progressed → counts update in place → scan again.
- Open a card → read or act in the overlay → close → the board is exactly where it was.
- Filter → every column narrows together → clear → the whole board returns.

## Feedback & feedforward

- While a move commits, the card shows a running state in its new column; if the command
  fails, the card returns to its origin and the reason appears on the card itself, in
  normal body color, with retry — never a page toast.
- Drop targets are announced while dragging (the receiving column visibly ready), and a
  move the contract forbids refuses before the drop, not after.
- Create submits stay disabled until required fields are filled; labels name the outcome
  ("Add ticket to Triage"). Success is the card appearing — no banners, no dialogs.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a column header never reads like its create action).
- A control is navigation OR action, never both: cards open the overlay, card actions
  act; nothing on the board navigates away.
- Link color only on real links; counts, owners and captions are muted text.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Horizontal lanes crossing the status columns to show distribution by person or type —
  that is the `swimlaneBoard` experience, not this one.
- Alphabetical column order, hiding empty columns, or columns reordering themselves.
- Cards carrying more than title, two facts and owner; cards as mini-tables.
- Drag-and-drop as the only way to change status; moves the contract does not declare.
- Whole cards painted in alarm color; column frames colored as decoration.
- Opening card detail as a page navigation that loses the board's state; page-level
  toasts carrying validation.
