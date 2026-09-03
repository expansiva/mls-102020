# documentManagement — experience `folderExplorer` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields, hierarchy — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An **explorer of places**: the hierarchy the contract declares (folders, categories,
contract types) is the spine of the page, and the user is always standing IN one node —
breadcrumb above, the node's children and documents below, upload landing exactly where
the user stands. Finding is walking: narrow by place, then pick. Where `libraryList` is
one flat shelf found by metadata and governed in a side panel, this page is a building
found by walking its rooms. Target: the user always knows where they are, and everything
on screen belongs to that place.

## How to instantiate from the defs (the slots)

- **The hierarchy comes from the contract's declared structure** (folder tree, category
  levels) — never invented. The current node owns the page: its name is the working
  heading, its path is the breadcrumb.
- **The breadcrumb is the way up**: every ancestor a real link, current node plain text,
  never a link to itself.
- **Child nodes render before documents**: the node's sub-places first (name plus item
  count only if the contract provides it), then the current node's documents as a grid or
  list of cards — name leading, the couple of facts the contract declares (status,
  updated) quiet on the card. Entering a child node is the page's primary navigation.
- **Upload, when declared, is one primary control scoped to the current node** — the page
  says where the file will land ("Upload to Contracts / 2026") before the user commits;
  what it asks comes only from the command's inputs.
- **Opening a document goes to its own detail** (or viewer) — this page lists and places;
  deep governance does not happen here unless the contract declares quick commands, which
  then live behind one quiet control per card.
- **Session/context inputs never render as fields**; ids are never typed — places are
  entered, documents are picked, never referenced by hand.

## Attention hierarchy (the spine of this experience)

1. The breadcrumb and current node — where am I.
2. Child nodes — where can I go deeper.
3. This node's documents — what lives here.
4. Upload and per-card extras, demoted.

## Loops

- Walk down through child nodes → the breadcrumb grows → pick a document or upload here →
  walk back up by breadcrumb → the visited node is exactly as it was left. Every level
  keeps the same anatomy, so the user learns the page once and reuses it at every depth.
- Upload loop: choose file → confirm into the current node → the new document appears in
  this node's listing where the eye already is — never in some other place, never only in
  a toast.
- An empty node says once, quietly, that nothing lives here yet and keeps the upload
  control available — emptiness in a place is an invitation, not an error.

## Feedback & feedforward

- The upload control names its destination before commit (feedforward) and stays disabled
  until the command's required inputs are valid, validated at the field, in words.
- Upload progress lives at the upload control; failure reports there, in normal body
  color, with retry, keeping the user's file choice — the listing stays.
- A node whose contents fail to load reports inside the listing region with retry; the
  breadcrumb keeps working — the user is never stranded placeless.
- Success is the document's appearance in the listing — no page banner, no redirect.
- While navigating between nodes, the breadcrumb updates immediately and the listing
  skeleton keeps the grid's shape.

## Disciplines (transversal — always)

- The page name appears once, in the header; the current node's name is the working
  heading, never the page title again, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: breadcrumb and node cards navigate, the
  upload button acts, and no card both opens and executes.
- Link color only on real links (breadcrumb ancestors, node entries); card facts and
  counts are muted.
- One anatomy per species: node cards look like places, document cards look like files —
  never interchangeable.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A flat metadata-first list with a preview/governance side panel — that is the
  `libraryList` experience, not this one.
- Approve/reject/version workflows on this page beyond commands the contract explicitly
  declares as quick actions.
- Mixing documents from other nodes into the current listing (global "recent" sections,
  cross-folder search results inline) unless the contract declares such a query — and
  then clearly apart from the node's own contents.
- A breadcrumb that is decoration (unclickable ancestors) or a tree pane fighting the
  breadcrumb for the same job.
- Typed ids or typed paths for anything the defs marks as selection/session/context.
- Page-level toasts carrying validation; redirects after upload; inventing folders,
  counts or facets the contract does not declare.
