# inventoryControl — experience `stockCountSession`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (corridor dialect — two acts: count, then reconcile)

A cycle count: the person walks the shelves with the page in hand and enters, item by item,
**what is physically there**. Nothing is adjusted while counting. Only when the walk ends
do the discrepancies — counted against recorded — come together in one review, where each
is accepted or recounted before the adjustments are committed. Where `splitViewOperations`
is a neutral desk for any single stock task, and `alertFirstReplenishment` refills what is
low, this page answers "does the record match the shelf?" and corrects the record only
after the whole picture is seen. Target: a set of items counted and reconciled in one
sitting, with every adjustment deliberate.

## How to instantiate from the defs (the slots)

- **The count list comes from the main collection query**, in the order the contract gives
  (location or name when it exposes them): identity and unit per item. The declared filters
  (search, category, location) choose what this session counts, before the first item.
- **Act 1, count**: one item on screen at a time — its identity large, its unit, and one
  numeric input "Counted". **The recorded balance is not shown while counting**, so the
  count is not biased; a quiet "Show recorded" reveals it only on request. "Next" moves on,
  "Back" returns; any item can be reached from a compact progress list ("12 of 40 counted").
- **Counts are held on the page until the review**: entering a count commits nothing. When
  the contract declares a dedicated count command, the session uses it; otherwise counts are
  page state only, and leaving the page with uncounted entries asks first.
- **Act 2, reconcile**: a review list of only the items whose count differs from the
  recorded balance — identity, recorded, counted, and the difference with its sign in words
  ("3 missing", "2 extra"). Matches collapse into one line ("28 items match").
- **Each discrepancy is accepted or sent back to recount**. Accepted ones become adjustments
  through the adjust command: **the direction comes from the difference** (missing → out,
  extra → in), **the quantity is always the positive size of the difference**. A reason
  input appears once for the batch, or per row, only when the contract declares one.
- **"Commit N adjustments"** is the single commit of the session, naming the count.
- Session/context inputs never render as fields; ids are never typed — the walk chooses the
  item. Never invent tolerances, locations or expected quantities the contract lacks.

## Attention hierarchy (the spine of this experience)

1. Act 1: the current item's identity and the "Counted" input.
2. Act 1: progress — how many counted, how many left.
3. Act 2: the discrepancies, largest difference first, each with accept or recount.
4. The final commit and its count.

## Loops

- Count: read the item → type what is there → Next → the next item opens with the input
  focused. Skipped items stay marked "not counted" in the progress list.
- Review: read a discrepancy → accept, or recount (opens that item back in count mode, then
  returns to the review) → when every row is decided, commit.
- After the commit, each adjusted row shows its new balance; failed rows stay in the review
  with their reason and retry, the committed ones are never resent.

## Feedback & feedforward

- The "Counted" input accepts zero and positive numbers only, with the unit beside it;
  validation at the field, in words.
- "Review differences" is available once at least one item is counted; uncounted items are
  listed apart in the review and never adjusted.
- The commit button stays disabled until every discrepancy is accepted or recounted; its
  label names the outcome and the number ("Commit 5 adjustments").
- Success is the review settling: rows turn to their new balances, then one calm sentence
  ("Count reconciled — 5 items adjusted"). No toast.

## Disciplines (transversal — always)

- The page name appears once, in the header; act titles say the act ("Counting",
  "Differences"), and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: Next/Back and the progress list navigate;
  only the final commit writes.
- Alarm color only on the difference numbers; matches are quiet.

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
Everything above holds: the two acts, the blind count, nothing committed until the review, the
direction from the difference, one final commit. The phone is the natural device here, held in one
hand while walking, so each item fills the screen. Where this section and the layout described
above differ, this section wins on mobile.

- **One item per screen**: identity large at the top, the unit, then "Counted" with a numeric
  keyboard already open. "Next" is a large button at the bottom where the thumb reaches, above
  the keyboard; "Back" small beside it.
- **Progress is one line at the top** ("12 of 40"); tapping it opens the progress list as a view
  of its own, with back to the item being counted.
- **The review is a list of rows**: identity, then "recorded 10 · counted 7 · 3 missing", the
  difference in alarm color; accept and recount as two buttons on the row's own line.
- **The commit sits at the foot of the review**, full width, naming the count.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the "Counted" input, 2. "Next", 3. progress, 4. the way back.

Forbidden on mobile:
- several items' inputs on one screen during the count;
- the recorded balance visible by default while counting;
- swipe as the only way to accept or recount;
- the keyboard covering "Next";
- wide tables or any horizontal scroll in the review.

## Forbidden

- A full-catalog grid with a mode panel for one-off adjustments — that is the
  `splitViewOperations` experience, not this one.
- A queue of low-stock items refilled one row at a time — that is
  `alertFirstReplenishment`; here every chosen item is counted, low or not.
- Committing an adjustment per item during the count, or auto-committing on "Next".
- Signed quantities typed by the person, or a direction choice in the review.
- Adjusting items that were never counted, or hiding the matches' total.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 one item at a time:** the count act shows a single item with one counted-quantity input
   and next/back controls.
2. **S2 blind count:** the recorded balance is not visible on the counting surface unless
   explicitly revealed.
3. **S3 differences together:** a separate review lists only items whose count differs, with
   recorded, counted and difference.
4. **S4 one commit:** writes happen only from one final commit that names how many adjustments
   it will make.

## Molecule rules

```json
{
  "axes": { "numberInput": "input", "validation": "inline-below", "feedback": "inline" },
  "groups": { "prefer": ["groupEnterNumber", "groupNavigateSteps", "groupShowProgress"], "forbid": [] }
}
```
