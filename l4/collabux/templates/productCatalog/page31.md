# productCatalog — experience `visualCardGrid` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The catalog as a showcase: a grid of cards where **the image and the price do the
talking**, built for items that are recognized by sight — dishes, garments, packaged
goods. The grid IS the page; maintenance happens in a light overlay that opens over it
and closes back to it, so the visual context is never lost. Where `masterDetailCatalog`
is a ledger worked row by row, this is a wall the owner walks along, spotting the card
that looks wrong. Target: find an item by eye faster than by typing its name.

## How to instantiate from the defs (the slots)

- **One card per item from the main collection query**: the item's image (when the
  contract carries one) fills the card's top; below it the name, then the price —
  **price is the second-loudest thing on the card** after the image. One small status
  chip (active/inactive) when the contract exposes lifecycle; nothing else. Cards are all
  the same size and anatomy.
- **No image in the data → a quiet initial-letter placeholder**, uniform across cards —
  never a broken-image glyph, never an invented photo.
- **Search and filters come only from declared inputs**, one quiet bar above the grid;
  filtering re-flows the grid in place.
- **Tapping a card opens the item in an overlay** over the dimmed grid: read view first —
  larger image, all contract fields in labeled blocks — with Edit as an explicit switch
  to the update command's form. Close returns to the grid exactly as it was.
- **"New" opens the same overlay** with the create command's inputs; on success the new
  card appears in the grid, visibly, where the ordering puts it.
- Session/context inputs never render as fields; ids are never typed — the card IS the
  selection. Never invent badges, ratings or metrics the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The images — the grid reads as pictures first.
2. Prices — the fact that decides most catalog corrections.
3. Names and status chips — confirmation, small.
4. Search/filter bar and "New" — quiet frame around the wall.

## Loops

- Walk the grid → a card looks wrong (old photo, stale price) → open it → correct in the
  overlay → close → the card is repainted in place, grid untouched.
- Activate/deactivate lives in the overlay as a quiet action named by outcome; a
  deactivated item's card stays in the grid, visually muted, when the current filter
  still includes it — items disappear only because a filter says so.

## Feedback & feedforward

- Overlay form validation speaks at the field, in words, at commit time — never a toast.
- Command failure renders inside the overlay, above its button, in normal body color,
  with retry; the grid behind is never touched by the failure.
- Save stays disabled until valid and changed; its label names the outcome ("Save item").
- Success is local: brief confirmation in the overlay, then the updated card in the grid.
  No page banners, no redirects, no full-grid reload for a one-card change.

## Disciplines (transversal — always)

- The page name appears once, in the header; the overlay's title is the item's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: cards open the overlay, buttons commit;
  no card carries inline action icons that compete with opening it.
- Link color only on real links; prices and chips are data, never link-colored.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A persistent side detail panel with the list kept beside it — that is the
  `masterDetailCatalog` experience, not this one.
- Rows, columns headers, or a table disguised as a grid; cards never degrade into lines
  of text on wide screens.
- Editing on the card itself (inline price fields, hover pencils); all writes happen in
  the overlay.
- Cards of mixed sizes, hero cards, or a spotlight item the contract does not rank.
- Typed ids for anything the defs marks as selection/session/context.
- Invented imagery, decorative stock photos, or fake ratings/labels to make cards look
  fuller — an empty grid states once, quietly, what will appear there.
