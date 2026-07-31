# masterDataManagement — experience `compactCrudTable` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Master data changes rarely and matters everywhere: a wrong unit or tax code poisons every
module that references it. This page is a **calm reference surface**: one clean table that
reads instantly, edited through a side panel that opens beside it — clarity above speed,
every change deliberate. Where `inlineGridEdit` is a typing surface for bulk upkeep, this
is a reading surface with occasional, careful edits: the table itself is never editable.

## How to instantiate from the defs (the slots)

- **The list query is the table.** Columns in reading order: the identity field (name or
  code) first, descriptive fields next, usage/status last. Only fields the contract
  declares — a handful of columns that fit without horizontal scrolling; the rest belong
  to the panel.
- **The create command is one button** above the table, label naming the outcome ("New
  cost center"), opening the same side panel empty.
- **The edit command is the side panel**: selecting a row opens the panel beside the
  table with that record's fields, grouped by subject, selection inputs as pickers.
  The table stays visible and the selected row stays marked — the panel edits, the
  table anchors.
- **Merge and deactivate are row-level actions** rendered quietly on the row or in the
  panel, only when the contract declares them. Both confirm in plain words that name the
  consequence ("Deactivate 'Liters'? Records using it keep it; new records won't offer
  it."). Merge requires picking the surviving record through a picker — never a typed id.
- **Session/context inputs never render as fields** — show them, if useful, as a quiet
  caption; ids are always resolved by selection, never typed.

## Attention hierarchy (the spine of this experience)

1. The table — the reference data itself, readable at a glance.
2. Search/filter, one quiet input above the table, only if the contract declares it.
3. The create button.
4. The side panel, only when open — it never covers the table on wide screens.

## Loops

- Scan → select a row → the panel opens filled → change a field → save → the panel
  closes and the row updates in place, briefly marked. No page navigation, ever.
- Deactivated records stay visible with a muted status, filterable when the contract
  provides the filter — deactivation is a state, not a disappearance.

## Feedback & feedforward

- Validation is field-level in the panel, at the field, at commit time — never a toast.
- The panel's save button stays disabled until required fields are filled and something
  changed; its label names the outcome ("Save unit"), never "Submit".
- Command failure renders inside the panel, above its button, in normal body color, with
  retry; the table stays untouched.
- Success is quick and local: panel closes, row updates, brief mark. No page banners.
- Closing a panel with unsaved changes asks one plain confirm — never silent loss.

## Disciplines (transversal — always)

- The page name appears once, in the header; the panel title is the record's identity,
  never the page title, and **no heading anywhere repeats the label of a button or link
  near it**.
- A control is navigation OR action, never both: rows open the panel, buttons commit —
  nothing on this page leaves it.
- Link color only on real links; row text, captions and muted statuses are never blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Editable cells, click-to-type, or an add-row at the bottom of the grid — that is the
  `inlineGridEdit` experience, not this one.
- Navigating to a separate page to create or edit; a modal dialog replacing the panel.
- Merge or deactivate without confirmation, or a confirmation that does not say the
  consequence in plain words.
- Typed ids for merge targets or any selection/session/context input.
- Pagination-heavy chrome, filter bars or column tools the contract does not declare —
  master data is small; keep the surface small.
- Alarm color on anything but true problems; deactivated rows are muted, not red.
