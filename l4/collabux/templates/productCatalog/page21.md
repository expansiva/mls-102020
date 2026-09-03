# productCatalog — experience `masterDetailCatalog` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A working desk for the person who keeps the catalog correct: a paginated list of items on
one side, and the selected item, fully readable and correctable, on the other. **Both are
on stage at once** — selecting never navigates away, and the list never disappears while
an item is being fixed. Where `visualCardGrid` is a showcase read through its pictures,
this is a ledger read through its rows. Target: review and correct a run of items one
after another without ever losing the place in the list.

## How to instantiate from the defs (the slots)

- **The list comes from the main collection query**: one row per item — identity first
  (name/SKU), then the two or three facts the contract exposes that distinguish items at a
  glance (price, status), right-aligned when numeric. Paginated as the contract paginates;
  a search input appears only if the contract declares a search/filter input.
- **The detail panel comes from the selected item**: every field the contract exposes, in
  labeled read-only blocks — identity, commercial facts (price, unit), classification,
  and lifecycle status last. The panel opens in read mode; **Edit is an explicit switch**
  into a form of the update command's inputs, prefilled, with Save/Cancel.
- **Creation happens in the same panel**: a single "New" action above the list opens the
  create command's inputs in the panel (list stays visible); on success the new item
  appears in the list and becomes the selection.
- **Lifecycle commands (activate/deactivate) are quiet actions in the panel**, each
  labeled with its outcome, never mixed into the edit form's Save.
- Session/context inputs never render as fields; ids are never typed — the selection IS
  the id. Never invent columns, statuses or metrics the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The selected item's panel — the work happens here.
2. The list — the map of what remains to review.
3. Search and pagination — servants of the list, visually quiet.
4. Lifecycle and delete actions — present, subdued, never competing with Save.

## Loops

- Scan the list → select a row → read the panel → correct if needed → Save → the row
  updates in place → select the next row. The list is the queue; the panel is the bench.
- After Save the panel returns to read mode showing the saved values — proof, not a
  redirect. The list keeps its page, scroll and filters untouched.
- Delete (when the contract provides it) asks one plain confirmation naming the item, and
  on success the selection moves to the nearest neighbor — never to an empty panel with no
  explanation.

## Feedback & feedforward

- Required fields are visibly required before any mistake; validation speaks at the
  field, at commit time, in words — never a toast.
- Command failure renders inside the panel, above its button, in normal body color, with
  retry; the list stays untouched and usable.
- Save stays disabled until the form is valid and changed; its label names the outcome
  ("Save product", not "Submit").
- Success is local: a brief inline confirmation in the panel and the updated row in the
  list. No page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, in the header; the panel's title is the item's name, never
  the page title, and **no heading anywhere repeats the label of a button or link near
  it**.
- A control is navigation OR action, never both: rows select, buttons commit, nothing
  does two jobs.
- Link color only on real links; row selection is a state, not a link; passive captions
  stay muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A grid of media-led cards with maintenance in a modal over it — that is the
  `visualCardGrid` experience, not this one.
- Navigating to another page to view or edit an item; the panel is the only detail.
- Editing directly in list cells, or a panel that opens already in edit mode.
- Typed ids for anything the defs marks as selection/session/context.
- Delete as a casual row icon; destruction lives in the panel, confirmed, named.
- Placeholder rows, invented thumbnails or fake statuses when data is missing — an empty
  list states once, quietly, what will appear there.
