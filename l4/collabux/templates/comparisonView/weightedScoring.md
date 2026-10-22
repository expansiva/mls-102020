# comparisonView — experience `weightedScoring`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The decision is made explicit: **the criteria that matter carry weights, the items are ranked by
their weighted score, and the person moves the weights and watches the ranking change before
choosing**. The page turns "which is best?" into "best by what?" — the ranking is not a verdict
handed down, it is the visible consequence of priorities the person sets and can defend. Where
`sideBySideColumns` lays every attribute out for the eye to referee and `championChallenger`
duels one challenger against a fixed reference, this page answers **"which item wins under my
priorities, and how sensitive is that?"** Target: a buyer or evaluator choosing among several
quotes, suppliers or candidates who must justify the choice by criteria.

## How to instantiate from the defs (the slots)

- **This experience needs criteria the contract can score**: either a declared scoring query or
  declared criteria with weights, or compared fields that are numeric or ordered enumerations.
  Each such field becomes one criterion. Fields that are free text or ids are never criteria; they
  stay as the item's identity facts. If the contract declares fewer than two scorable fields, the
  page says once that ranking needs at least two criteria and shows the items as a plain list.
- **Direction per criterion comes from the contract** (lower price is better, higher rating is
  better) when declared; when not, each criterion shows a small "higher is better / lower is
  better" choice, set to "higher" for neutral measures and stated beside the weight.
- **Weights are controls the person sets**: one per criterion, as a stepped value (0 to 5) with
  the number visible, starting from the contract's declared weights or all equal. A weight of 0
  removes the criterion from the score without hiding it. When the contract declares commands to
  save weights, one quiet "Save these weights" action exists; otherwise weights live for the visit.
- **The score is a declared formula, shown**: each criterion's values are normalized across the
  items being compared (best = 100, worst = 0) and combined by the weights. The method is stated
  in one muted line under the ranking — no hidden math, no score the contract computes differently.
  When the contract returns its own score, that score is used and the weights are its declared
  inputs only.
- **The ranking**: one row per item, in score order — rank, identity, score, and a thin bar per
  criterion showing its weighted contribution. Ties share a rank.
- **Choosing is the contract's choose command**, on each ranked row, labeled with outcome and item
  ("Choose ACME quote"). Items come from a picker over the contract's selection input; ids never
  typed; session/context inputs never render as fields.

## Attention hierarchy (the spine of this experience)

1. The ranking — who leads under the current weights.
2. The weights — the priorities producing that order.
3. The contribution bars — why each item scores what it scores.
4. The method line, the item picker and save, quiet at the edges.

## Loops

- Read the ranking → raise the weight of the criterion that matters most → the ranking reorders
  in place with a short motion and each moved row shows its previous rank ("was 3rd") → settle →
  choose on the leading row, or on another one with eyes open.
- Add or remove an item → normalization recomputes across the new set → the ranking updates; the
  weights stay as set.

## Feedback & feedforward

- Weight changes recompute immediately on the page — no run button; the moved rows are marked
  until the next change.
- An item missing a criterion's value shows an em dash in that bar and scores 0 on it, stated in
  the row ("no price informed") — never a silently averaged value.
- Choose stays disabled until at least two items are ranked; failure reports beside the row with
  retry; success marks the chosen row in place. No banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: weights adjust, choose commits, an item's
  identity may link to its record as its own control.
- Link color only on real links; method line, captions and previous-rank marks are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the ranking's order is the score.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: weighted criteria, the visible ranking, the stated method, immediate
recompute, choosing on the ranked row, feedback and disciplines. Only the layout changes, because
weights and ranking cannot sit side by side. Where this section and the layout described above
differ, this section wins on mobile.

- **The ranking comes first**, one row per item: rank, identity and score on one line, the
  contribution bars stacked under it, one thin bar per criterion.
- **The weights open as a view of its own** from one "Adjust weights" control above the ranking:
  one criterion per line with a stepper (minus / value / plus) and its direction; the top of that
  view shows a compact live preview of the first three ranks, so the effect is seen while adjusting.
  Back returns to the ranking with the moved rows marked.
- **Choose** sits on each ranked row, full width under its bars, naming the item.
- **The method line** sits under the ranking, muted, wrapping.
- **Touch**: every target is at least 44px high; nothing depends on hover; steppers, never drag
  sliders as the only way.

Mobile attention hierarchy: 1. the ranking, 2. the weights view, 3. the contribution bars,
4. the method line.

Forbidden on mobile:
- a weight matrix or a table of items by criteria, or any horizontal scroll;
- weights reachable only by dragging;
- choosing anywhere but on a ranked row;
- hiding the method line.

## Forbidden

- Every attribute as an aligned row across item columns, with the eye as referee — that is the
  `sideBySideColumns` experience, not this one.
- A fixed reference against one challenger at a time — that is the `championChallenger`
  experience, not this one.
- Hidden or undocumented scoring; scores, criteria or weights not derivable from the contract.
- A ranking that does not move when weights change, or that needs a button to recompute.
- Treating free text or ids as criteria; averaging away missing values.
- Steps or wizards around the weights; blocking dialogs on choose.

## Signals (how to check the generated page)

1. **S1 Weights are controls:** one adjustable weight per criterion, with its value visible.
2. **S2 Ranked rows:** items render as rows in score order with rank and score, not as columns.
3. **S3 Live reorder:** changing a weight reorders the ranking without any run/apply action.
4. **S4 Method stated:** one visible line explains how the score is combined from the weights.
