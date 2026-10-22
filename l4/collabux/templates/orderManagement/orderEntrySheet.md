# orderManagement — experience `orderEntrySheet`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (document dialect — the order is written top to bottom)

The order as a sheet being written: the page opens **blank, ready to type**, a short header
(customer, dates, terms) on top, then an **always-open line grid** where each new line is
one row typed from the keyboard, and a money summary at the foot that updates as lines are
written. The person composes, then commits the whole order once. Where `orderDeskSplit`
works a queue of existing orders to verify and transition them, and `lifecycleLanes` reads
the whole flow to find the bottleneck, here the question is **"how do I get this order in,
correct, as fast as I can type?"** — existing orders are not the stage; at most the last
few created are a quiet reference. Target: a ten-line order entered without touching the
mouse, and the total checked before it is committed.

## How to instantiate from the defs (the slots)

- **The header comes from the create command's own inputs** that are not lines: the
  customer as a search-select fed by its declared lookup, dates, terms, notes. Few fields,
  one row on desktop, in the contract's order; required ones visibly required.
- **The line grid comes from the create command's line collection input** (items, lines):
  one column per line field in the contract's order — product as a search-select, quantity,
  unit value, discount when declared — and a line total column. The last row is always
  an empty row ready for typing; filling it creates the next one.
- **When lines are a separate command** (add line to an existing order), the header commits
  first as a draft through the create command, then the grid adds each line through that
  command as it is completed; the sheet looks the same.
- **Degrade**: when the create command has no line input and no add-line command exists,
  the sheet is the header alone, still keyboard-first, with the total as an input if the
  contract declares one.
- **The money summary** shows the sum of line totals as a live preview while typing, only
  when the contract gives quantity and unit value; after commit the contract's own totals
  replace the preview. Never invent taxes, freight or fees the contract does not declare.
- **Commit is one action**: the create command (or the draft's submit transition when the
  contract declares one), labeled by outcome ("Create order"). After success the sheet
  shows the created order's number, offers "New order", and the sheet resets.
- **The last few created orders**, when the collection query exists, sit in a quiet strip
  below the sheet, read-only, each a link to where the contract allows viewing it.
- Session/context inputs never render as fields; ids are never typed — products and
  customers are picked, never keyed by code-as-id.

## Attention hierarchy (the spine of this experience)

1. The active line row — where the cursor is.
2. The money summary — the total under construction.
3. The header — who and when, filled first and then left behind.
4. Commit, the reset and the recent strip — at the foot.

## Loops

- Pick the customer → Tab into the first line → product, quantity, (unit value prefilled
  when the product carries one) → Enter → the next empty row has focus → … → review the
  summary → commit → "New order" puts the cursor back on the customer.
- Correcting: arrow keys move between cells; a line's remove action deletes the row with
  no confirmation while unsaved; the summary follows immediately.

## Feedback & feedforward

- Keyboard affordances are visible: a short legend under the grid (Enter next line, Tab
  next cell, the key to remove a line).
- Validation per cell, in words, at the cell — a quantity must be above zero, a required
  product — shown when leaving the cell or on commit; never a toast.
- Commit stays disabled until the header's required fields and at least one valid line
  exist; its label names the outcome and, when the preview exists, the total.
- A failed commit reports above the commit button with the reason and keeps every typed
  value; lines the server rejects are marked on their row.

## Disciplines (transversal — always)

- The page name appears once, in the header; the sheet has no title repeating it, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: cells edit, the remove control removes,
  commit commits, a recent order is a link.
- Link color only on real links; line totals and the summary are data.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
  Removing an unsaved line is an edit, not a danger action.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.
- **Leaving with unsaved lines asks once** before discarding them.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the order as a sheet written top to bottom, lines added one after another,
the live summary, one commit. A grid of cells does not fit a phone, so each line becomes a short
row with its own small form. Where this section and the layout described above differ, this section
wins on mobile.

- **The header is one field per line** at the top: customer first, then dates and terms.
- **Lines are list rows**: product first, quantity × unit value small, line total right-aligned.
  An "Add line" control under the last row opens a one-column line form inline; its commit adds
  the row and reopens an empty line form for the next one.
- **Tapping a line** opens its form inline for correction, with remove inside it.
- **The summary and the commit are fixed at the bottom** where the thumb reaches, the total
  visible while lines are added.
- **Product and customer pickers** open full width with search; the on-screen keyboard is numeric
  for quantity and value fields.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the line being added, 2. the total at the bottom, 3. the header.

Forbidden on mobile:
- a grid of cells or a line table that scrolls sideways;
- multi-column forms;
- swipe as the only way to remove a line;
- losing typed lines when a picker opens and closes.

## Forbidden

- A queue of existing orders beside a detail panel — that is the `orderDeskSplit`
  experience, not this one.
- Stage lanes of orders — that is the `lifecycleLanes` experience, not this one.
- A wizard that splits header and lines into steps; the sheet is one document.
- A modal per line on desktop, or lines that require the mouse to add.
- Invented taxes, discounts, freight or totals; the preview sums only contract fields.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 Blank sheet:** on open, the page is an empty order ready for input, not a list of orders.
2. **S2 Header then lines:** customer/header fields sit above a line area where lines are added
   on the same page, without opening another page.
3. **S3 Next line by keyboard:** completing a line (Enter, or the line form's commit on mobile)
   moves focus to a new empty line.
4. **S4 Single commit:** the order is created by one outcome-named action at the foot, after
   which the sheet resets for a new order.
