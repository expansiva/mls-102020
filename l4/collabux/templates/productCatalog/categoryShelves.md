# productCatalog — experience `categoryShelves`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The catalog as a store walked aisle by aisle: items arranged in **shelves, one per
category**, stacked down the page, each shelf titled with its category and its count. The
owner thinks in sections — "the drinks", "the desserts" — and maintains one section at a
time: adding to it, fixing what sits on it, retiring what no longer belongs. Where
`masterDetailCatalog` is a ledger worked row by row beside a panel, and `visualCardGrid` is
one undivided wall read by its pictures, this page answers "what is on each shelf, and is
the shelf right?". The category is the frame of every action. Target: review and maintain
one whole category without the rest of the catalog getting in the way.

## How to instantiate from the defs (the slots)

- **Shelves come from the item's classification field**: the category (or group, section,
  family) the contract exposes on each item. One shelf per value present in the data, in
  the order the contract gives, otherwise alphabetical. Items without a value sit on one
  last shelf titled in plain words ("No category"). If the contract carries no
  classification at all, the shelves fall back to the first letter of the item name (A, B,
  C …) — never an invented grouping.
- **Each shelf is a titled section**: the category name and its item count in the title
  line, then its items as compact uniform tiles in a wrapping row — name, then price (the
  measure the contract declares), then a status chip when lifecycle exists. An image, when
  the contract carries one, is a small thumbnail on the tile, never the tile's main body.
- **A shelf shows its first items and one "Show all N" control** that expands it in place;
  long shelves never push the next shelf's title off several screens.
- **A shelf jump bar** above the shelves lists every category name with its count; choosing
  one scrolls to that shelf and marks it current. It is navigation only.
- **Opening an item expands it within its shelf**, below the tile row, in read mode — all
  contract fields in labeled blocks — with Edit as an explicit switch to the update
  command's form. Only one item is open on the page at a time.
- **"Add to this shelf"** sits at the end of each shelf: it opens the create command's form
  in that shelf with the category already chosen (still changeable when the contract makes
  it an input). On success the new tile appears on that shelf.
- **Moving an item to another shelf** is changing its category through the edit form; the
  tile then leaves its shelf and lands on the other, both counts updated.
- Search and declared filters, when the contract has them, sit in one quiet bar above the
  jump bar and filter every shelf at once; shelves left empty by a filter collapse to their
  title and "0".
- Session/context inputs never render as fields; ids are never typed — the tile IS the item.
  Never invent categories, ranks or featured items the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The shelf titles with their counts — the shape of the catalog at a glance.
2. The current shelf's tiles — names and prices.
3. The open item, when there is one, inside its shelf.
4. The jump bar, search and "Add to this shelf" — quiet frame.

## Loops

- Jump to a shelf → scan its tiles → open the one that looks wrong → fix → Save → the tile
  is repainted in place, the item closes back into the row → next tile on the same shelf.
- Stock a shelf: "Add to this shelf" → fill → Save → the new tile appears there → add the
  next one; the form reopens empty for the same shelf until the person closes it.
- Retire: deactivate inside the open item; the tile stays on its shelf, muted, while the
  current filter includes inactive items. Delete, when declared, confirms naming the item
  and the shelf, and the count drops by one.

## Feedback & feedforward

- Required fields visibly required before any mistake; validation at the field, in words,
  at commit time — never a toast.
- A failed command reports inside the open item, above its button, normal body color, with
  retry; every shelf stays untouched.
- Save stays disabled until valid and changed; labels name the outcome ("Save item", "Add
  to Drinks" — the shelf's real name).
- Success is local: the tile repaints, the shelf count updates. A recategorized item is
  visibly placed on its new shelf, which scrolls into view — never a silent vanish.

## Disciplines (transversal — always)

- The page name appears once, in the header; shelf titles are category names, never the
  page title, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the jump bar navigates, tiles open, buttons
  commit; tiles carry no action icons of their own.
- Link color only on real links; prices, counts and chips are data, never link-colored.
- Shelf order is stable: shelves never reorder because one gained or lost an item.

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
Everything above holds: shelves by category with their counts, maintenance inside a shelf, "Add to
this shelf", stable shelf order, feedback and disciplines. Shelves become one column read from the
top, so each shelf is closed until chosen. Where this section and the layout described above
differ, this section wins on mobile.

- **The home view is the list of shelves**: each a full-width row with the category name and
  its count. Tapping a shelf opens it in place; only one shelf is open at a time.
- **An open shelf lists its items as rows**: name first, price right-aligned, the status chip
  small; a thumbnail at the row's start only when the contract carries an image.
- **An item is a view of its own, with back**: read mode in labeled blocks, Edit as an explicit
  switch, one field per line, Save and Cancel at the bottom where the thumb reaches.
- **"Add to this shelf"** is the last row of the open shelf and opens the create form as a view
  of its own, category already chosen.
- **Back returns to the same open shelf**, at the same scroll place, with the row updated.
- **The jump bar is not needed**: the shelf list is the jump. Search, when declared, sits at the
  top of the shelf list.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the shelf list with counts, 2. the open shelf's items, 3. the
current view's primary action, 4. the way back.

Forbidden on mobile:
- shelves as side-scrolling carousels, or any horizontal scroll;
- several shelves open at once, stacking into one endless screen;
- a sheet or drawer covering part of a shelf to show an item;
- losing the open shelf or its scroll place after visiting an item.

## Forbidden

- A persistent side detail panel with one flat list beside it — that is the
  `masterDetailCatalog` experience, not this one.
- One undivided media-led grid with maintenance in an overlay — that is the
  `visualCardGrid` experience; here every item lives on its category's shelf.
- Tabs per category that hide the other shelves' titles and counts.
- Moving items between shelves by drag only; recategorizing is always the edit form.
- Shelves the data does not express, "featured" or "recommended" shelves, or reordering
  shelves by popularity the contract does not declare.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 shelves:** items are rendered in sections, one per category value, each with a title
   that carries the category name and its item count.
2. **S2 shelf-scoped creation:** each shelf has its own create action, and the create form
   arrives with that shelf's category already chosen.
3. **S3 in-shelf detail:** opening an item keeps it inside its shelf (expanded in place, or on
   mobile a view whose back returns to that open shelf) — no side panel, no page-wide overlay.
4. **S4 jump:** a control lists every shelf (jump bar on desktop, shelf list on mobile) and
   moves to the chosen one without filtering the others away.

## Molecule rules

```json
{
  "axes": {
    "density": "compact",
    "recordsView": "grid",
    "sectionNav": "scrollspy",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewCard", "groupNavigateSection", "groupExpandContent"],
    "forbid": []
  }
}
```
