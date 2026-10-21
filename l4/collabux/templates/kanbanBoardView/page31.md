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

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the concept, the load-map question, the lanes from the contract, the
loops, feedback and disciplines. Only the shape changes, because the lane-by-status grid can no
longer fit across the screen. Where this section and the layout described above differ, this
section wins on mobile.

- **"How is the work distributed?" is answered by the lane list, the home view.** One row per
  lane, in its stable position: identity, the lane total (the loudest number of the row, in alarm
  color on a contract-flagged breach), and under it the lane's counts per status as a compact
  run of numbers in process order. The status names appear once, above the list, as the key.
  A zero stays a visible zero: an empty cell is still information. The count run wraps, never
  scrolls sideways.
- **Overloaded and stalled lanes read in one vertical scan**: the totals line up down the list,
  and a lane whose work sits in one status shows it in its count run. No ranking or reordering
  the contract does not declare.
- **Tapping a lane opens that lane's view**, with back: its cards grouped by status, in process
  order, each group headed by the status name and its count; an empty group shows once, quietly.
  Back returns to the lane list at the same place. The lane list replaces collapsing: a lane row
  opens its lane and does nothing else.
- **Moving is a control on the card**, never a drag: "Move to" offers only the statuses the
  contract allows. A reassign control (to another lane) appears only when the contract declares
  that command. On commit, the group counts and the lane's numbers update in place.
- **The card overlay becomes a view of its own**, with back to the same lane, group and scroll.
  Cards stay minimal: title and one decisive fact.
- **Filters** sit behind one quiet control at the top of the lane list, narrowing every lane.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the lane totals, 2. each lane's counts per status, 3. the cards
of the lane opened, 4. filters.

Forbidden on mobile:
- the lane-by-status grid shrunk or scrolled sideways;
- a status switcher with flat columns as the home view (that is `classicBoard` on a phone);
- dropping zero counts, empty groups or empty lanes;
- drag as the way to move or reassign a card, or reassign without a contract command.

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
