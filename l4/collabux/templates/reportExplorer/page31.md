# reportExplorer — experience `catalogOfReports` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, inputs, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

Two acts for a report consumer, not a report builder. **Act one: a gallery of the reports
this module offers** — each a card that says in plain words what question it answers.
**Act two: the chosen report takes the whole screen**, its few filters compressed into a
compact bar on top, its result underneath, export at hand. The consumer's skill is
choosing the right report, not composing parameters — so choosing is the designed moment,
and everything after it is kept light. Where `parameterPanel` gives an analyst a
composition surface with a deliberate RUN, this experience gives a reader a shelf of
answers and gets out of the way.

## How to instantiate from the defs (the slots)

- **Act one — the gallery.** Each report query in the contract becomes one card: the
  report's business name, a one-or-two-line description of the question it answers (from
  the contract's own descriptions — never invented), and nothing else. Cards are uniform
  in size and weight; the gallery is grouped by subject when the contract declares
  grouping, alphabetical otherwise. No thumbnails faking data, no usage counts, no
  "popular" badges the contract cannot back.
- **The whole card opens the report** — one gesture, act two begins. Opening replaces the
  gallery; one clear, consistent control returns to it ("Todos os relatórios").
- **Act two — the report screen.** The report's name heads the screen once. The query's
  inputs compress into ONE compact filter bar across the top: periods as range choices,
  references as pickers (**ids never typed**), sensible defaults from the contract so the
  report renders something meaningful on open whenever its required inputs allow it.
- **Session/context inputs never appear in the filter bar** — resolved by the system,
  caption at most, never editable.
- **The result fills the rest**: the contract's data as a real table or list — column
  labels in business words, numbers right-aligned with tabular figures, units/currency as
  declared — plus a muted line restating the active filters in words.
- **Export**, when the contract provides it, sits with the result and acts on what is
  shown ("Exportar este resultado").

## The two-act choreography

- The gallery is calm and complete: every report visible or one scroll away; with many
  reports, a simple filter-by-name field at the top — local and instant, not a query.
- In act two, changing a filter refreshes the result directly — filters here are few and
  cheap by design, and the compact bar IS the control surface; no separate run ritual.
  While refreshing, the old result dims rather than vanishes; the new one replaces it
  whole.
- Back to the gallery always returns to the same shelf, unchanged; reopening a report
  starts it fresh at its defaults.

## Feedback & feedforward

- Filter validation at the control; an incomplete required filter states what is missing
  where the result would be ("Escolha um período para ver este relatório") — in words,
  before any error can happen.
- A failed refresh reports inside the result region, normal body color, with retry;
  filters stay as set. Export failure reports beside the export control.
- A report with no rows for the chosen filters says so in words that echo the filters —
  an answer, not an error; never invented rows or sample data.
- Gallery loading shows skeleton cards; act two loads the filter bar first, result after.

## Disciplines (transversal — always)

- The page title appears once — the gallery's header in act one, the report's name in act
  two — and **no heading anywhere repeats the label of a button or link near it** (a card
  is not titled "Abrir relatório").
- A control is navigation OR action, never both: cards and the back control navigate;
  filters filter; export exports. No control does two of these.
- Link color only on what is clickable; card descriptions, filter echoes and captions are
  muted; alarm color only on values the contract flags.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A dedicated parameter panel with an explicit RUN gate as the report's interface — that
  is the `parameterPanel` experience, not this one; here filters are a compact bar and
  refresh is direct.
- Gallery and an open report on stage at once; two reports open side by side.
- Cards decorated with invented metrics, fake previews, ratings or usage data.
- Typed ids in filters; editable session/context values; charts or totals the contract's
  data cannot back.
- Burying the gallery behind a search-only entry — the shelf is visible, browsable, and
  the point.
- Blocking success dialogs, page-level toasts carrying validation, redirects after
  export.
- Steps or wizards beyond the two acts — choosing and reading are the whole story.
