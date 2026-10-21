# userAccessManagement — experience `roleMatrix` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, roles — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The page where the **access model itself is designed**: roles are the central structure —
a matrix of role × permission when the contract exposes permissions, or role columns with
their members when it exposes membership — and people are attributed to roles, not
configured one by one. The unit of thought is the ROLE: "what does Manager grant, and who
holds it?" Where `memberDirectory` administers one person at a time inside the model,
this page draws the model that the directory then applies. Target: the whole access
design readable on one screen, and a change to it made deliberately, in one place,
affecting everyone it should.

## How to instantiate from the defs (the slots)

- **Roles come from the contract's declared roles** — one column (or section) per role,
  named in business words, all visually equal; never invent a role or a permission.
- **With permissions declared, the matrix is the stage**: permissions as rows, grouped as
  the contract groups them (by module, by capability), roles as columns; each cell states
  granted or not with one consistent mark — readable as text, never color alone. When the
  contract's grant commands allow it, the cell is the toggle, confirmed explicitly.
- **With membership declared, each role carries its members**: count first, the names
  beneath, and one picker-driven control to assign a person INTO the role — people are
  picked from the contract's users query, never typed.
- **Role lifecycle commands** (create, rename, disable), only if declared, live at the
  structure level — quiet controls near the role's own heading, outcome-named.
- **Cross-section reading is the point**: the same permission row crossing every role
  column is how imbalance is seen — keep rows strictly aligned across roles.
- **Session/context inputs never render as fields**: the acting admin is known. Ids are
  never typed — roles, permissions and people are all picked or toggled, never referenced
  by hand.

## Attention hierarchy (the spine of this experience)

1. The role structure — how many roles, what they are, side by side.
2. The grants — the matrix cells or member lists, the model's substance.
3. Assignment controls — picking people into roles.
4. Lifecycle commands and captions, demoted.

## Loops

- Read a role top to bottom (what it grants) → read a permission across roles (who can do
  this) → spot the asymmetry → change the one cell or membership that fixes it → the
  model updates in place; the matrix never re-sorts or reflows under the change.
- Attribution loop: pick a person into a role → they appear in the role's member list
  where the eye is → the count increments. Removing is the same gesture, confirmed when
  the contract marks it consequential.
- The page's stability is its value: same role order, same permission grouping, visit
  after visit — the admin learns the model by position.

## Feedback & feedforward

- A grant toggle or membership change states its scope before commit ("everyone with
  this role") — the blast radius is feedforward, and the confirm button names the
  outcome.
- While a change runs, only the touched cell or member entry locks with a running state;
  the rest of the matrix stays readable and workable.
- Failure renders at the cell or the role section that failed, in normal body color, with
  retry — never at the top of the page, never as a toast.
- Success is the cell's own new state or the member list's change — no page banner.
- A role with no permissions or no members says so in its own column, once, quietly —
  the empty column still occupies its position.

## Disciplines (transversal — always)

- The page name appears once, in the header; role names head their columns, never the
  page title again, and **no heading anywhere repeats the label of a button or link near
  it**.
- A control is navigation OR action, never both: cells and pickers change the model,
  and any link to a person's profile is a link only.
- Link color only on real links; granted/denied marks and counts are muted or semantic,
  never blue, never color alone.
- One consistent cell vocabulary across the entire matrix; a mark means the same thing in
  every column.

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
Everything above holds: the role as the unit of thought, the stable order, the deliberate change
with its stated scope, feedback and disciplines. Only the shape changes, because a role × permission
matrix cannot fit a phone's width. Where this section and the layout described above differ, this
section wins on mobile.

- **Still the model, not the people**: the phone still answers "what does this role grant, and who
  holds it?" — role by role instead of all roles side by side. The home view is the list of roles,
  never a list of users.
- **The home view lists the roles** in the contract's stable order, one per row: the role name
  first, large, then its member count and its granted-permission count (when the contract declares
  them) small, right-aligned. A role with nothing granted or no members says so in its row. The
  row opens the role.
- **A role opens as a view of its own**, with back that returns to the role list at the same
  place: first its permissions, grouped exactly as the contract groups them, one permission per
  line with its granted/denied state as a toggle (when grant commands allow it) readable as text;
  then its members, with the picker that assigns a person into the role.
- **Cross-role reading survives as a count, not as a matrix**: the role list's permission counts
  are how imbalance is spotted on a phone; the same permission keeps the same group and position
  in every role view, so the admin still learns the model by position.
- **The change stays deliberate**: toggles in a role view are pending until one explicit save at
  the bottom, where the thumb reaches it, which states the scope before commit ("Grant 2
  permissions to 14 people with Manager"). Back with pending changes asks one plain confirmation.
- **Role lifecycle** (create, rename, disable, only if declared) lives quietly at the foot of the
  role list or of the role view, outcome-named.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the roles (in the list) or the role's grants (in its view), 2. its
members and the assignment picker, 3. the save with its stated scope, 4. the way back.

Forbidden on mobile:
- the role × permission matrix squeezed, zoomed out, or scrolled sideways;
- a user list as the home view, or per-user permission overrides in a role view;
- toggles that commit one by one with no stated scope;
- a role view that drops, regroups or reorders permissions differently from the other roles.

## Forbidden

- A user list with a per-person panel as the page's structure — that is the
  `memberDirectory` experience, not this one.
- Per-user permission overrides drawn inside the matrix; the matrix holds roles, and
  exceptions belong wherever the contract declares them.
- Instant-commit toggles with no confirm and no stated scope on grants that affect many
  people.
- Reordering roles or permissions by usage, alphabet-of-the-day, or any data-driven
  reshuffle; the model's layout is stable.
- Typed ids, typed role names, or typed permission keys for anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; redirects after a change; inventing roles,
  permissions, counts or groupings the contract does not declare.
