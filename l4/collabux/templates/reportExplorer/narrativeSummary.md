# reportExplorer — experience `narrativeSummary`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A report result is first **told, then shown**: before the table, a short block of highlights
written as sentences with the key numbers inside them — the total, the largest item, the share
of the top few, what is flagged — so the reader knows the answer before reading a single row.
The table stays, complete, below the highlights, as the evidence. Where `parameterPanel` focuses
on composing the question and `catalogOfReports` on choosing the right report, this page answers
**"what does this result say?"** — its designed moment is the reading of the result, not the
asking. Target: a reader who must report upward or decide from a result, and who is not going to
scan two hundred rows to find the three facts that matter.

## How to instantiate from the defs (the slots)

- **Parameters come from the report query's inputs**, as one compact bar above everything:
  periods as range choices, references as pickers (ids never typed), sensible defaults from the
  contract so a result exists on open. A change refreshes the result and its highlights together.
  Session/context inputs never render as parameters.
- **Highlights are computed only from what the query returns**, three to five sentences, each
  carrying at least one number from the result, and each of a fixed kind, in this order:
  - **Total**: the size of the result ("142 entries totalling R$ 1.2 million.") — the row count
    always, plus the total the contract's aggregates return; no aggregate, no invented sum.
  - **Largest**: the top item by the result's leading measure (its first currency or quantity
    column), named, with its value — and its share only when a declared total exists.
  - **Concentration**: how much of the total the top few items hold ("The top 5 suppliers hold
    61%.") — only when the result has a measure and more than five rows.
  - **Flagged**: how many rows the contract flags, when it declares a flag.
  - **Group**: the leading group, when the contract declares a grouping.
  A kind without the data it needs is omitted — never a sentence with a guessed number.
- **Each number in a highlight is a link into the table**: it scrolls to and marks the rows it
  speaks about (the largest item, the flagged rows), never a different page.
- **The table renders what the query returns**: the contract's columns, numbers right-aligned and
  tabular with units, rows drilling down to their record. Export, when declared, acts on this
  result and includes the highlights as its heading text.

## Attention hierarchy (the spine of this experience)

1. The highlights — the result, told in sentences.
2. The table — the full evidence, in the contract's order.
3. The parameter bar and its muted echo of the active parameters.
4. Export, quiet after the content.

## Loops

- Read the highlights → tap the number in "Largest" → the table scrolls to that row, marked →
  drill into it → back returns to the marked row.
- Change a parameter → highlights and table refresh together; a highlight never describes a
  result other than the one under it.

## Feedback & feedforward

- While refreshing, the highlights dim as a whole and are replaced whole — never half old, half
  new sentences.
- A failed refresh reports inside the result region with retry; parameters stay as set.
- A result with no rows is one sentence in the highlights' place, echoing the parameters ("No
  entries between 1 and 15 March."), and no empty table.
- Numbers follow the contract's units and rounding; percentages in highlights add up with the
  table's own values.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; the highlights block has no "Summary" heading over a "Summary" link.
- A control is navigation OR action, never both: highlight numbers navigate within the page,
  parameters filter, export exports.
- Link color only on numbers that move to rows; the rest of the prose is ink, captions muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; highlights are computed over the whole result, not one page.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, column
  keys) is never rendered as visible text — sentences speak business words only.
- No adjectives or judgements ("worrying", "excellent") the contract does not declare.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: told before shown, highlights of fixed kinds from the result only, numbers
linking to rows, parameters refreshing both, feedback and disciplines. Only the table changes
shape, because its columns do not fit the width. Where this section and the layout described
above differ, this section wins on mobile.

- **The highlights fill the first screen**: the sentences in reading size, one short paragraph
  per kind, before anything else but the parameter bar.
- **The parameter bar is compact**: one or two inputs inline, the others behind a "Filters"
  control that opens them as a view of its own, one per line, with apply.
- **The table becomes a list of rows**: the leading column as identity, the other values as label
  and value pairs, numbers right-aligned and never truncated.
- **A tapped highlight number** scrolls the list to its row and marks it; back from that row's
  drill-down returns to it.
- **Export** sits at the foot of the list.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the highlights, 2. the list of rows, 3. the parameter bar,
4. export.

Forbidden on mobile:
- collapsing the highlights behind "read more", or moving them below the list;
- a wide table or any horizontal scroll;
- highlights turned into tiles or a carousel;
- numbers truncated in sentences or rows.

## Forbidden

- A parameter panel with an explicit RUN gate as the page's center — that is the
  `parameterPanel` experience, not this one; here parameters are a compact bar.
- A gallery of report cards as the entry — that is the `catalogOfReports` experience, not this one.
- Highlights with numbers not derivable from the result; forecasts, causes or recommendations.
- Replacing the table with the highlights — the evidence always stays, complete.
- KPI tiles or charts posing as highlights; generic sentences with no number.
- Blocking success dialogs, page-level toasts carrying validation, redirects after export.

## Signals (how to check the generated page)

1. **S1 Told before shown:** a block of sentences containing numbers sits above the result table.
2. **S2 Fixed kinds:** the highlights follow the order total → largest → (concentration, flagged,
   group, when available); the total sentence is always present when rows exist.
3. **S3 Number links to rows:** clicking a highlight number moves to and marks rows in the table
   on the same page.
4. **S4 Evidence complete:** the table under the highlights lists the whole result.
