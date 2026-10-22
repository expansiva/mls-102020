# comparisonView — experience `differencesList`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The comparison is reduced to its substance: **one list of only the attributes that differ across
the items, each row naming the attribute and showing every item's value for it**. No columns per
item to read across, no reference to read against — just the differences, as a list that is
short when the items are similar and long when they are not, and that length is itself the first
answer. Where `sideBySideColumns` stages every item as a column with every attribute aligned and
`championChallenger` holds one challenger against a fixed reference, this page answers **"in what,
exactly, do these items differ?"** — for any number of items, at any width. Target: someone
reviewing versions, variants or quotes who must report or decide on the differences alone.

## How to instantiate from the defs (the slots)

- **Items are chosen through a picker** fed by the contract's selection input — never typed ids —
  and appear as one compact line of identity chips at the top, each with a quiet remove. Each item
  gets a short stable marker (its name, or a letter A, B, C when names are long), used in every row.
- **A difference row exists for each compared field whose values are not all equal** across the
  chosen items, in the contract's declared field order. The row's label is the attribute in
  business words; under or beside it, each item's value with its marker, numbers right-aligned and
  tabular with units. An item lacking the value shows an em dash, which counts as a difference.
- **Values that agree inside a differing row are grouped**: when three of four items share a value,
  the row reads "A, B, C: 30 days · D: 45 days" — the odd one out is the visible news. Emphasis
  (weight), never alarm color, marks the minority value; alarm only where the contract flags.
- **The count heads the list** in one sentence: "7 of 32 attributes differ." The equal attributes
  are summarized in one quiet expander at the end ("25 attributes are identical") for audit.
- **Choose and merge only as the contract declares**: choose is one action per item chip, labeled
  with the outcome and item ("Choose version B"); merge, when declared, is one action above the
  list acting on the current set. Without these commands the page is read-only, and that is
  correct. Session/context inputs never render as fields.

## Attention hierarchy (the spine of this experience)

1. The count sentence — how different these items are.
2. The difference rows — what differs, with every item's value.
3. The item chips with their choose action.
4. The identical expander and the picker, quiet at the edges.

## Loops

- Pick items → the list computes → read the count → scan the rows → expand the identical summary
  to double-check → choose on a chip, or leave with the differences understood.
- Add an item → rows may appear (it differs where others agreed); remove one → rows may vanish.
  Each change of the set re-states the count first, then updates the rows in place.

## Feedback & feedforward

- With fewer than two items, the page says once that comparison starts at two; no empty list.
- Zero differences is a stated result ("These items are identical in all 32 attributes.").
- While an added item loads, its marker shows a running state and the rows keep their current
  values; no flicker of rows disappearing and coming back.
- Choose or merge failures report beside their control with retry; success marks the chosen chip.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; the count sentence is not a heading.
- A control is navigation OR action, never both: chips choose or remove, an item's identity may
  link to its record as its own control.
- Link color only on real links; markers, captions and the identical expander are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; rows follow the contract's field order.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, field keys)
  is never rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: only the differences, every item's value in each row, the count first,
grouped agreeing values, feedback and disciplines. A list already fits a phone, so only the value
layout inside each row changes. Where this section and the layout described above differ, this
section wins on mobile.

- **Item chips wrap** into rows at the top, with their markers and the quiet add control; tapping
  a chip reveals, in place under the chips, its choose action (naming the item) and its remove.
- **Each difference row stacks**: the attribute label on one line, then one line per value group
  ("A, B, C — 30 days", "D — 45 days"), values right-aligned and never truncated.
- **The count sentence** stays above the first row; the identical expander stays at the end.
- **Merge**, when declared, is one full-width action at the bottom of the list.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the count sentence, 2. the difference rows, 3. the item chips,
4. the identical expander.

Forbidden on mobile:
- one column per item, or any horizontal scroll;
- each item as its own card with its own attribute list;
- hiding values behind a tap inside a difference row;
- repeating the attribute label for every item.

## Forbidden

- Items as aligned columns with every attribute as a row — that is the `sideBySideColumns`
  experience, not this one.
- A fixed reference with one challenger swapped in — that is the `championChallenger` experience,
  not this one; here no item is privileged.
- Identical attributes as rows in the list, or hidden without the count and the expander.
- Alarm color as difference marking — different is not wrong.
- Invented attributes, scores, verdicts or recommendations; typed ids for items.
- Choosing anywhere but on an item; steps or wizards around the comparison.

## Signals (how to check the generated page)

1. **S1 Only differences:** the main list contains only attributes whose values are not all equal.
2. **S2 Row per attribute:** each row is one attribute showing the value of every chosen item,
   not one block per item.
3. **S3 Count first:** a sentence stating how many attributes differ sits above the list.
4. **S4 No privileged item:** no item is labeled or positioned as a reference.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "expand": "collapsible",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupSelectMany", "groupViewData", "groupExpandContent"],
    "forbid": ["groupViewTable", "groupNavigateSteps"]
  }
}
```
