# calendarScheduling — experience `agendaTimeline` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Time as a flow: **the schedule reads as an agenda list, day by day, today first**, built
for a phone in one hand between two appointments. The question it answers is not "where is
free space?" but **"what is next, and what do I do about it?"** — so every item carries its
own actions inline: confirm, reschedule, cancel, whatever the contract commands. Where
`calendarGrid` reads time as a map to place things on, this experience reads time as a
stream to keep up with. No grid, no spatial layout — order and grouping do all the work.

## How to instantiate from the defs (the slots)

- **The agenda comes from the schedule query**: items grouped under day shoulders ("Hoje",
  "Amanhã", then explicit dates), each day's items in time order. Today is the first thing
  on screen; the past is reachable by scrolling or paging up, visibly muted.
- **Each item is a self-sufficient card-row**: time first (large, scannable), then the
  business identity (who/what, as the contract names it), then the one or two facts that
  matter in passing (place, status as the contract declares them).
- **Actions live on the item**: the contract's commands for that item render as inline
  controls — the most likely next action visible, the rest behind one compact overflow on
  the item. Labels name outcomes ("Confirmar", "Remarcar", "Cancelar"), destructive ones
  confirmed once in plain words.
- **Reschedule opens a small in-place editor** on the item: date/time choices from the
  command's inputs, prefilled with current values; the agenda stays behind. On commit the
  item visibly leaves its slot and settles under its new day.
- **Creating**, when the contract provides a create command, is ONE clear entry point in
  the header — a compact form in a panel, participants and resources as pickers (**ids
  never typed**), date/time defaulting to the nearest sensible value the contract implies.
- **Session/context inputs never render as fields**: whose agenda this is comes from the
  session — caption at most, never editable.

## Attention hierarchy (the spine of this experience)

1. Now — today's shoulder and the next upcoming item.
2. Each item's time and identity, readable at walking pace.
3. The item's primary inline action.
4. Later days, in order; the past, muted behind.

## Loops

- Glance at the next item → act on it inline (confirm, reschedule) → the item updates in
  place → glance at the one after. The whole loop happens at thumb reach, no navigation.
- Scroll forward to prepare the week; return to today with one always-visible anchor
  ("Hoje") once the user has scrolled away.

## Feedback & feedforward

- An action in flight shows its running state on the item; only that item locks — the rest
  of the agenda stays live.
- Failure reports on the item itself, normal body color, with retry — never a toast, never
  at the top of the page. The item never disappears on failure.
- Success is local and legible: a confirmed item shows its new state in words; a canceled
  item visibly resolves (marked, then settles) rather than vanishing without trace.
- In-place editor commits are disabled-until-valid, labels naming the outcome ("Remarcar
  para sexta"); field errors at the field.
- A day with nothing scheduled still shows its shoulder with a one-line quiet note — the
  flow of days is never broken; an empty agenda states it once, plainly.

## Disciplines (transversal — always)

- The page title appears once, in the header; day shoulders are dates, not titles, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: item actions act; if the contract links
  an item to a fuller record elsewhere, that is one distinct link on the item, separate
  from its action controls.
- Link color only on what is clickable; past days, captions and shoulders are muted; alarm
  color only for states the contract flags.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A week/month grid, spatial slots, or drag-to-move on a time surface — that is the
  `calendarGrid` experience, not this one; here time is a list, not a map.
- Items without their actions, forcing a detail page round-trip for a confirm or cancel.
- Hiding today below promotional content, filters or summaries; today opens first, always.
- Typed ids for participants or resources; editable fields for session/context values.
- Inventing gaps, travel times, or suggested slots the contract does not declare.
- Blocking success dialogs, page-level toasts carrying validation, redirects after an
  action.
- Steps or wizards to act on an item — every action is one gesture from the agenda.
