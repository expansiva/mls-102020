# customerManagement — experience `directoryProfile` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A directory with a strong finder: search and the customer list dominate one side, and the
selected customer's profile fills the other — identity, commercial data, contacts and
history stacked as calm vertical blocks, read top to bottom. The list is the front door;
the profile is the room. Where `relationshipHub` makes one customer's world the whole
page, here **finding is as important as reading**: the directory never yields its side of
the stage. Target: from a half-remembered name to the right customer's phone number in
seconds.

## How to instantiate from the defs (the slots)

- **The finder comes from the collection query and its declared search input**: search on
  top, then the list — name loudest, one secondary fact per row (status, city, whatever
  the contract exposes) to disambiguate namesakes. Paginated as the contract paginates.
- **The profile is a stack of labeled blocks from the selected customer's fields**, in
  this order when present: identity (name, status), commercial data (documents, terms),
  contact details, then related collections — contacts as a compact sublist, history/
  activity as a reverse-chronological list, each entry showing what and when. Only
  collections the contract actually relates; never invent a "timeline" from nothing.
- **Edit is an explicit switch** on the profile: the update command's inputs, prefilled,
  Save/Cancel; the finder stays usable meanwhile.
- **Creation happens in the profile area**: a single "New" action above the list opens
  the create command's inputs; on success the new customer joins the list and becomes
  the selection.
- **Deactivation is a quiet action** at the profile's foot, labeled by outcome, one plain
  confirmation naming the customer.
- Session/context inputs never render as fields; ids are never typed — the selection IS
  the id. Never invent scores, values or segments the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The profile of the selected customer — the answer.
2. Search and the list — the question, always available.
3. Related sublists (contacts, history) — depth inside the profile, below the facts.
4. Lifecycle actions — present, subdued, last.

## Loops

- Type a fragment → the list narrows → select → read the profile → act (call, correct,
  deactivate) → search the next name. Selection never clears the search.
- Correcting data: switch to edit → Save → the profile returns to read mode with the
  saved values, the list row updated in place. No redirect, no lost scroll.

## Feedback & feedforward

- Required fields visibly required before any mistake; validation at the field, in words,
  at commit time — never a toast.
- Command failure renders inside the profile, above its button, normal body color, with
  retry; the finder stays untouched.
- Save stays disabled until valid and changed; its label names the outcome ("Save
  customer").
- Success is local: inline confirmation on the profile, updated row in the list. No
  page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, in the header; the profile's title is the customer's name,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, buttons commit; a phone or
  email rendered as a link is a link and nothing else.
- Link color only on real links; history entries and captions stay muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A highlight band of the customer's value/status crowning the page with related lists as
  its center — that is the `relationshipHub` experience, not this one.
- Navigating to another page for the profile; list and profile share this stage.
- Collapsing the finder to a mere breadcrumb or hiding it while reading a profile.
- Tabs that fragment the profile into hidden panes; blocks stack and scroll.
- Typed ids for anything the defs marks as selection/session/context.
- Invented relationship metrics, sentiment labels or activity placeholders — an empty
  history says once, quietly, what will appear there.
