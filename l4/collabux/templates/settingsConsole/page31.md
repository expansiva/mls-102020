# settingsConsole — experience `searchableSettings` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A settings surface for someone who already knows what they want to change: **one dominant
search box on top, everything findable through it, edited where it is found**. There is no
map to study and no place to go — typing narrows the whole console down to the handful of
settings that match, shown as expanded groups inline, editable on the spot. Where
`sectionedForm` starts from a place on a stable map, this experience starts from a question
typed by the user; the search box is the front door and the only door.

## How to instantiate from the defs (the slots)

- **The search box owns the top of the page**: generous, focused on load, with a short
  muted hint of what it searches (names, descriptions, values). It filters as the user
  types — this search is local and instant, never a RUN-style query.
- **Matches render as groups expanded inline**: each matching setting appears under its
  group heading (the contract's natural grouping, in business words), already open,
  already editable — never a list of links that make the user click through to a second
  screen. The match IS the editor.
- **Before any search**, the page shows all groups in contract order, collapsed to their
  headings with a one-line muted summary each — a table of contents, not a wall of fields.
  Never invent "popular" or "recent" settings the contract does not declare.
- **Each setting renders complete where it stands**: label, muted description when the
  contract provides one, and its control — switch with the state in words, select for
  enumerations, input for free values, picker for reference values.
- **Session/context inputs never render as fields**: organization, current user and other
  system-resolved values appear at most as a quiet caption in the header, never editable.
- **Ids are never typed**: reference-valued settings always use a picker over the options
  the contract exposes.

## The find-and-fix loop (the heart of this experience)

1. Type — the console narrows live; the matched term is visibly marked in results.
2. Edit in place — the changed setting shows its own pending state, right there.
3. Commit per setting or per small group, whichever the contract's commands allow: the
   commit control sits with the setting it commits, label naming the outcome ("Salvar
   limite de crédito"), disabled until changed and valid.
4. Clear the search (one obvious clear control) — back to the table of contents. The loop
   is seconds long; nothing navigates away.

## No-match state

When the search finds nothing, say so plainly where results would be ("Nada corresponde a
'x'"), keep the search box filled and focused, and offer nothing invented — no suggestions
the contract cannot back. Never a full-page empty illustration that hides the way back.

## Feedback & feedforward

- Validation is field-level, at the setting, at commit time; constraints the contract
  declares are stated before the mistake, not after.
- A commit that fails reports inside the group that failed, above its commit control, in
  normal body color, with retry; other matches stay editable and untouched.
- Success is local and brief — the pending mark clears with a quiet inline confirmation at
  the setting. No page-level banners, no redirect, no scroll jump.
- While a commit runs, only that setting (or its small group) locks; search keeps working.

## Disciplines (transversal — always)

- The page title appears once, in the header; group headings never repeat it, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: on this page nothing navigates — search
  filters, controls edit, commit buttons commit.
- Link color only on what is clickable; group summaries, descriptions and hints are muted
  text, never blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A fixed left-hand section map as the primary navigation — that is the `sectionedForm`
  experience, not this one; here search is the way in.
- Search results as bare links to another page or pane — editing happens inline where the
  match appears.
- A single global save spanning unrelated matches, or commits the user did not see.
- Fabricated result ranking, "suggested settings" or usage counts the contract does not
  provide.
- Typed ids for reference-valued settings; editable fields for session/context values.
- Blocking success dialogs, page-level toasts carrying validation, redirects after commit.
- Steps, wizards or any act-like progression — finding and fixing has no stages.
