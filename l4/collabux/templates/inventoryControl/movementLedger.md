# inventoryControl — experience `movementLedger`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Stock read as a **journal**: every entry and exit in chronological order, each line saying
what moved, how much, which way, when, and — for one item — the balance it left behind. A
balance is not a fact on its own; it is the sum of a history, and this page shows the
history. Where `splitViewOperations` starts from the item and its current balance, and
`alertFirstReplenishment` starts from what is low, this page starts from time and answers
"what happened to this stock, and why is the balance what it is?". New movements are
written into the journal itself. Target: explain any balance by reading its lines, and
register a movement where its consequence is seen.

## How to instantiate from the defs (the slots)

- **The journal comes from the movement history query** the contract declares: one line per
  movement — date and time first, then the item, then the direction in words ("In", "Out"),
  the quantity (always positive, with unit, right-aligned), and the reason/note and author
  when the data carries them. Newest first by default; the order is a quiet toggle.
- **Filters by item and by period** come from declared inputs: an item picker and a period
  (from–to, or the contract's period choice). They sit in one bar above the journal.
- **The running balance appears when the journal is filtered to one item**: a right-hand
  column with the balance after each line — from the contract's balance-after field when
  present, otherwise derived backward from the item's current balance and the declared
  quantities. For several items at once the column is absent, never a meaningless sum.
- **The item header**: when one item is chosen, a compact line above the journal with its
  name, current balance and unit, and minimum when the contract exposes one.
- **Registering a movement happens at the head of the journal**: one "Register movement"
  action opens an entry line on top, from the adjust command — the item (preselected when
  filtered), **direction as a binary choice** with none preselected unless the contract
  defaults it, **quantity always positive**, reason only if declared. On commit it becomes
  the newest line.
- **No movement history declared**: the journal cannot be invented. The page states once,
  quietly, that earlier movements are not available, shows the items' current balances as
  a compact list, and the movements registered here appear as journal lines labeled "this
  session".
- Session/context inputs never render as fields; the author comes from session. Ids are
  never typed — items are picked. Never invent reasons, documents or costs per movement.

## Attention hierarchy (the spine of this experience)

1. The journal lines — date, direction, quantity.
2. The running balance column, when one item is chosen.
3. The item and period filters.
4. "Register movement" — present at the top, never louder than the journal.

## Loops

- A balance looks wrong → filter to the item → read the lines backwards until the jump is
  found → register the correcting movement from the journal → the new line lands on top
  and the running balance follows.
- Close of period: choose the period → scan the totals in and out shown in one quiet
  sentence above the lines ("In 340 · Out 295" for the filtered item) → move on.

## Feedback & feedforward

- The entry line shows the current balance and what it will become ("12 → 9") as the
  quantity is typed — feedforward on the consequence.
- Validation at the field, in words ("Quantity must be more than zero"), never a toast.
- The commit stays disabled until item, direction and quantity are valid; its label names
  the outcome ("Record exit", "Record entry").
- A failed movement keeps the entry line open with the typed values, the reason above its
  button, normal body color, with retry. Success is the new line in the journal.

## Disciplines (transversal — always)

- The page name appears once, in the header; the item header is the item's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: filters and item names filter; only the
  entry line commits.
- Journal lines are evidence: they are never edited or deleted in place; a mistake is
  corrected by a new, opposite movement when the contract offers no reversal command.
- Direction is shown in words and alignment, not only in color.

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
Everything above holds: the chronological journal, filters by item and period, the running balance
for one item, registration from the journal, lines as evidence. A table of columns does not fit a
phone, so each journal line becomes a compact two-line row. Where this section and the layout
described above differ, this section wins on mobile.

- **Each line is a row of two lines**: first the direction and quantity, large, with the date
  small on the right; then the item (omitted when filtered to one) and the reason, small.
- **The running balance** sits at the right end of the first line when one item is chosen,
  quieter than the quantity.
- **Filters collapse into one summary line** ("Flour · last 30 days") that opens a filter view
  of its own, item picker and period one per line, with back.
- **"Register movement" opens a view of its own**: item, the two-option direction, quantity with
  a numeric keyboard, the "12 → 9" preview, and the commit at the bottom where the thumb reaches.
  After it commits, back to the journal with the new line on top.
- **More lines load at the end** of the journal, as the contract pages.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the journal lines, 2. the running balance, 3. "Register movement",
4. the filter summary.

Forbidden on mobile:
- a wide table of columns, or any horizontal scroll;
- swipe to edit or delete a journal line;
- the filter bar taking the first screen;
- a signed quantity or a direction that is preselected against the contract.

## Forbidden

- An item grid with a panel of modes as the page's center — that is the
  `splitViewOperations` experience, not this one.
- Opening on a low-stock queue — that is `alertFirstReplenishment`; here time orders the
  page and no item is privileged.
- A running balance summed across different items, or one invented without a movement
  history to derive it from.
- Editing or deleting journal lines; editing balances directly.
- Signed quantities, a free-text direction, or a direction preselected against the contract.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 chronological:** the main collection is a list of movement lines ordered by date, each
   with direction in words and a positive quantity.
2. **S2 registration in the journal:** the create-movement action lives at the head of the
   journal, and a committed movement appears as its newest line.
3. **S3 filters:** item and period filters sit above the journal and narrow its lines.
4. **S4 lines are read-only:** no edit or delete control on any journal line.
