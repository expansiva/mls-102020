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

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the concept, the process order, the counts and limits, the loops,
feedback and disciplines. Only the shape changes, because the columns can no longer stand side by
side. Where this section and the layout described above differ, this section wins on mobile.

- **"Where is everything?" is answered by the status switcher.** At the top, one row of status
  chips in the declared process order, each with its count ("count / limit" when the contract
  declares a limit, the number in alarm color past it). Every status is a chip even when empty,
  and the chips never reorder. This row is the only thing that may scroll sideways.
- **One column on screen at a time**: tapping a chip shows that status's cards as one column of
  full-width cards. The column opens on the first status that has cards; an empty status says
  once, quietly, what belongs there.
- **Cards keep their limit**: title, at most two decisive facts, owner. Flags still color only
  their own fact.
- **Moving is a control on the card**, never a drag: a quiet "Move to" opens a short picker with
  only the statuses the contract allows from here. On commit the card shows its running state,
  then leaves the column, and both chip counts update in place; a failure keeps the card where it
  was, with the reason and retry on the card.
- **The overlay becomes a view of its own**, with back: tapping a card opens its full detail and
  commands. Back returns to exactly the same status, the same scroll and the same filters. This is
  how "never cost the board its state" holds on a phone.
- **Create and filters stay quiet**: one create action for the status on screen (status is
  context, never asked); filters behind one quiet control under the switcher, narrowing every
  status and its count at once.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the status switcher with its counts, 2. the cards of the status on
screen, 3. limit breaches and flagged facts, 4. create and filters.

Forbidden on mobile:
- several status columns squeezed side by side, or a board that scrolls sideways (only the row of
  status chips may);
- drag as the way to move a card, or a move picker offering statuses the contract does not allow;
- hiding empty statuses from the switcher, or a switcher without counts;
- card detail as a separate page that loses the status, scroll or filters on back.

## Forbidden

- Horizontal lanes crossing the status columns to show distribution by person or type —
  that is the `swimlaneBoard` experience, not this one.
- Alphabetical column order, hiding empty columns, or columns reordering themselves.
- Cards carrying more than title, two facts and owner; cards as mini-tables.
- Drag-and-drop as the only way to change status; moves the contract does not declare.
- Whole cards painted in alarm color; column frames colored as decoration.
- Opening card detail as a page navigation that loses the board's state; page-level
  toasts carrying validation.
