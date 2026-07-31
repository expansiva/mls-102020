# workPlanningBoard — experience `timelineList` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A planner's working list: **every task ordered by deadline**, the next thing due always at
the top, the gaps in ownership fixable without leaving the list. Unassigned tasks take an
assignee right on the row; deeper edits open a detail panel beside the list; new tasks
arrive through a sliding panel. Where `ganttLite` draws the plan as bars in time, here
time is an ORDERING, not a drawing — the page is a prioritized queue of commitments, and
its power is that the eye and the hand never leave the list.

## How to instantiate from the defs (the slots)

- **The task query is the list, ordered by due date**, soonest first; overdue tasks rise
  above everything and their DATE (only the date) takes the alarm color. Each row: task
  identity, due date (right-aligned), assignee, status chip — only fields the contract
  declares.
- **Quick-assign comes from the assign command**: rows without an assignee show an
  inline assignee picker in the assignee slot — pick a person and it commits at once.
  Assigned rows show the name as plain text; reassignment happens in the detail panel,
  not inline (inline is for filling gaps fast, not for churn).
- **Selecting a row opens the detail panel beside the list** (master-detail): the edit
  command's fields grouped by subject, selection inputs as pickers, its own save. The
  list stays visible; the selected row stays marked.
- **The create command is one button** above the list, label naming the outcome ("New
  task"), opening a sliding panel with the create fields; on success the new task slides
  into the list at its deadline position, briefly marked.
- **Session/context inputs never render as fields**; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. Overdue rows — the debt, alarm color on the dates only.
2. The upcoming list in deadline order.
3. Unassigned rows' inline pickers — the gaps asking to be filled.
4. The create button; the detail panel only when open.

## Loops

- Scan by deadline → fill an ownership gap inline without opening anything → keep
  scanning. The quick-assign loop is the heart: two interactions, no navigation.
- Row → detail panel → adjust dates or status → save → the row updates AND re-sorts to
  its new deadline position, briefly marked so the eye can follow it.
- Create → panel → save → the panel closes, the list absorbs the new row in order.

## Feedback & feedforward

- Quick-assign commits on selection: the row shows a running state in its assignee slot;
  failure renders inside that row, in normal body color, with retry — other rows stay
  usable and the picker's choice is not lost.
- Panel validation is field-level, at the field, at commit time — never a toast. The
  panel's save stays disabled until valid (and dirty, when editing); its label names the
  outcome ("Save task").
- Panel failure renders inside the panel, above its button, with retry.
- Success is local: panel closes, row updates in place. No page banners.
- Closing a dirty panel asks one plain confirm — never silent loss.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: rows open the panel, pickers assign,
  buttons commit — nothing on this page leaves it.
- Link color only on real links; dates, statuses and captions are never blue.
- Alarm color belongs ONLY to overdue dates; a list that is all red ranks nothing.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Bars, time-proportional drawing, a today line, or any time canvas — that is the
  `ganttLite` experience, not this one.
- Kanban columns, drag-and-drop, or grouping that breaks the single deadline order.
- Inline editing of anything beyond the assignee gap — dates and statuses change in the
  detail panel, deliberately.
- Navigating to a separate page to create or edit; a modal replacing the panels.
- Typed ids for assignees or any selection/session/context input.
- Blocking success dialogs, page-level toasts carrying validation, redirects after save.
