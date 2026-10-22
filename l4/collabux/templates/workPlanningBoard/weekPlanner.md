# workPlanningBoard — experience `weekPlanner`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The week as **seven buckets of work**: one column per day, each task placed in the day it is
planned for, moving between days by an explicit control. The question it answers is **"what gets
done on which day this week, and which day is overloaded?"** — a planning decision made by
placing, not by reading dates. Where `timelineList` orders every task by deadline in one queue,
and `ganttLite` draws each task's span as a bar in continuous time, this experience treats time as
discrete days: a task belongs to a day, and planning is moving it to another. Target: team leads
and individuals planning the coming week, day by day.

## How to instantiate from the defs (the slots)

- **Columns are the days of the visible week** (the working days, or all seven when the contract
  data reaches weekends), each headed by weekday and date, today marked. Earlier / later controls
  page the week; a "this week" anchor returns to it.
- **Cards come from the task query, placed by the contract's planning date** — the planned or
  scheduled date when declared, else the due date. Each card: task identity, assignee and status
  as the contract declares them. Inside a day, cards keep the query's order.
- **An unplanned tray** sits before the first day only when the query returns tasks without that
  date: they wait there to be placed. Without such tasks, the tray does not render.
- **Each day header shows how many cards it holds** — a count of what is drawn, never an invented
  capacity or effort. When the contract declares an effort field, the header may sum it instead.
- **Moving is a control on the card**: "Move to…" opens the week's days (and the tray when it
  exists) and commits through the reschedule command, or the edit command's date input. Drag
  between columns may exist as a shortcut, never as the only way. Without any command that
  changes the date, cards do not move and the page says so once, quietly.
- **Selecting a card opens a detail panel** over the week: its fields and the edit command, with
  its own save. **The create command**, when declared, is a quiet "add" at the foot of each day,
  the date prefilled from that column — never typed again.
- Session/context inputs never render as fields; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The seven columns as a whole — the shape of the week, today marked.
2. The day counts — which day carries too much, which is empty.
3. The cards in each day, identity readable at column width.
4. The unplanned tray, when present; the detail panel only when open.

## Loops

- Look across the week → spot a heavy day → "Move to…" on one of its cards → choose a lighter day
  → the card settles in its new column and both counts update.
- Empty the tray: take an unplanned card → move it to a day → the tray shrinks until it is gone.
- Add on a day → short panel with the date filled → save → the card appears in that column.

## Feedback & feedforward

- A move in flight shows a running state on the card in its new column; only that card locks.
- A failed move returns the card to its origin day and says why on that card, normal body color,
  with retry — never a silent snap-back, never a toast.
- Panel validation is at the field; save stays disabled until valid and dirty, label naming the
  outcome ("Save task"); failure inside the panel, above its button.
- A day with no cards still shows its column with a quiet empty note — the week never collapses.
- Success is local: the card settles, briefly marked, counts update. No banners, no redirect.

## Disciplines (transversal — always)

- The page name appears once, in the header; column headers are dates, and **no heading anywhere
  repeats the label of a button or link near it**.
- A control is navigation OR action, never both: week paging navigates; "Move to…", add and save
  act; cards open the panel.
- Alarm color only for states the contract flags (overdue); a heavy day is shown by its count,
  never painted red by an invented threshold.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-card button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: days as buckets, cards placed by the planning date, the day counts, the
tray, moving by "Move to…", loops and disciplines. Only one day fits the width at a time, so the
week becomes a strip of days above one day's cards. Where this section and the layout described
above differ, this section wins on mobile.

- **A strip of the week's days at the top**: short day cells (weekday, date, count) that fit the
  width, today marked, the chosen day highlighted; earlier / later page the week. The strip never
  scrolls sideways; the tray, when present, is one more cell at its start.
- **Below it, the chosen day's cards** as full-width rows: identity first, assignee and status on
  a second line, a "Move to…" control on the row.
- **"Move to…" opens a short list of the week's days** with their counts; choosing commits, the
  card leaves the day and the strip's counts update. Never drag.
- **A card opens its detail as a view of its own**, with back, Save at the bottom; back returns to
  the same day and scroll.
- **Add** sits at the foot of the day's cards and opens a view of its own with the date filled.
- **Touch**: every target is at least 44px high, day cells included; nothing depends on hover.

Mobile attention hierarchy: 1. the day strip with its counts, 2. the chosen day's cards,
3. "Move to…" on each card.

Forbidden on mobile:
- seven columns shrunk to fit, or anything that scrolls sideways;
- drag between days, or swipe as the only way to move a card;
- a strip without counts, hiding which day is heavy;
- a detail view that loses the chosen day on back.

## Forbidden

- One list ordered by deadline as the main surface — that is `timelineList`.
- Bars or a continuous time canvas — that is `ganttLite`; here a task sits in one day.
- Status columns (to do / doing / done) — the columns are days, never workflow states.
- Drag as the only way to move; a move that commits anything other than the date.
- Invented capacity, effort, thresholds or auto-balancing the contract does not declare.
- Typed ids, a create form asking for the date of the column it came from, blocking dialogs.

## Signals (how to check the generated page)

1. **S1 Day columns:** the main surface has one column per day of a week, headed by weekday and
   date.
2. **S2 Placement by date:** each card sits in the column of its planning date, not grouped by
   status or owner.
3. **S3 Move control:** each card has a non-drag control that moves it to another day.
4. **S4 Day count:** each day header shows how many cards it holds, updated after a move.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "calendar",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewCard"],
    "forbid": []
  }
}
```
