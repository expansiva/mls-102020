# supplierManagement — experience `supplierScorecard`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Suppliers **compared against each other by the measures the contract provides** — on-time
rate, lead time, price level, open issues, purchase volume, whatever it declares — one row
per supplier, one column per measure, so that the strong and the weak stand out without
opening anyone. Where `directoryCompliance` judges one supplier's fiscal facts at a desk,
and `onboardingPipeline` moves suppliers through habilitation stages, this page answers
"who performs better, on what?" and supports the commercial decision that follows. It
honestly shrinks when the contract measures little. Target: rank suppliers on the measure
that matters now and act on the outliers.

## How to instantiate from the defs (the slots)

- **Measures are the numeric fields the contract exposes per supplier**: each becomes a
  column with its business label and unit, right-aligned, tabular. Its direction (higher is
  better, or lower is better) comes from the contract when declared; otherwise the column
  carries no good/bad coloring at all, only its numbers.
- **Rows come from the supplier collection query**: the name first, the standing chip when
  exposed, then the measures. The table is sorted by one chosen measure; choosing a column
  header re-sorts by it and marks it as the ranking measure.
- **A rank position** ("1st", "2nd") follows the chosen measure only; there is **no
  composite score** unless the contract computes one — then it is shown as given, labeled
  in its own words.
- **Within each column**, a slim inline bar behind the number shows its place between the
  column's lowest and highest value in the loaded data — a reading aid, never a judgment.
- **Degrading with few measures**: with one measure, the page is a ranked list by it; with
  none, it becomes a compact comparison of the declared qualitative facts (standing, terms,
  categories) in columns, ordered by name, and states once, quietly, that the contract
  provides no performance measures. Never invent ratings, stars or scores.
- **Period**: when the measures depend on a declared period input, it sits above the table
  as one quiet control; changing it re-ranks.
- **Acting on a supplier**: selecting a row opens a compact summary under it — all measures
  with their labels, fiscal identity, terms — with the commands the contract declares
  (block, approve, deactivate) as quiet outcome-named actions, each confirmed naming the
  supplier.
- Session/context inputs never render as fields; ids are never typed — the row IS the
  supplier. Never invent benchmarks, targets or thresholds.

## Attention hierarchy (the spine of this experience)

1. The ranking measure's column — the comparison itself.
2. The top and bottom rows on that measure.
3. The other measures, readable in the same row.
4. The open summary and its actions — only when asked for.

## Loops

- Choose the measure that matters (lead time, before a rush order) → read the top rows →
  open the best → confirm its terms → leave to buy.
- Review the bottom: sort by the measure → open the worst → block or deactivate when the
  contract allows, confirmed → its chip changes in place, the row stays visible.

## Feedback & feedforward

- The ranking measure is always named above the table ("Ranked by on-time rate"), so the
  order is never a mystery.
- Empty measures render as an em dash, never zero; rows with an empty ranking value sort
  last, with a quiet note of how many.
- A failed command reports inside the open summary, above its button, normal body color,
  with retry. Success is the chip changing in place. No toast.

## Disciplines (transversal — always)

- The page name appears once, in the header; the summary's title is the supplier's name,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: column headers sort, rows open their
  summary, buttons commit.
- Good/bad coloring only when the contract declares the direction; alarm color never on
  whole rows.

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
Everything above holds: the declared measures, one ranking measure at a time, no composite score
unless declared, the honest degradation, actions in the summary. A table of measure columns does
not fit a phone, so the ranking measure leads each row and the others fold below. Where this
section and the layout described above differ, this section wins on mobile.

- **The ranking measure is chosen from one control at the top** ("Ranked by: on-time rate"),
  listing every declared measure; the period control, when declared, sits beside it.
- **Each supplier is a row**: rank and name first, then the ranking measure's value large with
  its inline bar; the other measures as one or two small lines of "label value" below.
- **Opening a row** shows its summary as a view of its own, with back: all measures, fiscal
  identity, terms, then the declared actions at the bottom where the thumb reaches.
- **Back returns to the same ranking and scroll place.**
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the ranking measure control, 2. the top rows, 3. the folded
measures, 4. the way back.

Forbidden on mobile:
- a wide table of measure columns, or any horizontal scroll;
- sorting only by tapping tiny column headers;
- actions on list rows or swipe gestures;
- a composite score made up to fit one number per row.

## Forbidden

- A directory list with a deep fiscal panel and approve/block decided at a desk — that is
  the `directoryCompliance` experience, not this one.
- Stage columns moving suppliers through habilitation — that is `onboardingPipeline`.
- Stars, grades, composite scores or benchmarks the contract does not compute.
- Coloring a measure good or bad without a declared direction.
- Hiding suppliers with empty measures; they sort last, visibly.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 comparison rows:** suppliers render as rows that can be read against each other, not
   as cards in stages or a single-supplier desk.
2. **S2 named ordering:** a visible caption or control names what the list is ordered by (a
   measure, or the name when the contract has none), and changing it reorders the rows.
3. **S3 no invented score:** no star, grade or overall score appears unless a contract field
   carries it.
4. **S4 summary in place:** opening a supplier shows its summary without leaving the ranking
   (under the row on desktop, a view with back on mobile).

## Molecule rules

```json
{
  "axes": {
    "recordsView": "table",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewTable"],
    "forbid": ["groupRateItem"]
  }
}
```
