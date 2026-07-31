# hierarchyTreeView — experience `columnsDrilldown` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The PATH is the page. The hierarchy is walked one level per column, left to right, the way
a finder walks folders: the first column is the top level, selecting a node opens its
children in the next column, and the trail of selections stays visible across the screen.
Built for deep hierarchies — account trees, nested locations, multi-level BOMs — where
knowing "where am I and how did I get here" matters more than seeing every branch. Where
`treeAndDetail` shows the whole shape at once, this shows one honest path through it.

## How to instantiate from the defs (the slots)

- **The first column comes from the hierarchy query's top level**; selecting a node fills
  the next column with its children, and so on. Each column is titled by its parent's
  name (the first by the hierarchy's own name), so the column titles READ as the path.
- **A node row shows its name and one quiet fact** when the contract provides it (child
  count, code). A node with children shows a forward marker; a leaf shows none — the
  marker is feedforward, promised before the click.
- **The rightmost position belongs to the selected node's detail**: its fields in reading
  order, then the structural commands — add-child (creates under this node, parent is
  context), edit, move (destination always a picker, never typed), delete (one plain
  confirm naming the node).
- **Session/context inputs never render as fields**; ids are never typed — every node
  reference is a click in a column or a picker choice.
- Deep paths scroll horizontally as one strip; the columns already on screen never
  reshuffle or resize because of content.

## The path (the spine of this experience)

1. The columns themselves — each selection a visible, permanent breadcrumb.
2. The rightmost detail — where the walk currently ends.
3. Forward markers — where the walk could continue.
4. Everything global stays at the edge; nothing competes with the strip.

## Loops

- Click forward → a new column opens → the path grows. Click any earlier column's node →
  the columns to its right are pruned and the walk resumes from there. Descending and
  backtracking are the same gesture: selecting.
- After add-child, the new node appears selected in its column with its detail open;
  after move, the strip re-walks to the node's new position so the path never lies.

## Feedback & feedforward

- Field validation happens at the field, in the detail, at commit time — never a toast.
- A column that fails to load reports inside its own column, in normal body color, with
  retry; the columns already walked stay intact.
- Action buttons stay disabled until their input is complete and their labels name the
  outcome ("Move to Assemblies", not "OK"); a running action locks only the detail.
- Success is local: the strip updates, the detail confirms in one line. No page banners,
  no redirects, no reload of the walk.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a column title is a node's name, never "Add child").
- A control is navigation OR action, never both: column rows advance the walk, detail
  buttons act; nothing else navigates.
- Link color only on real links; forward markers, counts and column titles are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- An expandable tree with a persistent side panel showing the whole structure — that is
  the `treeAndDetail` experience, not this one.
- Expanding a node in place inside its column (children ALWAYS open in the next column).
- A separate breadcrumb bar restating what the column titles already say.
- Typed parent ids, typed destinations, free-text node references.
- Pruning or reordering columns for any reason other than the user selecting upstream.
- Showing siblings of two different levels in one column; alarm color as decoration on
  rows or column titles.
