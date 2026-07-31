# calendarScheduling — experience `calendarGrid` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Time as a surface: **a week or month grid is the page**, and scheduling happens by acting
directly on it. The user thinks spatially — "Tuesday afternoon is free" — and the grid
rewards that thinking: free space looks free, busy space shows what occupies it, and the
slot itself is the control for creating and moving. Where `agendaTimeline` reads time as a
flowing list to act on item by item, this experience reads time as a map to place things
on. Detail never steals the stage: it opens in a panel over the grid and leaves.

## How to instantiate from the defs (the slots)

- **The grid comes from the schedule query**: each returned item renders as a block at its
  time position, labeled with its business identity (who/what, as the contract names it).
  The visible range (week or month) is the page's one big mode switch, in the header next
  to today's anchor ("Hoje") and range paging.
- **Creating starts on the grid**: selecting a free slot opens the creation panel with the
  slot's date/time already filled from the gesture — the user never re-types what they
  just pointed at. Remaining fields follow the command's inputs: participants and
  resources are pickers over what the contract exposes (**ids never typed**), values and
  notes after.
- **Moving is direct when the contract has a reschedule command**: dragging a block to
  another slot proposes the change and commits through that command — the drop is the
  input. Without such a command, blocks do not drag; rescheduling lives in the panel.
- **The detail panel** opens from a block: every field the contract provides, plus the
  item's actions (confirm, cancel, reassign) as the contract's commands — each labeled by
  outcome, destructive ones confirmed once in plain words.
- **Session/context inputs never render as fields**: the viewing user, the current
  organization — caption at most. A "my schedule vs. team" choice exists only if the
  contract declares such a filter.

## Attention hierarchy (the spine of this experience)

1. The grid, with today/now visibly anchored.
2. The blocks — identity readable at grid scale, state readable at a glance.
3. The header controls: range switch, paging, and the one creation entry point.
4. The panel, when open — deep but temporary.

## Loops

- Scan the week → spot free space → select the slot → complete the panel → the new block
  appears in place, panel closes. The grid is never left.
- Spot a conflict or change → drag (or open and edit) → the block settles where it now
  belongs. Paging weeks keeps every behavior identical.

## Feedback & feedforward

- Field validation in the panel is at the field, at commit time; the commit button stays
  disabled until required inputs are set and its label names the outcome ("Agendar
  visita").
- A failed command reports inside the panel, above its button, normal body color, with
  retry — never a toast; a failed drag returns the block to its origin and says why near
  the grid header region it belongs to.
- Success is local: the block appears/moves in place with a brief settle emphasis; no page
  banner, no redirect.
- Loading renders the grid frame first, blocks after — the map before the territory. A
  range with nothing scheduled still shows the full grid; empty is visible time, not an
  empty state.

## Disciplines (transversal — always)

- The page title appears once, in the header; day/column headers are dates, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: paging and range switching navigate time;
  slots, blocks and panel buttons act. Nothing does both.
- Link color only on what is clickable; past time and captions are muted; alarm color only
  for states the contract flags (conflict, overdue), never as block decoration.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Rendering the schedule as a chronological list of items with inline actions — that is
  the `agendaTimeline` experience, not this one; here the grid is the page.
- A creation form that asks for date/time the user already pointed at, or typed ids for
  participants and resources.
- Drag-to-move without a contract command to commit it; optimistic moves that silently
  revert.
- Detail as a separate page navigation — the grid must remain behind the panel.
- Inventing availability, suggested slots or conflict rules the contract does not declare.
- Blocking success dialogs, page-level toasts carrying validation, steps or wizards to
  create an item.
