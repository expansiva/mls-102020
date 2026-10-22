# kanbanBoardView — experience `collapsibleStatusList`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**The board turned on its side, for when there are too many cards.** Each status is a
section of a vertical list, in process order, with its name and count in a header that
collapses or expands the section. Status is still the structure — a card lives in exactly
one section and moving it changes its status — but cards are rows, not tiles, so hundreds
fit, and the sections nobody is working right now fold down to one line. Where
`classicBoard` lays the flow out as side-by-side columns and `swimlaneBoard` crosses them
with lanes by carrier, this page stacks the statuses top to bottom and lets the user choose
which ones are open. Target: a board with hundreds of cards that stays readable, with the
status counts always visible and the working statuses open.

## How to instantiate from the defs (the slots)

- **Sections come from the contract's status dimension**, in the declared process order —
  never alphabetical, never by count. Every status renders as a section even when empty;
  an empty section, opened, says once, quietly, what belongs there.
- **Each section header**: the status name, its count ("count / limit" when the contract
  declares a work-in-progress limit, the NUMBER in alarm color past it), and the collapse
  toggle. The whole header toggles and does nothing else. Headers stay visible when the
  section is collapsed — the counts are the board's overview.
- **Default open state**: the active statuses open, the terminal ones (done, closed,
  cancelled — as the contract's order ends) collapsed. The user's choice is kept across
  visits when the page can remember it.
- **Cards are compact rows**: title, at most two decisive facts the contract provides
  (due date, value) right-aligned, and the owner. Flags color their own fact, never the
  row. One row anatomy for every section.
- **Moving is a control on the row**: a quiet "Move to" opening a short picker with only
  the statuses the contract allows from the current one. Drag between sections may exist
  as a shortcut, never as the only way.
- **Create, when declared**, is one quiet action in each section header's row, for that
  status — status is context, never asked. Filters only from contract inputs, one quiet row
  above the list, narrowing every section and its count at once. Session/context inputs
  never render as fields; ids never typed.
- **Opening a card** expands its row in place to show the full detail and its commands, or
  raises an overlay; closing returns the list unchanged — same sections open, same scroll.

## Attention hierarchy (the spine of this experience)

1. The section headers and their counts — the shape of the flow, top to bottom.
2. The rows of the open sections — the work in progress.
3. Limit breaches and flagged facts.
4. Filters and create, quiet at the edges.

## Loops

- Scan headers → open the section that matters → move what progressed via "Move to" → the
  row leaves its section, both counts update in place.
- Collapse what is fine → work what is not → the collapsed state stays as left.
- Filter → every section and count narrows together → clear → the full list returns.

## Feedback & feedforward

- The move picker is the feedforward: it lists only legal destinations.
- While a move commits, the row shows a running state; on success it appears at the top
  of its new section (opened or not, the count changes); on failure it stays where it was
  with the reason and retry on the row — never a page toast.
- Create stays disabled until required fields are filled; labels name the outcome ("Add
  ticket to Triage"). Success is the row appearing.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a section header is a name and a count, never an
  action's label).
- A control is navigation OR action, never both: headers collapse, rows open, "Move to"
  moves.
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
Everything above holds: sections in process order, headers with counts, collapse, rows, "Move to",
feedback and disciplines. A vertical list already fits a phone; what changes is that rows stack
their facts and the open card becomes a view of its own. Where this section and the layout
described above differ, this section wins on mobile.

- **Section headers full width**, name and count on one line, the whole header the toggle.
- **Rows stack**: title wrapping on the first line, facts and owner on the second; "Move to" as
  one 44px control at the row's end edge.
- **The move picker** opens in place as a short list of legal statuses.
- **Opening a card** shows its detail as a view of its own with back, inside this page, returning
  to the same section and scroll.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the section headers and counts, 2. the rows of open sections,
3. limit breaches and flags, 4. create and filters.

Forbidden on mobile:
- status columns side by side, or a status chip switcher as the home view;
- drag as the way to move;
- hiding empty or collapsed sections' headers;
- any horizontal scroll.

## Forbidden

- Side-by-side status columns of tiles — that is `classicBoard`.
- Lanes by assignee or type crossing the statuses — that is `swimlaneBoard`.
- A flat list where status is only a chip on each row; sections not in process order.
- Hiding empty sections, or collapsed sections losing their count.
- Drag as the only way to move; moves the contract does not declare.
- Whole rows in alarm color; typed ids; page-level toasts carrying validation.

## Signals (how to check the generated page)

1. **S1 status sections:** the cards render inside one vertical list of sections, one per
   status, in process order — no side-by-side columns.
2. **S2 collapsible with count:** each section header shows its count and toggles the
   section; collapsed headers stay visible with their count.
3. **S3 rows, not tiles:** cards render as compact rows.
4. **S4 move via control:** each card offers a move control listing destination statuses.
