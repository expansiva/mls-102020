# hierarchyTreeView — experience `orgChartCanvas`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The hierarchy drawn as **a diagram of boxes**: the root on top, each level a row of boxes
below it, lines joining every box to its parent — an org chart. The user reads the shape
spatially ("who reports to whom, how wide is this branch?"), selects one box, and acts on it
right there. Where `treeAndDetail` lists the structure as an indented tree beside a detail
panel, and `columnsDrilldown` walks one path column by column, this page lays out siblings
side by side so span and balance are visible at a glance. Target: see the shape of a branch,
find the box, act on it — and the chart stays fully usable by keyboard, without dragging.

## How to instantiate from the defs (the slots)

- **The boxes come from the hierarchy query**: one box per node — name first, then at most
  two facts the contract declares (head, code, member count), small. Every box has the same
  size and anatomy; a node flagged by the contract (inactive, over-limit) carries its mark
  inside its box.
- **Lines join each box to its parent**, drawn as plain orthogonal connectors; they carry no
  meaning beyond parenthood.
- **Depth is revealed, not forced**: the chart opens with the root and the next two levels;
  a box with hidden children shows an expand marker (with the child count when declared).
  Expanding reveals that box's children below it; expansion survives every edit.
- **Selecting a box shows its action bar** attached under the box: the structural commands
  the contract declares — add child (parent is the selected box, never asked), edit, move,
  delete. Edit opens the node's declared fields in an inspector card beside the box, over the
  canvas, the chart visible around it. Move offers a picker of valid destinations, each with
  its path in words; dragging a box onto another may also move it, but never alone.
- **Session/context inputs never render as fields**; ids are never typed — every node
  reference is a box selection or a picker choice.

## Attention hierarchy (the spine of this experience)

1. The selected box and its branch.
2. The shape of the chart — levels and span.
3. The action bar of the selected box.
4. Zoom, fit and search controls, at the canvas edge.

## Loops

- Look at the shape → expand a branch → select a box → act from its bar → the chart updates
  in place, the box still selected and in view. The chart never resets to the root.
- Keyboard loop: the canvas is one focusable structure; arrow up goes to the parent, down to
  the first child, left / right to siblings; Enter opens the action bar; Escape closes it.
  The canvas scrolls to keep the focused box in view.
- Add child: the new box appears under its parent, selected, with the inspector open on its
  fields. Move: the box is redrawn at its new place and the canvas follows it.
- Fit shows the whole visible chart; zoom in / out are buttons, not only gestures.

## Feedback & feedforward

- Commands stay disabled until their inputs are complete and name their outcome ("Move to
  Finance", not "OK"); while one runs, only the selected box's bar locks.
- Field validation sits in the inspector, at the field, in words.
- A failure reports in the action bar or inspector, in normal body color, with retry; the
  chart stays exactly as it was.
- Delete is the quietest command on the bar, confirmed once naming the node and, when the
  contract states it, what happens to its children.
- A branch that fails to load shows a retry inside the expand marker's place.

## Disciplines (transversal — always)

- The page name appears once, in the header; the inspector's heading is the node's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: boxes select, expand markers reveal, bar
  commands act.
- Link color only on real links; box facts, counts and connectors are muted.
- Same box size at every level; a level's boxes never resize because of their content.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the chart loads branches as they expand.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: boxes and connectors, one selected box, actions on the selected box, the
chart never resetting, and the disciplines. A whole chart cannot fit a phone's width, so the canvas
centres on one box and its neighbourhood. Where this section and the layout described above
differ, this section wins on mobile.

- **The neighbourhood view**: the parent box on top, the selected box large in the middle, its
  children as boxes below, two per row, joined by connectors. Siblings appear as a compact
  "3 more at this level" control under the selected box that lists them.
- **Moving is tapping**: tapping the parent or a child re-centres the chart on it; the path of
  names above the parent ("Company › Operations") is tappable to jump up.
- **The action bar sits at the bottom**, where the thumb reaches, for the selected box; edit and
  add child open their fields as a view of their own, one per line; move opens the picker of
  destinations with paths in words.
- **Back** returns to the previously centred box, as it was.
- **Touch**: every target is at least 44px high; nothing depends on hover or on dragging.

Mobile attention hierarchy: 1. the selected box, 2. its children and parent, 3. the action bar.

Forbidden on mobile:
- the whole chart shrunk to fit, or a canvas that pans sideways;
- dragging as a way to move a node;
- the action bar opened over the boxes it acts on;
- an indented text tree as the home view.

## Forbidden

- An indented expandable tree with a persistent detail panel — that is `treeAndDetail`.
- One column per level walked left to right — that is `columnsDrilldown`.
- Drag-and-drop as the ONLY way to move; pan and zoom only by gestures.
- A canvas without keyboard navigation between boxes.
- Boxes of varying size, decorative colors per level, or photos the contract does not give.
- Typed parent ids or destinations; collapsing branches or resetting the view after an edit.

## Signals (how to check the generated page)

1. **S1 boxes and lines:** nodes render as same-size boxes connected to their parents by lines,
   siblings side by side; no indented list as the main structure.
2. **S2 select to act:** structural commands appear only for the selected box, next to it.
3. **S3 keyboard:** arrow keys move the focus between parent, children and siblings.
4. **S4 move without drag:** moving a node is possible through a destination picker.

## Molecule rules

```json
{
  "axes": { "hierarchy": "orgchart", "validation": "inline-below", "feedback": "inline" },
  "groups": { "prefer": ["groupViewHierarchy"], "forbid": [] }
}
```
