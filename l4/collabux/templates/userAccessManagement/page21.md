# userAccessManagement — experience `memberDirectory` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, roles — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **directory of people**: the list of users with their access status worn openly, beside
a panel where the selected person's access is read and changed — roles, permissions, and
the administrative acts (invite, disable, reset). The unit of thought is the PERSON:
"what can Maria do, and is her access healthy?" Where `roleMatrix` designs the access
model itself, this page administers individuals within it. Target: find a person, see
their whole access picture at a glance, change it — without leaving the page.

## How to instantiate from the defs (the slots)

- **The list is the users query**: one row per person — name and identifier the contract
  declares (email) leading, access status as one consistent chip (active, invited,
  disabled — only statuses the contract declares), role(s) muted beside it. Uniform,
  scannable anatomy.
- **Filters come from the declared query inputs** (status, role, team): one quiet row
  above the list, with search when declared. Never invent a facet.
- **The panel binds to the selected person**: identity first, then access status in plain
  words ("Active since…", from contract data only), then their roles and permissions as
  readable facts — grouped as the contract groups them — then the administrative actions.
- **Role changes are pickers in the panel**: assigning or removing a role picks from the
  contract's declared roles, applied with an explicit confirm — never typed, never
  instant-on-click.
- **Account commands render as contextual actions** — only those valid for the person's
  current status (invite for absent, disable for active, reset for locked); invalid ones
  absent, not disabled. Labels name the outcome ("Disable access", "Send reset").
- **Invite, when declared, is one primary control above the list**; it asks only what the
  command's inputs declare.
- **Session/context inputs never render as fields**: the acting admin is known. Ids are
  never typed — people are selected, roles are picked.

## Attention hierarchy (the spine of this experience)

1. The list — people and the health of their access.
2. The panel — the selected person's full access picture, then the actions.
3. Filters — the lens, quiet until touched.
4. Invite and captions, demoted.

## Loops

- Search or filter → select a person → read their access → change a role or fire an
  account action → the row's chip updates in place → next person. Filters, scroll and
  selection survive every action.
- Audit loop: filter by a status ("disabled", "invited, never accepted") and walk the
  list top to bottom — the row anatomy must make an unhealthy status visible without
  opening the panel.
- With nobody selected, the panel says once, quietly, what selecting will show — never an
  auto-selected person.

## Feedback & feedforward

- Consequential commands (disable, reset) confirm once, plainly, restating the person's
  name and the consequence — one dialog, never two. Self-lockout, when the contract
  exposes the acting user, deserves an explicit warning in that confirm.
- Actions requiring input (invite email, a reason) collect it inline, field-validated in
  words, confirm disabled until valid and labeled with the outcome.
- Failure renders inside the panel, above its actions, in normal body color, with retry —
  the list is untouched.
- While an action runs, the panel's actions lock; the list stays scannable. Success is
  the row's chip change plus the panel restating the new state — no page banner.
- Alarm color only on statuses the contract flags as unhealthy (locked, expired) — never
  on the disable button by default.

## Disciplines (transversal — always)

- The page name appears once, in the header; the panel's heading is the person's name,
  never the page title, and **no heading anywhere repeats the label of a button or link
  near it**.
- A control is navigation OR action, never both: rows select, panel actions act, and no
  action doubles as a link.
- Link color only on real links; status chips and role labels are muted or semantic,
  never blue.
- One consistent row anatomy; a status chip means the same thing at every occurrence.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Roles or a permission matrix as the page's central structure — that is the `roleMatrix`
  experience, not this one.
- Editing permissions one by one per user when the contract models access through roles;
  the panel assigns roles, it does not fork the model per person.
- Instant role changes without an explicit confirm, or account actions fired from list
  rows without the panel's context.
- Navigating to a separate profile page to manage access; the panel is the profile here.
- Typed ids, typed role names, or editable fields for anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; redirects after an action; inventing roles,
  permissions or statuses the contract does not declare.
