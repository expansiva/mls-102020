# entityRecordManagement — experience `focusedRecordForm` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, transitions — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

One business record — a project, a contract, a campaign — cared for in **one continuous,
comfortable column**: fields grouped by subject, read top to bottom like a well-organized
sheet, with the record's lifecycle available as contextual buttons. Create and edit are
the same place: the empty form and the filled form are the same page in two states. Where
`recordPageTabs` splits a rich record into tabbed sections saved one at a time, this is a
single scene with a single save — the whole record is one thought.

## How to instantiate from the defs (the slots)

- **A quiet identity header**: the record's name (or "New contract" while creating) and
  its current status as a small chip. In edit mode the header shows saved values; the
  form below holds the editable ones.
- **The form column comes from the command's inputs, grouped by subject**: identity
  fields first, then the substance (dates, values, relations), optional free text last
  and visually quiet. Each group gets a short subject title — never the page title again.
- **Selection inputs are pickers** (which customer, which owner); ids are never typed.
  **Session/context inputs never render as fields** — show them, if useful, as a quiet
  caption ("Created by Maria"), never editable.
- **Status transitions come from the contract's transition commands**: each renders as
  one contextual button near the header, present ONLY when the current status allows it.
  The label names the outcome in business words ("Activate campaign", "Close contract").
  Transitions with consequences confirm in plain words naming the consequence.
- **Required fields are visibly required before any mistake is made** (feedforward), not
  discovered on submit.

## Attention hierarchy (the spine of this experience)

1. Identity header — which record, what state.
2. The form column, subject groups in declared order.
3. The single save button at the end of the column.
4. Transition buttons — present, contextual, never competing with save.

## Loops

- Create: fill the column top to bottom → save → the page becomes the edit state of the
  new record, header filled, transitions appearing as the contract allows. No redirect
  to a different-looking page.
- Edit: change fields anywhere in the column → the save button wakes → save → the
  header reflects the saved values. Transition: one button, one confirm when needed,
  status chip updates in place.

## Feedback & feedforward

- Validation is field-level, at the field, at commit time — never a toast.
- The save button stays disabled until required fields are filled (and, in edit, until
  something changed); its label names the outcome ("Save project"), never "Submit".
- Command failure renders inside the form, above the save button, in normal body color,
  with retry; entered values are never lost. A failed transition reports next to its own
  button, the same way.
- Success is quick and local — a brief inline confirmation near save, the page stays.
- Leaving with unsaved changes asks one plain confirm — never silent loss.

## Disciplines (transversal — always)

- The page name appears once, in the header. Group titles never repeat the page title,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: save saves, transitions transition,
  and neither ever navigates.
- Link color only on real links; captions, statuses and group titles are muted, not blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Tabs, an identity header with per-section saves, or any sectioned shell — that is the
  `recordPageTabs` experience, not this one.
- A wizard or steps to create the record; the column is the whole form.
- A list of other records on this page, or search — this page owns exactly one record.
- Transition buttons for states the contract does not allow from the current status, or
  a transition hidden inside a menu when the contract declares few of them.
- Typed ids for anything the defs marks as selection/session/context.
- Blocking success dialogs, page-level toasts carrying validation, redirects after save.
