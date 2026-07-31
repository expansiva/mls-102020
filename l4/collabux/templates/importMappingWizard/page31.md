# importMappingWizard — experience `mappingWorkbench` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, bindings — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

One bench, the whole import on it: the file's real first rows in view, the mapping beside
them, and validation reacting live to every mapping change. Built for the operator who
imports the same format every week and wants zero corridor — drop the file, glance at the
verdict, adjust one selector, commit. The page converges instead of progressing: each
adjustment moves the validation verdict closer to green, and the commit unlocks when the
bench says ready. Where `stagedImport` walks four acts so nothing must be held in the
head, this trusts the expert to read the whole bench at once.

## How to instantiate from the defs (the slots)

- **The file region** hosts the upload command, quiet at the top; once a file lands it
  shows name and row count and, right below, **the preview: the file's REAL first rows**,
  exactly as read — the ground truth the whole bench works against. Never sample data,
  never invented rows.
- **The mapping region** sits beside the preview: one row per TARGET field from the
  contract — name, required or optional stated up front — with a selector of the file's
  detected columns. Source columns are always chosen, never typed. Choosing a mapping
  highlights that column in the preview, so truth and mapping read as one surface.
- **The validation region** reruns as mappings change: one plain verdict line ("3 of 5
  required fields mapped · 12 rows with errors") plus the first offending entries named
  by row and column in words. It is a live meter, not a gate scene.
- **The commit button** stays with the verdict, disabled until the contract's validation
  passes, its label naming the outcome with the count ("Import 214 rows"). Skipping
  flagged rows is offered only if the contract declares it, and the label then says so.
- **A remembered mapping**, when the contract provides one, arrives pre-applied and
  plainly marked as such — one glance to confirm, one selector to correct.
- **Session/context inputs never render as fields**; ids are never typed anywhere.

## Attention hierarchy (the spine of this experience)

1. The preview — what the file actually says.
2. The mapping — how it will be read.
3. The live verdict — whether it is safe.
4. The commit — one button, unlocked by the verdict.

## Loops

- Drop file → verdict appears → adjust a selector → verdict recomputes → repeat until
  green → commit. The loop is seconds long; nothing navigates.
- Replacing the file keeps the mapping and revalidates against the new rows — the weekly
  format changes files, not mappings; a mapping that no longer matches says so per row.

## Feedback & feedforward

- Validation speaks in words at the region and at the offending mapping row — never only
  by color, never as a toast.
- A failed upload or commit reports inside its own region, in normal body color, with
  retry; mappings and the preview stay untouched.
- While committing, the button shows a running state and the bench locks; success is one
  local line with what was imported and rollback only if the contract declares it. The
  bench then stands ready for the next file. No redirect, no banner.
- Before any file exists, each region says once, quietly, what will appear there.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (the verdict region is never titled "Import").
- A control is navigation OR action, never both; nothing on this bench navigates.
- Link color only on real links; preview rows, verdict counts and captions are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Explicit acts with a progress rail and a separate validation scene — that is the
  `stagedImport` experience, not this one.
- Hiding the file's real rows, or validating against anything but them.
- A commit that enables while the contract's validation still fails, or that silently
  drops rows without the label saying so.
- Typed source columns, typed ids, editable session/context values.
- Blocking the whole bench while validation recomputes — the meter updates, the bench
  stays workable.
- Wizard vocabulary anywhere ("step", "next"); toasts or page banners for validation;
  redirects after success.
