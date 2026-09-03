# importMappingWizard — experience `stagedImport` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, bindings — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

An import as a short story with a safe ending: upload, map, validate, confirm — four acts
on a slim rail, one act on stage at a time, and NOTHING touches real data until the final
act says so. Built for the occasional importer and the risky file: every act earns the
next, errors get their own scene instead of a red sidebar, and the user always knows what
will happen before it happens. Where `mappingWorkbench` puts the whole shop on one bench
for the expert, this walks the corridor so nobody has to hold the whole import in their
head.

## How to instantiate from the defs (the slots)

- **Act 1 — the file.** The upload command becomes one generous drop-and-browse region;
  on success the act shows what was read (file name, rows found, detected columns) and
  only then enables Continue. Nothing else shares this stage.
- **Act 2 — the mapping.** One row per TARGET field from the contract: field name,
  required or optional stated up front (feedforward), and a selector of the file's REAL
  detected columns — source columns are always chosen, never typed. A suggested match,
  when the contract provides one, arrives pre-selected and plainly marked as a guess.
- **Act 3 — validation, a scene of its own.** The validate command runs on entering; its
  result is a corrigible list grouped by kind of problem, each entry naming the row and
  column in plain words and pointing to its remedy — fix the mapping (Back one act) or
  fix the file (back to Act 1). Rows that pass are a stated count, not a list.
- **Act 4 — the confirmation.** A plain-words summary of consequences ("Import 214 rows,
  skip 3 with errors") and the single commit button naming the outcome ("Import 214
  rows"). The commit happens HERE and only here.
- **Session/context inputs never become fields or acts**; ids are never typed. The
  closing scene states what was done and offers rollback only if the contract declares
  it, plus one quiet way onward. No redirect.

## The rail and the choreography

- The rail shows the four acts, current one highlighted. **The rail is a map, not
  navigation**: future acts are muted, never link-colored, never clickable; going back
  is a dedicated Back control, one act at a time, values preserved.
- Continue stays disabled until the act is satisfied, and its label says where it leads
  ("Continue to validation"). Continue never commits; only Act 4's button commits.
- Re-uploading a different file plainly resets mapping and validation — said in one
  confirm before it happens, never silently.

## Feedback

- Each act validates itself before Continue enables; errors speak at the field or the
  list entry, in words, never only by color.
- A failed command (upload, validate, commit) reports inside the current act, above its
  button, in normal body color, with retry; entered work is never lost.
- While committing, the button shows a running state and the act locks; success is the
  closing scene, not a banner.

## Disciplines (transversal — always)

- The page name appears once; act titles are short and their own ("Map the columns"),
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: Continue and Back move, the commit
  commits, nothing does two jobs.
- Link color only on real links; rail dots, counts and captions are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Preview, mapping and live validation sharing one screen — that is the
  `mappingWorkbench` experience, not this one.
- Committing, or writing anything real, before Act 4; a Continue that imports.
- The rail as tabs or links; skipping validation; a validation act that only says a
  number without a corrigible list.
- Typed source columns, typed ids, editable session/context values.
- Silently dropping bad rows — every skipped row is counted and said out loud in Act 4.
- Toasts or page banners carrying validation; redirects after success.
