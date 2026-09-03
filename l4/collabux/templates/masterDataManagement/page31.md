# masterDataManagement — experience `inlineGridEdit` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A maintenance bench for the expert who curates master data in bulk: reviewing thirty tax
codes, fixing a batch of units, seeding cost centers. **The grid itself is the editor**:
click a cell and type, move with the keyboard, commit row by row. Where `compactCrudTable`
is a reading surface edited through a side panel, this is a typing surface — the hands stay
on the keyboard and the eyes stay on the data. Speed with visible control: every pending
change is marked, every commit is explicit, per row.

## How to instantiate from the defs (the slots)

- **The list query is the grid**; every column backed by an editable input of the edit
  command becomes an editable cell. Fields the contract exposes but does not accept as
  input render read-only and visibly quieter — editable and read-only cells must be
  distinguishable before any click (feedforward).
- **Selection inputs become in-cell pickers**: entering the cell opens the picker; the
  value is always chosen, never typed as an id. Session/context inputs never appear as
  columns at all.
- **The create command is the last row of the grid**: a ready, visibly distinct empty row
  at the bottom. Typing in it starts a new record; committing it appends a fresh empty
  row below. No separate form, no dialog.
- **Merge and deactivate**, when the contract declares them, are quiet row actions with a
  plain-words confirmation naming the consequence; merge targets are picked, never typed.

## The edit loop (the spine of this experience)

1. Enter a cell (click, or keyboard navigation) → the cell becomes an input, current
   value selected for immediate overtype.
2. Move across the row with the keyboard; leaving a changed cell marks the whole **row as
   dirty** — a visible mark on the row edge and its commit affordance appearing.
3. Commit the row explicitly: the row's commit control, or the keyboard confirm from its
   last cell. Commit is per row — one row's commit never touches another row.
4. Escape reverts the current cell to its saved value; a dirty row can be reverted whole
   with one action, with a plain confirm when several cells would be lost.
5. The loop repeats down the grid. Multiple rows may be dirty at once; each carries its
   own state and its own commit.

## Feedback & feedforward

- An invalid cell is marked at the cell, in words ("Code already in use"), the moment the
  cell is left — never only by color, never a toast.
- A row's commit stays disabled while the row has an invalid cell.
- Commit failure renders inside that row's region, in normal body color, with retry; the
  row stays dirty, the entered values are never lost, and every other row stays usable.
- While a row commits, that row locks and shows a running state; the grid does not.
- Success is local: the dirty mark clears, the row settles. No page banners.
- Leaving the page with dirty rows asks one plain confirm naming how many rows are
  uncommitted — never silent loss.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both; nothing in this grid navigates — the
  grid commits.
- Link color only on real links; dirty marks, statuses and captions are never blue.
- Every keyboard behavior has a pointer equivalent; the keyboard is the fast path, not
  the only path.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A side panel or separate form as the way to edit a record — that is the
  `compactCrudTable` experience, not this one.
- One global "Save all" button as the only commit, or auto-saving cells silently on blur
  with no dirty state and no explicit commit.
- Typed ids in picker cells, editable session/context columns, or an editable look on
  read-only cells.
- A modal dialog for row creation; the empty bottom row is the creator.
- Losing typed values on failure, on Escape pressed in a different cell, or on sort/
  filter changes while rows are dirty (block the reorder or ask first).
- Alarm color as decoration: it belongs only to invalid cells and failed commits.
