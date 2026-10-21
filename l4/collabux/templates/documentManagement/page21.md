# documentManagement — experience `libraryList` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, statuses — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **curator's library**: one flat list of documents with their governing metadata worn on
the outside — version, status, owner — beside a panel where the selected document is
previewed and governed (approve, archive, version). The structure here is metadata, not
location: the user finds by what a document IS, not by where it lives. Where
`folderExplorer` walks a hierarchy, this page is a single well-labeled shelf with a
reading desk beside it. Target: locate a document by its facts, verify it is the right
one in the panel, and govern it — without ever leaving the page.

## How to instantiate from the defs (the slots)

- **The list is the documents query**: one row per document — name leading, then the
  governing facts the contract declares as compact chips or muted text: version, status,
  owner, last-updated. Uniform anatomy; the status chip is one consistent shape.
- **Filters come from the declared query inputs** (status, type, owner): one quiet row
  above the list. Search, when declared, sits with them. Never invent a facet the
  contract does not declare.
- **The panel binds to the selected row**: preview or best summary the contract exposes
  first, then the full metadata as labeled facts, then the version trail when declared
  (chronological, quiet), then the governance actions. Selecting fills the panel; it
  never navigates.
- **Governance commands render as contextual actions in the panel** — only those valid
  for the document's current status (approve, reject, archive, new version); invalid ones
  are absent, not disabled. Labels name the outcome ("Approve document", "Archive").
- **Upload, when declared, is one primary control above the list** — its scope is the
  library as filtered; what it asks comes only from the command's inputs.
- **Session/context inputs never render as fields**; the acting user is known. Ids are
  never typed — the document is the selected row, owners are picked.

## Attention hierarchy (the spine of this experience)

1. The list — documents and their governing facts.
2. The panel — the selected document, verified then governed.
3. Filters — the lens, quiet until touched.
4. Upload and captions, demoted.

## Loops

- Filter or scan → select → verify in the panel (right version? right status?) → act →
  the row's chips update in place → next document. The list keeps filters, scroll and
  order throughout.
- Version loop: creating a new version from the panel updates the row's version fact and
  prepends the trail — history accretes where the eye already is.
- With nothing selected, the panel says once, quietly, what selecting will show — never
  an auto-selected document pretending the user chose it.

## Feedback & feedforward

- Actions requiring input (a rejection note, a version label) collect it inline in the
  panel, field-validated in words, with the confirm disabled until valid.
- Irreversible governance (archive) confirms once, plainly, restating the document's name
  — one dialog, never two.
- Failure renders inside the panel, above its actions, in normal body color, with retry —
  the list is untouched. An upload that fails reports at the upload control, keeping the
  user's file choice.
- While an action runs, the panel's actions lock; the list stays scannable. Success is
  the row's own chip change plus the panel restating the new status — no page banner.
- A preview that cannot render says so plainly in the preview region and still shows the
  metadata — the panel never goes blank.

## Disciplines (transversal — always)

- The page name appears once, in the header; the panel's heading is the document's name,
  never the page title, and **no heading anywhere repeats the label of a button or link
  near it**.
- A control is navigation OR action, never both: rows select, panel actions govern, and a
  download/open link never doubles as an action button.
- Link color only on real links; chips, metadata and the version trail are muted or
  semantic, never blue.
- One consistent row anatomy; status chips mean the same thing at every occurrence.

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
Everything above holds: the flat shelf found by metadata, verify before governing, the loops,
feedback and disciplines. Only the shape changes, because the list and the reading desk can no
longer sit side by side. Where this section and the layout described above differ, this section
wins on mobile.

- **Side by side becomes a sequence on the same page**: list → document. The document is a view of
  its own with back, inside this page — never another page. The shelf stays one tap away, exactly
  where it was.
- **The list is the home view**: the declared filters and search in one quiet row on top, upload
  (when declared) as one clear control near them, then one document per row — name first, then
  version and status worn small under it as muted text and the one consistent status chip. Rows
  may wrap to two lines; no table, no horizontal scroll.
- **The document view** keeps the panel's order in one column: preview or best summary first,
  then the metadata as labeled facts, then the version trail, then ONLY the governance actions
  valid for the current status, at the bottom where the thumb reaches, labeled by outcome.
- **Actions that need input** (a rejection note, a version label) open their field in place in the
  document view, one field per line, confirm disabled until valid. Archive confirms once, naming
  the document.
- **After acting**, the document view restates the new status; back returns to the list at the
  same filters and scroll, with the row's chips updated.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the list with its governing facts (or, in the document view, the
preview and facts), 2. the valid governance actions, 3. the way back.

Forbidden on mobile:
- a drawer or sheet over part of the list to show the document;
- governance actions on list rows or by swiping a row;
- a preview that replaces the metadata, or a blank view when the preview cannot render;
- losing the list's filters or scroll after visiting a document.

## Forbidden

- Folders, trees, breadcrumbs or any location hierarchy as the page's structure — that is
  the `folderExplorer` experience, not this one.
- Navigating to a separate detail page to govern a document; the panel is the detail.
- Grid-of-thumbnails as the primary listing; the metadata is the finding aid here, not
  the picture.
- Governance actions on list rows (approve directly from the row) — verification in the
  panel comes before action.
- Typed ids for documents, owners, or anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; redirects after an action; inventing statuses,
  versions or facets the contract does not declare.
