# workPlanningBoard — experience `ownerWorkload`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The plan seen **through the people who carry it**: one band per owner, each band showing how
much that person holds and what it is, the unassigned work as a band of its own at the top. The
question it answers is **"who is overloaded, who has room, and who should take this?"** —
planning by redistribution, not by date. Where `timelineList` orders tasks by deadline and only
fills ownership gaps on the row, and `ganttLite` draws tasks in time, this experience makes the
owner the axis: dates are a detail on the task, load is the headline. Target: team leads and
coordinators balancing work across a team.

## How to instantiate from the defs (the slots)

- **Bands come from the owner dimension the contract declares**: a people query when there is
  one (everyone gets a band, even with nothing assigned), else the distinct assignees found on the
  task query. Each band header: the owner's business name and their load.
- **Load is what the contract can measure**: the count of open tasks, or the sum of an effort or
  estimate field when the contract declares one. A quiet bar beside the number shows it relative
  to the heaviest band on screen — never against an invented capacity. When the contract
  declares a capacity per person, the bar is drawn against it, and only then can a band be
  marked over capacity.
- **Tasks inside a band** are compact rows: identity, due date, status — only declared fields —
  in deadline order. Long bands show their first rows and an inline "show all" for the rest.
- **The unassigned band comes first** when the query returns tasks without an owner.
- **Redistributing is one control on the task**: "Reassign to…" opens the owners with their
  current load beside each name, and choosing commits through the assign command. Selecting
  several tasks in one band and reassigning them together exists only when the contract accepts
  more than one task per call.
- **Selecting a task's identity opens a detail panel** beside the bands: its fields and the edit
  command, own save. **Create**, when declared, is one button above the bands; inside a band it
  prefills that owner.
- Filters the contract declares (team, period, status) sit in the header. Session/context inputs
  never render as fields; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The load of each owner, comparable down the page — number and bar.
2. The unassigned band — work nobody carries yet.
3. The tasks inside the heaviest bands, with "Reassign to…" at hand.
4. Header filters and create; the detail panel only when open.

## Loops

- Scan the loads → open the heaviest band → "Reassign to…" on a task → pick a lighter owner (their
  load is in the picker) → the task leaves one band, lands in the other, both loads update.
- Drain the unassigned band: each task gets an owner the same way, until the band is gone.
- Bands keep their order during a session of moves — they never jump while the user balances;
  the order (by name, or the contract's order) is stable.

## Feedback & feedforward

- The picker shows each owner's load before choosing — the consequence is visible ahead.
- A reassign in flight shows a running state on the task; only that task locks.
- Failure stays on the task in its original band, normal body color, with retry; the picker's
  choice is kept. Never a toast.
- Success is local: the task appears in its new band briefly marked; both band numbers update.
- Panel validation at the field; save disabled until valid and dirty, labeled by outcome.

## Disciplines (transversal — always)

- The page name appears once, in the header; band headers are owner names, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: filters and "show all" navigate; "Reassign to…",
  create and save act; task identity opens the panel.
- Alarm color only for overdue dates the contract implies, or for over capacity when capacity is
  declared — never for "most tasks".
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: owners as the axis, load from contract data only, the unassigned band,
"Reassign to…" with loads in the picker, loops and disciplines. Only the depth changes, because
every band open at once is too long for a phone. Where this section and the layout described above
differ, this section wins on mobile.

- **The home view is the roster**: one full-width row per owner with name, load number and bar,
  the unassigned row first. Tapping a row opens that owner's tasks as a view of its own, with back.
- **The owner's view** lists their tasks as full-width rows, identity first, due date and status on
  a second line, "Reassign to…" on the row.
- **"Reassign to…" opens a full-screen list of owners** with their loads; choosing commits and
  returns to the same owner's view, the task gone from it.
- **Back from an owner's view** returns to the roster at the same scroll, the changed loads
  briefly marked. The task detail is a view of its own too, Save at the bottom.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the roster's loads, 2. the unassigned row, 3. an owner's tasks with
"Reassign to…".

Forbidden on mobile:
- every band expanded on one long scroll;
- drag between owners, or swipe as the only way to reassign;
- a picker that hides the owners' loads;
- anything that scrolls sideways.

## Forbidden

- One list ordered by deadline with owners as a column — that is `timelineList`.
- Bars in time or a time canvas — that is `ganttLite`; dates here are row details.
- Day or status columns as the main grouping.
- Invented capacity, effort, utilization percentages or auto-balancing suggestions.
- Reordering bands by load after every move; drag as the only way to reassign.
- Typed ids for owners; blocking success dialogs; redirects after a reassign.

## Signals (how to check the generated page)

1. **S1 Owner bands:** the main surface is grouped by owner, one band (or roster row) per person.
2. **S2 Visible load:** each owner shows a load number derived only from contract data.
3. **S3 Reassign with load:** each task has a reassign control whose owner choices show each
   owner's current load.
4. **S4 Both sides update:** after a reassign, the task moves to the new owner and both owners'
   load numbers change without a page reload.
