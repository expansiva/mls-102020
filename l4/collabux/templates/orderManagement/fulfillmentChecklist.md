# orderManagement — experience `fulfillmentChecklist`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (checklist dialect — one order, its lines ticked off)

The picking and dispatch floor: one order at a time owns the page as **a checklist of its
lines**, each line a large row the operator checks off as the goods are picked or packed,
with a **progress count** ("7 of 10 lines") on top and the **fulfil transition at the end**,
unlocked when every line is accounted for. Prices and totals are not the point; what, how
many and where are. Where `orderDeskSplit` verifies one order's lines and money to choose a
transition, and `lifecycleLanes` reads the whole flow to move orders between stages, here
the question is **"have I got every line of this order, so it can go?"** Choosing the order
is a short first gesture; the checklist is the stage. Target: pick a twelve-line order
without missing or doubling a line, and dispatch it in the same place.

## How to instantiate from the defs (the slots)

- **The order to work comes from the collection query, filtered to the status the fulfil
  transition accepts**: a short list of orders ready to pick, oldest first when the
  contract orders by date — number, customer, line count. When the query declares a search
  input, a field to type or scan the order number opens it directly.
- **The checklist comes from the selected order's item lines**: one row per line —
  description loudest, the quantity large, then location, unit or code when the contract
  exposes them — and a large check control. Money fields stay out of the rows.
- **Checking a line** runs a per-line command when the contract declares one (pick line,
  confirm quantity); otherwise the check is a working mark held on this page, and leaving
  with marks unsaved asks once before discarding them.
- **Short or partial lines**: when the contract declares a picked-quantity input, a line
  can be checked with a smaller quantity and shows as short; without it, a line is checked
  or not — never an invented partial state.
- **The fulfil transition** is one outcome-named action at the foot ("Mark order as
  fulfilled"), enabled when every line is checked; when the contract allows fulfilling
  with short lines, it states how many are short before commit. Other transitions the
  status allows (hold, cancel) sit apart and quiet; cancel confirms naming the order.
- Session/context inputs never render as fields; ids are never typed — the pick or the
  scanned number IS the id.

## Attention hierarchy (the spine of this experience)

1. The next unchecked line — what to pick now.
2. The progress count — how much is left.
3. The fulfil action — locked until done, then the obvious next move.
4. The order's header facts and the list of orders to pick — quiet frame.

## Loops

- Pick the order → the first unchecked line is highlighted → pick the goods → check →
  the highlight moves to the next unchecked line and the count advances → … → all checked
  → fulfil → the order leaves the ready list and the next ready order is offered.
- Undo: a checked line can be unchecked with one tap until the order is fulfilled; the
  count follows. Checked lines sink below a divider "Done" without disappearing.

## Feedback & feedforward

- The progress count is always visible and exact; the fulfil button says why it is locked
  ("3 lines left") instead of only greying out.
- A per-line command failure marks that row with the reason and keeps it unchecked, with
  retry; the rest of the checklist stays usable.
- The fulfil commit reports failure above its button with retry; on success the order
  shows its new status once, then the ready list returns.
- No toasts; feedback lives on the row, on the count and on the fulfil button.

## Disciplines (transversal — always)

- The page name appears once; the checklist's title is the order's identity, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: a ready-list row opens the order, a check
  marks the line, the fulfil button commits.
- Link color only on real links; quantities are data, large but never link-colored.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.
- **The line order is stable**: the contract's order (or location order when declared);
  rows never reshuffle while picking, except checked ones moving under "Done".

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one order as a checklist, the progress count, fulfil at the end. Phones
are the natural device here, often held in one hand on the floor, so the check control must be
reachable by the thumb. Where this section and the layout described above differ, this section wins
on mobile.

- **The ready list is the home view**: one order per row, number and customer first, line count
  small; the type-or-scan field sits above it.
- **The checklist is a view of its own** with back, inside this page: the progress count fixed
  under the header, then one line per row, the quantity large, the check control at the row's end
  as a large target.
- **The fulfil action is fixed at the bottom** where the thumb reaches, showing the lines left
  while locked.
- **Back** returns to the ready list at the same scroll; marks held on the page survive the trip.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the next unchecked line, 2. the progress count, 3. the fulfil
action.

Forbidden on mobile:
- a table of lines or anything that scrolls sideways;
- swipe as the only way to check a line;
- prices or totals pushing the quantities below the first screen;
- the checklist in a drawer over the ready list.

## Forbidden

- A queue beside a full detail panel with money summary and every transition — that is the
  `orderDeskSplit` experience, not this one.
- Stage lanes of orders moved across the board — that is the `lifecycleLanes` experience,
  not this one.
- Several orders' lines mixed on one checklist, or a table of lines with tiny checkboxes.
- Fulfil enabled while lines are unchecked (unless the contract allows short fulfilment,
  and then only after stating the shortfall).
- Editing lines, prices or the customer here; this page checks, it does not compose.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 One order:** the working view shows the lines of exactly one order.
2. **S2 Check per line:** each line has its own check control, and checking one updates a visible
   "n of m" progress count.
3. **S3 Locked fulfil:** the fulfil action is disabled, with the number of lines left, until all
   lines are checked.
4. **S4 Stable rows:** checking a line does not remove it from the page; it stays visible as done.
