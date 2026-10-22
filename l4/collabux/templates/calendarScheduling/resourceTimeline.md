# calendarScheduling — experience `resourceTimeline`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Time against **who or what is booked**: one row per resource (room, person, vehicle, machine —
whatever the contract books), time running left to right across a shared axis, each booking a
block in its resource's row. The question it answers is **"which resource is free at this time?"**
— read DOWN a column of time to compare resources, ACROSS a row to see one resource's day.
Where `calendarGrid` lays days side by side for one calendar, and `agendaTimeline` streams items
in time order, this experience puts the resources side by side and makes free capacity visible
per resource. Target: dispatchers and front desks allocating shared rooms, people or vehicles.

## How to instantiate from the defs (the slots)

- **Rows come from the resource dimension the contract declares**: a resources query when there
  is one (every resource gets a row, even with nothing booked), otherwise the distinct values of
  the resource-like field on the schedule items (room, assignee, vehicle, as the contract names
  it). Row labels are the resource's business name, in a fixed label column on the left.
- **The axis is one day (or the window the contract's filters imply)**, hours left to right, a
  single "now" marker across all rows when the window contains today. Paging moves the window;
  today's anchor returns to it.
- **Blocks come from the schedule query**: each item drawn in its resource's row from its start
  to its end, labeled by its business identity. An item with only a start renders at its
  position with the contract's duration when declared, else as a fixed-width marker — never an
  invented span.
- **Creating starts on an empty cell**: selecting free time in a row opens the creation panel
  with BOTH the resource and the start already filled from the gesture. Remaining fields follow
  the create command's inputs; participants are pickers (**ids never typed**).
- **Moving and reassigning are direct only with a contract command**: dragging a block along its
  row changes time; dragging it to another row changes the resource — each commits only if the
  contract declares the command for that change. Without it, blocks do not drag; the detail
  panel offers what the contract allows.
- **The detail panel** opens from a block over the timeline: the item's fields and its commands
  (confirm, cancel, reassign), labeled by outcome.
- **Declared filters** (resource type, location) narrow the rows; session inputs are never fields.

## Attention hierarchy (the spine of this experience)

1. The rows of resources against one shared time axis, now marked.
2. The free stretches — empty time in a row reads as available.
3. The blocks, identity readable at row scale.
4. The header: window paging, today anchor, declared filters; the panel only when open.

## Loops

- Need a resource at 14:00 → run the eye down the 14:00 column → pick the row that is free →
  select the empty cell → complete the panel → the block appears in that row, panel closes.
- A resource becomes unavailable → open (or drag) its blocks → move them to a free row of the
  same kind → each settles in its new row. Paging the window keeps every behavior identical.

## Feedback & feedforward

- Loading draws the label column and the axis first, blocks after; a resource with nothing
  booked keeps its full empty row — emptiness is availability, never an empty state.
- The commit button in the panel stays disabled until required inputs are set and names the
  outcome ("Book room"); field errors at the field.
- A failed command reports inside the panel above its button, normal body color, with retry; a
  failed drag returns the block to its origin row and time and says why next to that row.
- Success is local: the block appears or settles in place with a brief emphasis. No banners.

## Disciplines (transversal — always)

- The page name appears once, in the header; row labels are resource names and axis labels are
  times, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: paging and filters navigate; cells, blocks and
  panel buttons act.
- Link color only on what is clickable; past time is muted; alarm color only for states the
  contract flags (conflict, overdue), never as block decoration.
- Rows keep a stable order (the contract's, else by name) — never reshuffled while searching.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one row per resource, a shared time axis, free time visible per row,
creation from an empty cell with resource and time filled, the commands, loops and disciplines.
Only the window shrinks, because a whole day of hours across many rows does not fit a phone width.
Where this section and the layout described above differ, this section wins on mobile.

- **A short shared window** (a few hours) spans the full width of every row, the same window for
  all rows, so a column of time still compares resources; earlier / later controls and a "now"
  anchor page it. The window never scrolls sideways.
- **Each row is the resource name on its own line**, its lane of blocks full width below it.
  Blocks clipped by the window carry a small edge mark, never squeezed.
- **Tapping an empty stretch** of a lane opens the creation view of its own, with back, resource
  and start filled; fields one per line, the commit at the bottom.
- **A block opens its detail as a view of its own**, with back; moving to another time or another
  resource happens there, never by dragging. Back returns to the same window and scroll.
- **Filters** collapse behind one control in the header; the active one shows as a short caption.
- **Touch**: every target is at least 44px high, lanes included; nothing depends on hover.

Mobile attention hierarchy: 1. the lanes against the shared window, 2. the free stretches,
3. the blocks, 4. the window controls.

Forbidden on mobile:
- the full-day axis shrunk to fit, or anything that scrolls sideways;
- each row with its own time scale;
- a list of bookings with no lanes and no free time shown;
- drag as the way to move or reassign a block.

## Forbidden

- Day or week columns as the main axis — that is `calendarGrid`; here the rows are resources.
- A chronological list of items with inline actions — that is `agendaTimeline`.
- A creation form that asks for the resource or time the user just pointed at.
- Inventing resources, capacity, opening hours or conflict rules the contract does not declare.
- Drag-to-move or drag-to-reassign without a contract command to commit it.
- Blocking success dialogs, page-level toasts carrying validation, steps to create a booking.

## Signals (how to check the generated page)

1. **S1 Resource rows:** the main surface has one row per resource with its name in a label
   column; there are no day columns.
2. **S2 Shared axis:** all rows share one horizontal time axis; a given time is the same x
   position in every row.
3. **S3 Free time visible:** a resource with no bookings in the window still renders its full
   empty row.
4. **S4 Prefilled creation:** creating from an empty cell opens a form with resource and start
   already set, not as typed fields.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "timeline",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewData"],
    "forbid": ["groupNavigateSteps"]
  }
}
```
