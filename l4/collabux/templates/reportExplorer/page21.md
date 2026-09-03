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
