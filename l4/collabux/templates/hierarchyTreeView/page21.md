# hierarchyTreeView — experience `treeAndDetail` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The structure IS the page. An expandable tree stands on one side as the permanent map of
the hierarchy — org units, categories, BOM levels — and a detail panel on the other side
serves whichever node is selected: its data, and the actions that change the structure
around it. The user works ON the tree the way a gardener works on a plant: everything
visible, everything reachable, nothing navigated away from. Where `columnsDrilldown` walks
one path at a time, this shows the whole shape at once and edits it in place.

## How to instantiate from the defs (the slots)

- **The tree comes from the hierarchy query**: one row per node showing its name and, when
  the contract provides one, a single quiet fact (a count, a code). Expand/collapse per
  node; expansion state survives every edit — the map never folds itself.
- **Selecting a node fills the detail panel**: the node's fields in reading order, its
  place stated in words ("Inside: Operations › Warehouse"), then the structural actions.
- **Structural commands become panel actions**: add-child creates under the SELECTED node
  (the parent is context, never asked); edit works on the panel's own fields; move offers
  a picker of valid destinations — a new parent is always chosen, never typed; delete is
  a quiet action guarded by one plain confirm naming the node.
- **Session/context inputs never render as fields**; ids are never typed anywhere — every
  node reference on this page is a selection in the tree or a picker.
- Nodes flagged by the contract (inactive, over-limit) carry their mark inside their own
  row — the flag colors the data, never the tree frame.

## Attention hierarchy (the spine of this experience)

1. The tree — the map, always visible, never replaced.
2. The selected node's panel — data first, then structural actions.
3. The node's path in words, quiet, inside the panel.
4. Everything global (search within the tree, if the contract declares it), at the edge.

## Loops

- Expand → select → read → edit or restructure → the tree updates in place, the edited
  node stays selected and visible. The map never resets to root after an action.
- Add-child inserts the new node into the tree, expanded into view, selected, its panel
  ready — creation flows straight into detailing.
- Move updates the node's position in the tree the moment it succeeds; the eye follows
  the node, not a reload.

## Feedback & feedforward

- Field validation happens at the field, in the panel, at commit time — never a toast.
- A structural action that fails reports inside the panel, above its buttons, in normal
  body color, with retry; the tree stays exactly as it was.
- Action buttons stay disabled until their input is complete (a move needs a chosen
  destination) and their labels name the outcome ("Move to Warehouse", not "OK").
- Success is local: the tree changes, the panel confirms in one line. No page banners.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (the panel title is the node's name, never "Edit node").
- A control is navigation OR action, never both: tree rows select, panel buttons act;
  nothing on this page navigates away.
- Link color only on real links; expand markers, paths and counts are muted text.

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
Everything above holds: the structure IS the page, the whole shape reachable by expanding,
structural actions on the selected node, the loops, feedback and disciplines. Only the shape
changes, because the tree and the panel can no longer sit side by side. Where this section and
the layout described above differ, this section wins on mobile.

- **The tree stays the home view**, as an indented list with expand/collapse per node. It is
  never replaced by one level at a time: expanding opens children in place, under their parent.
  The expand marker and the node name are two separate targets — the marker expands, the name
  selects.
- **Deep levels still fit**: the indent step is small and stops growing after a few levels, so
  the name always keeps most of the width and may wrap to a second line rather than be cut short.
  The quiet fact (count, code) stays at the right of the row. No horizontal scroll.
- **The panel becomes the node view**, a view of its own with back, inside this page: the node's
  name, its place in words ("Inside: Operations › Warehouse") — which carries the depth the
  indent no longer shows — then its fields, then the structural actions at the foot.
- **"The map is always visible" holds as**: the tree is one back away and unchanged — same
  expansion, same scroll, the node still marked. The map never folds itself.
- **Structural actions on a phone**: add-child and edit open their inputs as views of their own,
  commit at the bottom; move opens a picker of valid destinations, each shown with its path in
  words; delete is the quietest action, at the very foot, with its plain confirmation.
- **After an action**, the tree shows the result where it happened: a new child opens its node
  view ready for detailing, and back lands on the tree expanded to it, marked; a moved node is
  revealed at its new place.
- **Touch**: every target is at least 44px high, expand markers included; nothing depends on
  hover.

Mobile attention hierarchy: 1. the tree, 2. the selected node's data, then its structural actions,
3. its path in words, 4. the way back to the tree.

Forbidden on mobile:
- one screen per level, drilling through children — that is the `columnsDrilldown` experience;
- horizontal scroll to reach deep levels, or indent that squeezes names into nothing;
- a tree that collapses, resets to root or loses its scroll after back or after an action;
- the node form stacked under the tree on one long screen, or a drawer covering the tree.

## Forbidden

- One column per level with the path laid out horizontally — that is the
  `columnsDrilldown` experience, not this one.
- Replacing the tree with the selected node's children, or any view where the whole
  structure is not reachable by expanding.
- Editing in a blocking modal; forms that hide the tree.
- Typed parent ids, typed node ids, or free-text destinations for move.
- Collapsing the tree or losing selection after add/move/edit.
- Drag-and-drop as the ONLY way to move a node; alarm color on tree rows as decoration.
