# posWorkbench — experience `openTabs`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The bar, the restaurant floor, the workshop counter: **many sales are open at once**, each a
tab named by its table or customer, and they stay open for minutes or hours while items are
added in bursts. The page is a **switcher of open tabs** — every tab visible with its name,
its total and how long it has been open — and the one tab in focus, with its lines and the
add-item search. Switching never loses anything; closing a tab sends that tab, and only it,
to payment. Where `counterSplit` and `scanFirstFlow` both serve one sale from first item to
payment before the next customer, here the question is **"which tab does this go on, and
which tab is ready to close?"** Target: add a round to table 7, then two items to table 3,
then close table 5 — without a wrong tab and without losing a line.

## How to instantiate from the defs (the slots)

- **The switcher comes from the query of open sales** (status open, or the contract's
  equivalent): one tile per tab — its label (table, customer name, or the name the open
  command accepts) loudest, total with currency, item count, and time open when the data
  carries a start date. Ordered by the contract's order, else by opening time.
- **"Open tab" runs the create-sale command**, asking only its declared label inputs (a
  table number from a declared list, a customer pick, a free name); the new tab takes the
  focus at once.
- **The focused tab** shows its lines (item, quantity with +/- when the contract provides
  update/remove, line total), the money summary and the **tab's total as the loudest
  number in the focused area**, and an add-item search over the item query on top of the
  lines. Each add runs the add-item command on THIS tab's sale.
- **Closing a tab** is one action on the focused tab, labeled with the outcome and amount
  ("Close tab — R$ 82,00"); it reveals the checkout command's declared inputs (payment
  method from the contract's options, amount tendered when declared) inside the focused
  area. Moving lines between tabs or splitting a bill appear only when the contract
  declares such commands.
- **Cancel tab** is subdued in the focused tab, one confirmation naming the tab's label.
- **Degrade**: with no query of open sales, the switcher holds only the tabs opened in
  this session on this device, and says so once; never invented tabs.
- Session/context inputs (operator, register) never render as fields — a quiet caption at
  most; ids are never typed — the tab IS the sale id.

## Attention hierarchy (the spine of this experience)

1. The name of the focused tab — the guard against adding to the wrong one.
2. The switcher — every open tab, its total, always on screen.
3. The focused tab's lines, total and add-item search.
4. Close tab — dominant only when the focused tab has lines; open tab and cancel — quiet.

## Loops

- Tap a tab in the switcher → its name and lines fill the focused area → search/add items →
  the tile's total updates in the switcher → tap the next tab. No "save": every add is
  already committed to that tab.
- Closing: focus the tab → close → payment inputs → commit → a brief confirmation → the tile
  leaves the switcher and the focus moves to no tab (an empty state that invites picking or
  opening one) — never silently to another tab.

## Feedback & feedforward

- The focused tab's tile is marked in the switcher and its name heads the focused area, so
  the two always agree.
- Each add answers in place: the line appears, the totals in the focused area and on the
  tile change together.
- A failed command reports inside the focused area, above the control that failed, with
  retry; the switcher stays live and other tabs untouched.
- Close and commit buttons stay disabled until actionable; their labels carry the outcome
  and the amount. Payment validation speaks at the field, in words — never a toast.

## Disciplines (transversal — always)

- The page name appears once, small; the focused area's title is the tab's label, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: tiles switch focus, buttons commit.
- Link color only on real links (there may be none); totals are data.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.
- **Tiles never reorder while a tab is in focus**; position is how the operator finds a tab.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: many open tabs, one in focus, nothing lost when switching, closing one tab
to payment. The switcher and the focused tab can no longer sit side by side, so each becomes a
view. Where this section and the layout described above differ, this section wins on mobile.

- **The switcher is the home view**: open tabs as a grid of two columns of large tiles, label
  loudest, total under it; "Open tab" fixed at the bottom.
- **A tab is a view of its own** with back, inside this page: its label as the title, the
  add-item search on top, the lines as list rows, and a bar fixed at the bottom with the tab's
  total and "Close tab" with its amount.
- **Switching** is back to the switcher and another tap; the tab's search text is cleared, its
  lines intact.
- **Payment inputs open in place** in the tab view, one field per line, the commit at the bottom;
  after commit the switcher returns without that tile.
- **Touch**: every target is at least 44px high, tiles more; nothing depends on hover.

Mobile attention hierarchy: 1. the tab's label (or, in the switcher, the tiles), 2. its lines and
total, 3. close tab.

Forbidden on mobile:
- a tab view without its label visible at the top;
- tiles in a row that scrolls sideways;
- swipe between tabs as the only way to switch;
- payment as a separate page that loses the tab on back.

## Forbidden

- Catalog tiles and one cart side by side as the whole stage, the next customer only after
  payment — that is the `counterSplit` experience, not this one.
- One dominant scan input with checkout as a full-screen act for a single sale — that is the
  `scanFirstFlow` experience, not this one.
- Hiding the switcher while a tab is focused, or keeping only one tab open at a time.
- Moving focus to another tab automatically after an add or a close.
- Invented tables, seats, service charges or split rules not in the contract.
- Typed ids for tabs, items, operator or register.

## Signals (how to check the generated page)

1. **S1 Switcher:** several open sales are visible at once, each with its label and total.
2. **S2 Focus named:** the area where items are added is headed by the focused tab's label.
3. **S3 Nothing lost:** switching to another tab and back shows the first tab's lines intact.
4. **S4 Close one:** closing a tab takes only that tab to payment; afterwards it leaves the
   switcher and the other tabs remain.

## Molecule rules

```json
{
  "axes": { "recordsView": "grid", "numberInput": "stepper", "validation": "inline-below", "feedback": "inline" },
  "groups": { "prefer": ["groupViewCard", "groupSearchContent"], "forbid": [] }
}
```
