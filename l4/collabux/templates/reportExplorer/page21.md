# reportExplorer — experience `parameterPanel` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, inputs, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A report is a question asked precisely: **the parameter panel on the left is where the
question is composed; the result on the right is the answer, produced only when RUN is
pressed**. Nothing is live, nothing recomputes behind the user's back — the analyst sets
every parameter deliberately, runs, reads, adjusts, runs again. The result always belongs
to the parameters that produced it, and the page never lets those two drift apart
silently. Where `catalogOfReports` serves consumers who pick a ready report from a
gallery, this experience serves the person who composes the question themselves.

## How to instantiate from the defs (the slots)

- **The panel comes from the report query's inputs**: each input becomes one parameter
  control — periods as range choices, references as pickers over what the contract
  exposes (**ids never typed**), enumerations as selects or choice groups, thresholds as
  value inputs. Required parameters visibly required before any mistake (feedforward).
- **Session/context inputs never render as parameters**: the requesting user, the
  organization — resolved by the system, caption at most, never editable.
- **RUN is the panel's single conclusion**: one button at the panel's end, disabled until
  required parameters are set, label naming the outcome ("Gerar relatório"). Changing any
  parameter never re-runs anything — execution is always this button, always explicit.
- **The result region renders what the query returns**, shaped as the contract declares
  it: tabular data as a real table (column labels in business words, numbers
  right-aligned with tabular figures, units/currency as declared), aggregates as a
  compact summary line above the table — never charts the contract's data cannot back.
- **A parameter echo heads the result**: one muted line restating the question in words
  ("Jan–Mar · Obra Central · apenas aprovados") so a printed or screenshotted result
  carries its own context.
- **Export and schedule**, when the contract provides them, live on the RESULT, act on
  the current run, and say so ("Exportar este resultado") — they never run the report.

## Attention hierarchy (the spine of this experience)

1. The parameter panel — the question under construction.
2. RUN — the one deliberate act.
3. The result, headed by its parameter echo.
4. Export/schedule, quiet, after the content.

## The run discipline

- After a run, editing any parameter marks the result as stale — visibly, in words ("Os
  parâmetros mudaram desde esta execução") — but the result stays readable until the next
  run replaces it. Stale is a state, not an error.
- Each run replaces the result wholly; there is no partial merge of two questions.
- Before the first run, the result region states once, quietly, what running will show —
  never sample data, never a spinner with nothing behind it.

## Feedback & feedforward

- Parameter validation at the control, at interaction time; cross-parameter constraints
  the contract declares are stated before RUN enables, not discovered after.
- A failed run reports inside the result region, normal body color, with retry; the
  parameters stay exactly as set. While running, RUN shows a running state and the panel
  locks; a long run says it is still working rather than pretending to be stuck.
- A run with no rows is an answer: state it in words that echo the parameters ("Nenhum
  lançamento no período") — never invented rows, never a generic empty state.
- Export failure reports beside the export control, with retry; the result stays.

## Disciplines (transversal — always)

- The page title appears once, in the header; the result's echo line is not a heading,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: RUN runs, export exports; if a result
  row drills down to a record elsewhere, that link is the row's one navigation and it
  never re-runs anything.
- Link color only on what is clickable; the parameter echo, captions and stale notices
  are muted; alarm color only on values the contract flags.

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
Everything above holds: the question composed deliberately, RUN as the one act, nothing live, the
result bound to its parameters, the run discipline, feedback and disciplines. Only the shape
changes, because the panel and the result can no longer sit side by side. Where this section and
the layout described above differ, this section wins on mobile.

- **Side by side becomes a sequence**: parameters → result. Each is a view of its own, inside
  this page. The parameters view is the home view and stays one stage: every parameter control
  one per line, never split into steps.
- **RUN sits at the bottom of the parameters view**, where the thumb reaches, disabled until the
  required parameters are set. While it runs, the view locks and RUN shows its running state;
  when the run returns, the result view opens. A failed run speaks in the result view, with retry.
- **The result view opens with the parameter echo**: one compact, muted summary of the parameters
  that produced it, always at the top, with "change parameters" right beside it. That control
  goes back to the parameters view with every value exactly as set, and never runs anything.
- **The last result stays reachable** from the parameters view by one quiet link; if a parameter
  changed since the run, the result view says it is stale, in words, until RUN replaces it.
- **Tabular results fit the column**: a table of two or three narrow columns may stay a table;
  wider ones become a list of rows — the first column as identity, the rest as label and value,
  numbers right-aligned with tabular figures. The aggregate summary line stays above the rows.
- **Export and schedule**, when declared, sit at the foot of the result view and act on this run.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the parameters (or, in the result view, the echo and then the
result), 2. RUN, 3. the way between the two views, 4. export/schedule.

Forbidden on mobile:
- any run not caused by RUN — not on back, not on changing a parameter, not on opening the result;
- a result view without its parameter echo at the top;
- parameters lost or reset on the way back from the result, or split across steps;
- wide tables or any horizontal scroll.

## Forbidden

- A gallery of ready-made report cards as the entry — that is the `catalogOfReports`
  experience, not this one; here there is one report surface and the panel is the way in.
- Live recomputation on parameter change; any execution not caused by RUN.
- A result shown without its parameter echo, or kept fresh-looking after parameters
  changed.
- Typed ids in parameters; editable session/context values; invented charts, totals or
  columns the contract does not return.
- Blocking success dialogs, page-level toasts carrying validation, redirects after a run.
- Steps or wizards to compose parameters — the panel is one stage, not a sequence.
