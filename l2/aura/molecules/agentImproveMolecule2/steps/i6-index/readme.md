# i6-index

Conditional LLM call (`code`). Routes B and C. Runs after i5.

## The rule

    playgroundChanged == true  =>  the index was updated.

Not a heuristic, not conditional on judgement (`flow.json.conventions.playgroundThenIndex`). On
2026-08-05 the playground of `ml-lazy-record-detail-table` was fixed and the group page kept showing
an empty detail area; nobody noticed, it was found by accident days later.

i5's answer is **read from its artifact**, never recomputed. Recomputing would let the two steps
disagree, and their disagreement *is* the defect.

## Deterministic where it can be, and only there

`flow.json` declared this step fully deterministic. Building it showed that was wrong, and the
correction is recorded in `indexPlan.ts` rather than hidden:

- **the import line is derivable** — one line, fixed shape, insert position derivable. Code writes
  it, before the model is ever called, so the page the model reads is the page it edits.
- **the showcase card is not.** A group index is a hand-written Lit page (`groupviewtable/index.ts`
  is 782 lines of per-molecule cards with real sample data). Fitting a new slot into an existing
  card is authoring.

So there are three exits: nothing to do, import-only (no model), and card work (model).

⚠️ **The second exit can legitimately write nothing**, and until 2026-08-14 the gate called that the
2026-08-05 defect. The first run ever to reach this step with a changed playground —
`ml-currency-input` — had the import already in place and no added slot, so `after === before`, and
`index_stale` fired. The rule is now judged against the **work the plan found** (`workExpected`), not
against `playgroundChanged` alone: it still fails when there was a missing import or an unexercised
added slot, which is the case 2026-08-05 was about.

## Invariants

- the molecule is imported **exactly once**;
- there is a `<tag>` instance — imported and never shown is a silent gap;
- every *added* slot is exercised in the card;
- **the page may not shrink** by more than 10% — this step adds, it does not rewrite.

## Tests

`gate.test.ts` (14), covering both `indexPlan` and the gate. The one that must never be deleted is
"THE RULE OF 2026-08-05".
