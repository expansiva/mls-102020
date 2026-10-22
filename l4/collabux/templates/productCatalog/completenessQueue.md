# productCatalog — experience `completenessQueue`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A catalog is only as good as its emptiest item. This page ranks items by **what they are
missing** — no price, no image, no description, any field the contract declares but the
item leaves blank — and walks the person through them one at a time, asking only for the
gaps. Where `masterDetailCatalog` lets the person choose any row to review, and
`visualCardGrid` relies on the eye to spot a card that looks wrong, this page has already
decided what needs work and in what order; its question is "what is still missing, and
how much is left?". Target: the queue emptied, every item complete, without hunting.

## How to instantiate from the defs (the slots)

- **Gaps come from the contract's fields**: for each item of the main collection query, a
  gap is a field the update command accepts that is empty on the item. Fields the contract
  marks required count first; then the price (the measure the category requires); then the
  optional fields in the contract's order. Only fields the update command can fill are
  gaps — a blank the person cannot fix never enters the queue.
- **The queue is a ranked list**: most gaps first, ties by the contract's order. Each row
  shows the item's name and its gaps as short muted chips in business words ("No price",
  "No image") — never a percentage or a score the contract does not compute.
- **The headline is one sentence above the queue**: "18 items are incomplete", computed
  from the loaded data, with the most common gap beside it when one dominates ("12 have no
  image"). Text, not a tile.
- **Gap filters**: one quiet row of chips, one per gap kind present, each with its count;
  choosing one narrows the queue to items missing that field. Navigation only.
- **The fix view is the center of work**: one item at a time, its known facts as a short
  read-only summary at the top (name, price if present, image if present), then **only the
  missing fields as inputs** of the update command, required gaps first. "Show all fields"
  reveals the full edit form for the rare correction of a filled value.
- **"Save and next"** commits the gaps and opens the next item in the queue; "Skip" moves on
  without saving and sends the item to the end of this session's queue.
- Session/context inputs never render as fields; ids are never typed — the queue chooses the
  item. Never invent fields, defaults or suggested values to fill a gap; a suggestion
  appears only when the contract computes one.

## Attention hierarchy (the spine of this experience)

1. The fix view's missing fields — the work itself.
2. The headline count — how much is left.
3. The queue below or beside, with the item in progress marked.
4. Gap filters and "Show all fields" — quiet.

## Loops

- Open the first item → fill what is missing → "Save and next" → the completed item leaves
  the queue, the count drops by one → the next item is already open with its gaps focused.
- Partial fill is allowed: saving with some optional gaps still blank keeps the item in the
  queue with fewer chips, at its new rank.
- When the queue empties, the page says so calmly — one sentence ("Every item is
  complete") — and offers the catalog list read-only below. Design this state; never
  auto-redirect.

## Feedback & feedforward

- The first missing input has focus when an item opens; required gaps are visibly required.
- Validation at the field, in words, at commit time — never a toast.
- "Save and next" stays disabled until at least one gap is filled and everything typed is
  valid; its label names the outcome. A failed save keeps the item open with the typed
  values, the reason above the button, normal body color, with retry.
- Success is the queue shrinking: the row leaves, the headline updates. No banners.

## Disciplines (transversal — always)

- The page name appears once, in the header; the fix view's title is the item's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: queue rows and gap chips navigate, the
  fix view's buttons commit.
- Gap chips are muted, never alarm-colored; alarm color only on a failed save.
- Filled values are never shown as gaps, and an item is complete only when the data says so
  after the save — never optimistically.

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
Everything above holds: the ranked queue of gaps, the headline count, only missing fields as
inputs, "Save and next", the empty state and the disciplines. The queue and the fix view become
views of their own, because one item's gaps need the whole screen. Where this section and the
layout described above differ, this section wins on mobile.

- **The home view is the headline and the queue**: one row per item, name first, its gap chips
  wrapping onto a second line rather than cut. Gap filters as one quiet chip row above it.
- **The fix view is a view of its own, with back**: the short summary, then the missing fields
  one per line, the first one focused, the right keyboard for each (numeric for price).
- **"Save and next" sits at the bottom where the thumb reaches**, with "Skip" beside it, quiet.
  After it commits, the next item opens in the same view — no return to the queue in between.
- **Back returns to the queue** at the same place, with the completed rows gone and the count
  updated.
- **Image gaps** use the device's picker or camera when the contract accepts an image upload.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the missing fields of the current item, 2. "Save and next",
3. the headline count, 4. the way back to the queue.

Forbidden on mobile:
- the full edit form shown by default instead of only the gaps;
- returning to the queue after every save;
- gap chips truncated, or any horizontal scroll;
- the keyboard covering "Save and next" while typing.

## Forbidden

- A neutral list of all items with a persistent side panel as the spine — that is the
  `masterDetailCatalog` experience, not this one.
- A picture-led grid where the person finds what looks wrong — that is `visualCardGrid`;
  here the page ranks the work.
- Completeness scores, progress percentages per item or quality grades the contract does
  not compute.
- Asking for fields the item already has, or counting as a gap a field no command fills.
- Auto-filling gaps with invented defaults or placeholder text.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 ranked by gaps:** the first list on the page is ordered by number of missing fields,
   and each row names its missing fields in words.
2. **S2 gaps only:** the edit surface opens showing only the item's empty fields as inputs; the
   full form is behind an explicit control.
3. **S3 save and next:** the commit button advances to the next queued item without returning
   to the list.
4. **S4 headline count:** one sentence states how many items are incomplete and updates after
   each save; an empty queue shows a calm all-complete sentence.
