# assetManagement — experience `assetRegistry` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The registry is the module's book of record: **a searchable list of assets on one side,
the complete dossier of the selected asset on the other**. The user's question is "tell me
about this asset" — identity, location, who answers for it, and where it stands in its
life cycle. Where `maintenanceBoard` ranks assets by how urgently they need work, this
experience treats every asset as equally findable and equally documented; urgency is a
fact in the dossier, not the organizing principle of the page.

## How to instantiate from the defs (the slots)

- **The list comes from the asset query**: one row per asset — business identity first
  (name/code as the contract labels it), then the two or three facts that distinguish it
  in a scan (type, location, lifecycle state as declared). Search and the contract's
  filters sit compactly above; filters are pickers and choices, **ids never typed**.
- **Selecting a row fills the dossier pane** (beside the list; over it on narrow screens):
  every field the contract provides, grouped by subject — identification, location and
  assignment, lifecycle — in that reading order, labels in business words.
- **Lifecycle renders as state plus contextual transitions**: the current state is written
  in words, prominently; next to it appear ONLY the transitions the contract allows from
  this state (assign, send to maintenance, retire), each a command button labeled by
  outcome ("Enviar para manutenção"). Transitions the state does not allow simply do not
  render — no disabled graveyard of every possible action.
- **Editing** the dossier's editable fields, when the contract commands it, happens in the
  pane — edit in place or a pane-level edit state — never a navigation away.
- **Creating an asset** is one clear entry point above the list, opening a form in the
  pane; required fields visibly required before any mistake (feedforward).
- **Session/context inputs never render as fields**: the registering user, the
  organization — caption at most, never editable.

## Attention hierarchy (the spine of this experience)

1. Search and filters — the way to reach any asset in seconds.
2. The list — scannable identity, selection always visible.
3. The dossier — the selected asset, complete.
4. The lifecycle transitions — contextual, few, consequential.

## Loops

- Search → select → read the dossier → act (edit a field, fire a transition) → the row
  and dossier update in place → next asset. Selection moves without losing search state.
- The audit habit: location or responsible looks wrong → correct it in the pane → the list
  reflects it immediately.

## Feedback & feedforward

- Field validation at the field, at commit time; commit buttons disabled until valid,
  labels naming the outcome ("Salvar alterações", never "Submit").
- A transition that fails reports inside the dossier, above the transitions, normal body
  color, with retry; the list stays untouched. Destructive or irreversible transitions
  (retire) confirm once, in plain words about the consequence.
- Success is local: the state text updates, the row updates, a brief inline confirmation
  in the pane — no page banner, no redirect.
- List loading shows skeleton rows; a search with no matches says so in the list area, in
  words that echo the query — never invented rows. An empty dossier pane (nothing
  selected) says once, quietly, what selecting will show.

## Disciplines (transversal — always)

- The page title appears once, in the header; the dossier titles itself with the asset's
  name, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, transition buttons act;
  no row both selects and fires a command.
- Link color only on what is clickable; dossier labels, captions and passive state text
  are muted; alarm color only on facts the contract flags.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Organizing the page around urgency — cards ranked by due maintenance owning the top —
  that is the `maintenanceBoard` experience, not this one; here the registry is neutral
  and the list is the spine.
- Rendering every possible lifecycle action regardless of state, or transitions the
  contract does not allow from the current state.
- Typed ids for locations, responsibles or any reference; editable session/context values.
- Detail as a separate page navigation; the list must survive every action.
- Inventing health scores, utilization metrics or maintenance predictions the contract
  does not declare.
- Blocking success dialogs, page-level toasts carrying validation, steps or wizards to
  create or edit an asset.
