# entityRecordManagement — experience `inlineBlockEdit`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, transitions — never contradict it); this skill is the
> flavor: how the page moves, focuses and feels. Where the two seem to conflict, the defs
> wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The record **reads as a summary first and becomes editable one block at a time, in place**:
every subject of the record is shown as a block of plain read-only values, and a block's
"Edit" turns just that block into a small form right where it stands, with its own Save and
Cancel. Saving returns the block to reading, with the new values. The page is for records
that are read far more often than they are changed — a contract consulted weekly, a property
updated twice a year — where an always-open form invites accidental edits and hides the
facts behind input boxes. Where `focusedRecordForm` keeps the whole record as one open form
with one save and `recordPageTabs` hides each subject behind a tab, this answers "what does
this record say — and can I fix this one part without touching the rest?". Target: reading
is calm and complete; changing is local and deliberate.

## How to instantiate from the defs (the slots)

- **An identity header**: the record's name and status chip, read-only; the transitions the
  current status allows sit beside it as contextual buttons, named for their outcome.
- **One block per subject group of the command's inputs**, in declared order, all visible
  at once, one column. Each block shows a short subject title and its values as label/value
  lines in plain words; an empty value reads "Not set" in muted text, never a blank.
- **Each block has one "Edit" control**; editing turns only that block into fields (pickers
  for selections, ids never typed). Only one block is editable at a time.
- **Each block saves on its own**: when the contract declares per-subject commands, the
  block's Save uses its own; otherwise Save sends the record's update command with only that
  block's values changed. Its label names the subject ("Save billing").
- **Session/context inputs never render as fields** — at most a quiet caption in the header.
- **Create mode**: the identity block opens already editable; the other blocks read "Not set"
  and their Edit wakes once the first save creates the record.

## Attention hierarchy (the spine of this experience)

1. The identity header — which record, what state.
2. The blocks, read as a summary top to bottom.
3. The one block being edited, when one is.
4. The transitions — contextual, never competing with a block's Save.

## Loops

- Read → spot the part to change → Edit on that block → change → Save → the block returns
  to reading with the new values, briefly marked as just saved.
- Edit on another block while one is dirty asks one plain confirm naming the dirty block —
  never two blocks open, never silent loss.
- A transition from the header updates the status chip in place; the blocks stay as they are.

## Feedback & feedforward

- Required fields are visibly required as soon as a block opens.
- Validation is at the field, in words, at the block's Save — never a toast.
- A failed block save reports inside that block, above its Save, with retry; the block stays
  open with every value kept, and the other blocks are untouched.
- Cancel returns the block to its saved values without asking when nothing changed.
- Leaving the page with a dirty block asks one plain confirm.

## Disciplines (transversal — always)

- The page name appears once, in the header; block titles never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: Edit opens a block, Save saves it, Cancel
  discards, transitions transition — nothing navigates.
- Link color only on real links; values, captions and "Not set" are never blue.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — if a region has no business name, it has no
  heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the summary first, one block editable at a time, each block saved on its
own, transitions in the header, create mode, feedback and disciplines. The page is already one
column; only the open block's Save moves so it stays within the thumb's reach. Where this section
and the layout described above differ, this section wins on mobile.

- **Blocks stack full width**, values as label-above-value lines that wrap, never cut.
- **Edit sits at the top right of each block**, with a 44px target.
- **The open block stays in place** with one field per line; the page scrolls so its first field
  is near the top.
- **The open block's Save and Cancel ride in a bar at the bottom** while that block is open,
  naming the subject; the bar disappears when the block returns to reading.
- **Transitions sit under the identity header**, wrapping onto more lines when needed.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the identity header, 2. the blocks as summary, 3. the open block
and its Save bar.

Forbidden on mobile:
- every block open as one long form;
- a block opening as a separate screen or sheet instead of in place;
- a Save bar present while no block is open, or one that saves several blocks;
- horizontal scroll of any kind.

## Forbidden

- The whole record as one always-open form with a single save — that is `focusedRecordForm`.
- Subjects hidden behind tabs, one visible at a time — that is `recordPageTabs`; here every
  block is visible as a summary.
- Two blocks editable at once, a global save, or a save that commits other blocks.
- Inputs shown in reading state, or editing triggered by clicking a value instead of Edit.
- Transitions inside blocks, or transitions the current status does not allow.
- Typed ids; blocking success dialogs, toasts carrying validation, redirects after save.

## Signals (how to check the generated page)

1. **S1 Summary first:** on load every block shows read-only values; no input is visible.
2. **S2 One block at a time:** Edit turns only that block into fields; other blocks stay read-only
   and cannot be opened together with it.
3. **S3 Local save:** each open block has its own Save named for its subject, and saving returns
   that block to reading.
4. **S4 All blocks visible:** every subject is on the page at once, without tabs.
