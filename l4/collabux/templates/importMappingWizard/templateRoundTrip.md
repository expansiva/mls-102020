# importMappingWizard — experience `templateRoundTrip`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, bindings — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (cycle dialect — a round trip, repeated until clean)

An import that **starts by handing the user the right file**: download a ready template whose
columns already are the target fields, fill it offline at one's own pace, upload it, and read
an error report that says exactly which row and column to fix. Fix in the spreadsheet,
upload again; the cycle repeats until the report is clean, then commit. There is no mapping,
because the template fixed the columns before the data existed. Built for large or
delegated imports — a supplier filling a price list, a team preparing a migration over days.
Where `stagedImport` walks someone's arbitrary file through mapping and validation acts and
`mappingWorkbench` lets an expert map a dropped file live, this answers "what exactly must my
file look like, and what is still wrong with it?". Target: the report, not the user's memory,
carries the work between attempts.

## How to instantiate from the defs (the slots)

- **The template comes from the contract's TARGET fields**: one column per field in declared
  order, header in business words. When the contract declares a template/download command,
  the download uses it; otherwise the page builds the file from the target fields alone — a
  header row, nothing else. Never sample rows or invented example data.
- **Next to the download, the column guide**: one line per target field — name, required or
  optional, the accepted form the contract declares (a date format, an allowed list). This
  is the feedforward that the offline work relies on.
- **The upload region hosts the upload command**: drop and browse, quiet until the first
  attempt; on read it states the file name and rows found.
- **The error report comes from the validate command's result**: a verdict line ("212 rows
  ready · 9 rows with 11 problems"), then the problems grouped by column, each entry naming
  the row number as the spreadsheet shows it and the problem in words. A file whose header
  does not match the template is reported first, as one plain entry listing the columns
  missing or unexpected. Rows that pass are a count, not a list.
- **The report can be taken offline** when the contract returns it as a file or the problems
  as rows: one "Download error report" control beside the verdict.
- **The commit button** names the outcome with the count ("Import 212 rows"), enabled only
  when the report is clean (or, when the contract declares skipping, labeled with the skip).
- **Session/context inputs never render as fields; ids are never typed.**

## Attention hierarchy (the spine of this experience)

1. Before any upload: the download and the column guide.
2. After an upload: the verdict line of the latest attempt.
3. The problems, grouped by column, with row numbers.
4. The commit button, unlocked by a clean report.

## Loops

- Download → fill offline (minutes or days) → upload → read the report → fix in the
  spreadsheet → upload again → clean → import.
- Each new upload replaces the report entirely; the previous attempt's counts stay as one
  muted line ("Last attempt: 14 problems") so progress across attempts is visible.
- The download stays available after every attempt; the template never changes between them.

## Feedback & feedforward

- The column guide states every rule the contract declares before the file is filled.
- A failed upload or validate reports in the upload region, in normal body color, with retry.
- A commit failure reports above the commit button, with retry; the report stays.
- While validating, the report region shows an honest running state; the download stays usable.
- Success states what was imported, with rollback only if the contract declares it; the page
  then stands ready for the next file. No redirect, no banner.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it** (the report region is never titled "Upload").
- A control is navigation OR action, never both; download downloads, upload uploads, the
  commit commits, nothing navigates.
- Link color only on real links; guide lines, counts and row numbers are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — not in the template's headers either.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the template first, no mapping, the report as the memory between attempts,
the commit only on a clean report, feedback and disciplines. Only the regions stack, because the
guide, the upload and the report cannot sit side by side. Where this section and the layout
described above differ, this section wins on mobile.

- **Download first, full width**, with the column guide under it as a list, one target field per
  row: name, required or optional, accepted form wrapped under it.
- **Upload is one large browse control** (dropping a file is a desktop gesture); the file name
  and row count show under it, wrapped, never cut.
- **The report is a list**: the verdict line on top, then groups by column, each problem one row
  naming the spreadsheet row number and the problem in words.
- **After the first upload the guide folds** into one line with "Show columns", so the report
  leads; the download stays visible.
- **The commit sits at the bottom**, full width, its label with the count.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the verdict line, 2. the problems by column, 3. the upload control,
4. the commit.

Forbidden on mobile:
- the report as a wide table, or anything that scrolls sideways;
- editing rows on the page instead of in the file;
- a commit reachable while the latest report has problems (unless skipping is declared and named);
- a column mapping screen of any kind.

## Forbidden

- A column mapping step or selector of source columns — the template fixed them; mapping is
  `stagedImport` and `mappingWorkbench`.
- A live preview bench of the file's rows — that is `mappingWorkbench`.
- Template files with sample rows, invented examples or columns the contract does not declare.
- Problems reported without the row number and column, or only as a total.
- Editing the imported rows on the page; the spreadsheet is the place of correction.
- Typed ids, editable session/context values; toasts or banners carrying validation.

## Signals (how to check the generated page)

1. **S1 Template first:** before any upload, a download of a template is offered with a column
   guide listing every target field and whether it is required.
2. **S2 No mapping:** there is no control to choose which file column feeds which field.
3. **S3 Row-level report:** after an upload, problems are listed with the row number and the
   column, in words, under a verdict line with counts.
4. **S4 Re-upload cycle:** the upload stays available after a report, and a new upload replaces
   the report; the commit enables only when the report is clean.

## Molecule rules

```json
{
  "axes": { "upload": "dropzone", "validation": "summary", "feedback": "inline" },
  "groups": { "prefer": ["groupSelectFileForUpload"], "forbid": [] }
}
```
