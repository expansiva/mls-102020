# hierarchyTreeView — experience `outlineEditor`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The hierarchy written as **an outline document**: one line per node, nested by indentation,
edited the way one edits a list of topics — type a name, Enter for the next line, Tab to
indent it under the line above, Shift+Tab to bring it back out, move a line up or down in
place. The structure is shaped by writing, not by forms. Where `treeAndDetail` selects a node
in a tree and changes it through a detail panel, and `columnsDrilldown` walks one level per
column, this page has no panel and no walk: the outline is both the view and the editor.
Target: restructure a category tree or a chart of accounts at typing speed, every change
visible where the cursor is, without the hands leaving the keyboard.

## How to instantiate from the defs (the slots)

- **The outline is the hierarchy query**: one line per node, the name as editable text,
  nested under its parent by a fixed indent step; a collapse marker on lines with children.
  At most one quiet fact (code, count) at the line's end, when declared.
- **Renaming is editing the line**: the edit command saves the name when the line loses
  focus or on Enter. Other declared fields open in a small inline details block under the
  line (one keystroke or one control), never a side panel.
- **Enter on a line creates a new sibling below it** through add-child under the same parent
  (the parent is the outline position, never asked); Tab on a new or existing line indents
  it under the line above; Shift+Tab outdents it to its grandparent. Indent and outdent call
  the move command; without a declared move, they are absent and say nothing.
- **Reordering in place** (Alt+Up / Alt+Down, and the same as line controls) uses the
  contract's order or position input; when the contract declares no ordering, lines keep the
  query's order and reorder is absent.
- **Delete** is never a keystroke on a saved line: it is a line command, confirmed once
  naming the node. Backspace on a just-created empty line only discards that line.
- **Session/context inputs never render as fields**; ids are never typed — a parent is the
  line above, a position is where the line stands.

## Attention hierarchy (the spine of this experience)

1. The line under the cursor and its immediate neighbours.
2. The nesting — which lines belong under which.
3. The line's pending or failed state, at the line itself.
4. The keyboard hints and the outline toolbar, quiet.

## Loops

- Write loop: type a name → Enter → type the next → Tab to nest it → Enter → … The outline
  grows at the cursor, and each line saves as soon as it is complete.
- Restructure loop: put the cursor on a line → Shift+Tab or Alt+Up → the line (with all its
  children) moves at once → the cursor stays on it.
- Collapse a long branch to see the shape, expand it to work inside; collapse state survives
  every edit.
- A keyboard hint line ("Tab indent · Shift+Tab outdent · Alt+↑↓ move") stays visible near
  the outline, and a small toolbar offers the same operations for the line in focus.

## Feedback & feedforward

- Each line shows its own state: saving (a quiet marker), saved (nothing), failed (the line
  returns to its last saved place and text, with a short reason and retry under it).
- An indent the contract would refuse (no valid parent above, a depth limit it declares) is
  blocked at the keystroke with a one-line reason, before any call.
- Moving a line with children states the count in the line's marker while it runs ("moving
  4 lines").
- Delete confirms once, naming the node and its children count when declared.
- No page banners, no toasts: every result is visible at the line.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; lines are content, never headings styled as titles.
- A control is navigation OR action, never both: collapse markers reveal, line text edits,
  toolbar commands act on the line in focus.
- Every keyboard operation has a visible control twin; nothing is keyboard-only or
  mouse-only.
- One indent step for every level; indentation always means parenthood.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — branches load as they expand.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the outline as both view and editor, editing in place, indent as
parenthood, per-line states and the disciplines. A phone has no Tab or Alt keys, so the line
operations move to a bar above the on-screen keyboard. Where this section and the layout described
above differ, this section wins on mobile.

- **One line per node**, the name wrapping rather than truncating; the indent step is small and
  stops growing after a few levels, with the depth shown as a quiet number on deep lines.
- **The line bar**: when a line has focus, a bar above the keyboard offers Indent, Outdent, Up,
  Down, Details and Delete as buttons; Enter on the keyboard still adds the next line.
- **Details open inline** under the line, one field per line, saved by their own button.
- **Collapse markers** are their own targets, apart from the line text.
- **Touch**: every target is at least 44px high; nothing depends on hover or on dragging.

Mobile attention hierarchy: 1. the line in focus, 2. its neighbours and nesting, 3. the line bar.

Forbidden on mobile:
- drag handles as the only way to reorder or nest;
- a detail view that replaces the outline for renaming;
- indent that squeezes names into nothing, or any horizontal scroll;
- line operations hidden behind a long-press only.

## Forbidden

- A tree beside a detail panel where nodes are changed through forms — that is
  `treeAndDetail`.
- One column per level — that is `columnsDrilldown`.
- Move destinations chosen from a picker as the primary way to restructure; here position
  is set by indenting and reordering in place.
- Delete bound to a keystroke on a saved line; drag-and-drop as the only way to move.
- Saving the whole outline with one global button; changes are per line.
- Typed parent ids; inventing ordering, depth limits or fields the contract does not declare.

## Signals (how to check the generated page)

1. **S1 outline lines:** nodes render as indented editable text lines; no side detail panel.
2. **S2 keyboard structure:** keyboard handlers on the focused line drive the structure (Enter
   adds the next line; Tab / Shift+Tab indent and outdent wherever the contract allows a move).
3. **S3 control twins:** every keyboard operation offered has a visible control for the line in
   focus.
4. **S4 in-place rename:** a node's name is edited directly on its line.
5. **S5 line state:** a failed change is reported on the line that failed.
