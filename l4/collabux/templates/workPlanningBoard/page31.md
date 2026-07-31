# workPlanningBoard — experience `ganttLite` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The plan **drawn in time**: one row per task, one bar per row, the bar's position and
length showing when it starts and how long it runs, a marked "today" cutting the canvas,
overdue work unmistakable at a glance. This page answers spatial questions — what
overlaps, what is stacked next week, what slid past today — that no list can answer.
Where `timelineList` is a prioritized queue read top-down, this is a picture read
left-to-right; the layout is the information.

## How to instantiate from the defs (the slots)

- **The task query becomes rows on a time canvas**: task identity on the left as a fixed
  label column, the bar drawn from the task's start to its due date. A task with only a
  due date renders as a point marker on that date — never an invented span; duration is
  drawn only when the contract provides both ends.
- **Today is a single vertical marker** across the whole canvas, quietly labeled once.
- **Overdue is unmistakable**: the portion of a bar past today (or a marker past today
  on an unfinished task) takes the alarm color. Completed tasks are muted, never red.
- **Selecting a bar (or its label) opens a quiet detail region** with the task's fields
  and the edit command — dates, assignee as a picker, status — with its own save. The
  canvas stays; the selected row stays marked.
- **Drag-to-reschedule exists ONLY if the contract declares a reschedule command.**
  Then: dragging a bar moves it, dropping commits, the bar shows a running state in
  place. Without the command, bars are read-only and the page says so once, quietly —
  never a drag that lands nowhere.
- **The create command, when declared, is one button** above the canvas; the new task
  appears drawn at its dates, briefly marked.
- Rows sort by start (soonest first); the visible window centers on today. **Session/
  context inputs never render as fields; ids are never typed.**

## Attention hierarchy (the spine of this experience)

1. The canvas — the plan's shape, one glance.
2. The today marker — where reality is.
3. Alarm-colored overdue portions — what slid.
4. The label column; the detail region only when open.

## Loops

- Sweep the canvas left to right → spot a pile-up or an overdue bar → open it → adjust
  dates → the bar redraws in place and the eye confirms the fix ON the drawing.
- With reschedule declared: grab → drop → the bar commits where it landed. The picture
  is both the display and the control.

## Feedback & feedforward

- Loading: the canvas frame and today marker first, bars after — the shape before the
  data.
- A drop that fails returns the bar to its original dates AND says so next to that row,
  in normal body color, with retry — never a silent snap-back the eye can miss.
- Detail-region validation is field-level, at the field; its save stays disabled until
  valid and dirty, label naming the outcome ("Save task"); failure renders inside the
  region with retry.
- While a bar commits it shows a running state; the rest of the canvas stays live.
- Success is local — the bar settles, briefly marked. No page banners.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: bars select or reschedule, buttons
  commit — nothing on this page leaves it.
- Alarm color belongs ONLY to overdue portions; the canvas frame, today marker and
  labels stay neutral. Link color only on real links — bar labels are never blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A deadline-ordered list with inline quick-assign as the main surface — that is the
  `timelineList` experience, not this one.
- Drag-and-drop when the contract declares no reschedule command, or a drop that
  commits anything other than dates.
- Invented durations, progress percentages, dependencies or milestones the contract
  does not declare — the canvas draws only contract data.
- Kanban columns, aggregate KPIs, charts above the canvas.
- Typed ids for assignees or any selection/session/context input.
- Blocking success dialogs, page-level toasts carrying validation, redirects after save.
