# importMappingWizard — experience `pasteFromSpreadsheet`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, bindings — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An import with **no file at all**: the user selects rows in their spreadsheet, copies, and
pastes them straight into a paste area on the page. The rows appear at once as a preview
grid, the columns line up with the target fields, and each problem is flagged on the cell
that has it — the user fixes it in the spreadsheet and pastes again, or fixes the cell in
place. Built for small, frequent batches (forty prices, a dozen new contacts) where saving,
naming and uploading a file is the heaviest part of the job. Where `stagedImport` walks a
file through four acts and `mappingWorkbench` maps a dropped file's columns on one bench,
this answers "I already have the rows on my clipboard — can they go in now?". Target:
copy, paste, glance, import, in under a minute.

## How to instantiate from the defs (the slots)

- **The paste area hosts the contract's upload/read input**: one generous region focused on
  load, with one muted line saying what to paste ("Copy the rows from your spreadsheet,
  header included, and paste here"). The pasted text is sent as the tabular text a
  spreadsheet copies (tab-separated rows); when the contract only accepts a file, the paste
  is packaged as that file — never a second, invented command.
- **The expected columns come from the contract's TARGET fields**, shown above the paste area
  in declared order as a strip of column names, required ones marked — the feedforward that
  tells the user how to arrange their copy before pasting.
- **The preview grid shows the REAL pasted rows**, exactly as read, under target-field
  headers. When the first row reads as a header, columns are matched by name; otherwise by
  position. Each header carries a column picker so a mismatched column is re-chosen, never
  typed. A suggested match the contract provides arrives marked as a guess.
- **Validation runs on every paste and every cell fix** (the contract's validate command):
  problems are marked on the offending cell and named in words; a verdict line above the grid
  counts them ("38 rows ready · 2 with problems").
- **Cells are editable in place** only when the contract accepts edited rows; otherwise the
  fix is always "correct in the spreadsheet and paste again".
- **The commit button** names the outcome with the count ("Import 38 rows"), disabled until
  validation passes; skipping rows with problems only if the contract declares it, and then
  the label says so. **Session/context inputs never render as fields; ids are never typed.**

## Attention hierarchy (the spine of this experience)

1. The paste area — empty, it is the whole page; filled, it shrinks to "Paste again".
2. The preview grid with its flagged cells.
3. The verdict line.
4. The commit button, unlocked by the verdict.

## Loops

- Copy in the spreadsheet → paste → grid and verdict appear → fix in place or paste again →
  verdict green → import. Nothing navigates.
- Pasting again replaces the rows and keeps the column choices, revalidating at once; a choice
  that no longer fits says so on its header.
- After success, the page states what was imported and returns to an empty paste area, ready
  for the next batch.

## Feedback & feedforward

- A paste that does not read as rows (one long line, no columns) says so in the paste area in
  words, with what was expected — never an empty grid.
- Problems speak at the cell and in the verdict, in words, never only by color, never as a toast.
- A failed validate or commit reports above the commit button, in normal body color, with
  retry; the pasted rows stay.
- While committing, the grid locks and the button shows a running state.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both; nothing on this page navigates.
- Link color only on real links; the column strip, verdict counts and captions are muted.
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
Everything above holds: no file, the paste as the way in, the real rows as ground truth, live
validation, the commit unlocked by the verdict, feedback and disciplines. The grid becomes a list
of rows, because a spreadsheet's width cannot fit a phone. Where this section and the layout
described above differ, this section wins on mobile.

- **The paste area is full width** with one large "Paste" control that reads the clipboard, plus
  the field itself for a long-press paste. The expected column names stack above it as a list.
- **The preview is a list of rows**: each row as stacked target-field / value lines, the
  problems first, each flagged line naming its problem in words under the value.
- **Column choices move into one section above the rows**, one target field per line with its
  picker and the first real value of the chosen column in small text.
- **The verdict line is pinned at the top** while the rows scroll.
- **The commit sits at the bottom**, full width, its label with the count.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the paste control, 2. the pinned verdict, 3. the rows with
problems, 4. the commit.

Forbidden on mobile:
- the preview as a wide grid, or anything that scrolls sideways;
- splitting paste, columns and rows into steps with "next";
- a file picker offered as the way in;
- a verdict that scrolls out of sight while rows are fixed.

## Forbidden

- A file upload as the way in, or a separate validation scene behind a rail — that is
  `stagedImport`.
- A file-based mapping bench where the rows are a sample of a dropped file — that is
  `mappingWorkbench`; here the pasted rows ARE the import, all of them visible.
- Silently dropping, trimming or reordering pasted rows; every skipped row is counted in the label.
- Typed source columns, typed ids, editable session/context values.
- Toasts or page banners carrying validation; redirects after success.

## Signals (how to check the generated page)

1. **S1 Paste first:** the main input is a paste area focused on load; no file chooser is the
   primary way in.
2. **S2 Expected columns:** the target fields are listed, required ones marked, before anything
   is pasted.
3. **S3 Live rows:** after a paste, the pasted rows appear at once with problems marked on the
   offending cell (or line, on mobile) in words.
4. **S4 Counted commit:** the commit button carries the number of rows it will import and stays
   disabled while validation fails.
