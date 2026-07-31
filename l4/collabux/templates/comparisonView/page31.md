# comparisonView — experience `championChallenger` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — one decision loop, no acts)

A duel, repeated: one item stands as the fixed reference — the champion — and one
challenger at a time is held up against it, showing ONLY what differs. Deciding between
the two is the whole page; when the challenger loses, the next one steps in and the
champion does not move. Built for repeated binary decisions — keep or replace, current
contract vs renewal, incumbent vs candidate — where reading twelve aligned columns would
bury the only question that matters. Where `sideBySideColumns` lays the whole field out,
this stages one fight at a time and remembers who is winning.

## How to instantiate from the defs (the slots)

- **The champion is set once**: from the contract's context when it declares a current or
  incumbent item, otherwise by an explicit picker at the start — never typed. Its side is
  visually the anchor: stable position, its identity and the label "current" in plain
  words when the contract supports that meaning.
- **The challenger is a picker**, drawing from the contract's selection input; swapping
  challengers NEVER touches the champion or the scroll position.
- **Only differing attributes render**, one row per difference: label at the left,
  champion's value and challenger's value side by side, the challenger's value carrying
  the emphasis (it is the news). Equal attributes compress into one quiet line ("14
  attributes identical"), expandable for audit, collapsed by default.
- **The decision is two buttons, always the same two places**: keep the champion (quiet)
  and promote the challenger (primary), each labeled with the item by name ("Promote
  Beta plan"). Promotion, when the contract commits it, makes the challenger the new
  champion in place — the duel continues from strength.
- **Session/context inputs never render as fields**; ids are never typed; no score,
  verdict or recommendation appears unless the contract declares it.

## The decision loop (the spine of this experience)

1. Pick a challenger — or receive the next one, when the contract provides an order.
2. Read the differences — a short list, because sameness is silenced.
3. Decide: keep or promote, one tap, outcome named.
4. The next challenger steps in; the champion side never blinks unless promoted.

## Feedback & feedforward

- Both decision buttons stay disabled until a challenger is loaded; labels always name
  the item and the outcome, never "OK"/"Cancel".
- A promotion that fails reports between the columns and the buttons, in normal body
  color, with retry; both items stay on stage, nothing is lost.
- Success is local: the promoted item slides into the champion position with a one-line
  confirmation. No page banners, no redirects, no blocking dialogs.
- No differences at all is a stated result ("These two are identical in every compared
  attribute"), calm and explicit — never an empty region.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (the challenger's heading is its name, never "Promote").
- A control is navigation OR action, never both: an item's identity may link to its full
  record as its own control; the decision buttons only decide.
- Link color only on real links; the identical-attributes line and captions are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- N items as simultaneous aligned columns with every attribute as a row — that is the
  `sideBySideColumns` experience, not this one.
- More than one challenger on stage, or a champion that moves position between duels.
- Rendering equal attributes as rows by default; hiding that sameness exists.
- Alarm color on differences — different is not wrong; alarm only where the contract
  flags a value as bad.
- Typed ids for champion or challenger; invented scores, winners or recommendations.
- Losing the champion (or the entered state) when swapping challengers; any wizard or
  step rail around the duel.
