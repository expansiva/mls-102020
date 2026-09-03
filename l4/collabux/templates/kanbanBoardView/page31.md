# kanbanBoardView — experience `swimlaneBoard` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The same flow, sliced by who carries it: horizontal lanes — one per assignee, type or
priority, whichever dimension the contract groups by — crossed with the status columns.
The page answers a different question than a flat board: not "where is the work?" but
"how is the work DISTRIBUTED?" — who is overloaded, which lane is stalled, where nothing
is moving. The grid is a load map first and a flow board second. Where `classicBoard`
tells the story of the process in one lane, this tells the story of its carriers.

## How to instantiate from the defs (the slots)

- **Lanes come from the contract's grouping dimension** (assignee, type, priority — never
  invented); **columns come from the status dimension** in declared process order. The
  intersection cells hold the cards.
- **Each lane header carries identity plus the lane's total count** — the load readout
  this page exists for. When the contract flags a lane-level breach (over capacity), the
  NUMBER takes alarm color; the lane frame stays neutral.
- **Cards are minimal — title and one decisive fact** — smaller than a flat board's
  cards, because the grid is the message and cells must stay comparable at a glance.
- **Dragging within a lane changes status** (the status command). **Dragging across
  lanes reassigns the grouping value ONLY if the contract declares that command**;
  otherwise cross-lane drag simply is not offered — never fake it.
- **Empty intersections stay visible.** An empty cell is information (this person has
  nothing in review); the grid never collapses cells, and lanes keep their position from
  visit to visit. A lane may collapse to its header row by user choice, keeping counts.
- **Filters come only from contract inputs**, one quiet row above the grid, narrowing
  every lane at once. Session/context inputs never render as fields; ids never typed.
- **Opening a card raises an overlay above the grid**; closing it changes nothing about
  scroll, filters or collapsed lanes.

## Attention hierarchy (the spine of this experience)

1. Lane headers and their totals — the distribution, one vertical scan.
2. The grid — where each lane's work sits in the process.
3. The cards — the items themselves, minimal.
4. Filters, quiet at the edge.

## Loops

- Scan lane totals top to bottom → spot the heavy or stalled lane → read that lane left
  to right → open or move what needs it → totals update in place.
- Collapse the lanes that are fine → work the ones that are not → expand on the way out.

## Feedback & feedforward

- A move that fails returns the card to its origin cell with the reason on the card, in
  normal body color, with retry — never a page toast; the rest of the grid stays live.
- While dragging, only legal destinations present themselves as ready; an illegal drop
  refuses before it happens, not after.
- Lane totals and cell counts update the moment a move lands; a running move shows its
  state on the card itself. Success is the grid changing — no banners, no dialogs.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a lane header is a name and a count, never an action's
  label).
- A control is navigation OR action, never both: cards open the overlay, card actions
  act; lane headers collapse their lane and do nothing else.
- Link color only on real links; totals, counts and empty-cell hints are muted text.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A single flat run of status columns with no lane dimension — that is the
  `classicBoard` experience, not this one.
- Lanes from a dimension the contract does not group by; ranking or reordering lanes by
  anything the contract does not declare.
- Hiding empty cells or empty lanes — absence is the signal here.
- Cross-lane drag when no reassignment command exists in the contract.
- Cards fat enough to fight the grid (two facts maximum is already too many here).
- Whole lanes or cells painted in alarm color; per-lane filter bars; page-level toasts
  carrying validation.
