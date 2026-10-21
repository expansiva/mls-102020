# orderManagement — experience `orderDeskSplit` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The order desk: a queue of orders filterable by status on one side, and the selected
order — items, values, customer, and the actions its current status allows — on the
other. The operator works the queue: open, verify, act, next. **Actions are contextual**:
an order shows only the transitions the contract allows from where it stands (approve,
cancel, fulfill), never a full menu of grayed-out verbs. Where `lifecycleLanes` reads the
whole flow spatially to find the bottleneck, this page processes orders one at a time
with full detail in view. Target: verify an order's lines and totals and dispatch the
right transition without leaving the page.

## How to instantiate from the defs (the slots)

- **The queue comes from the collection query**: order identity (number, customer),
  status chip, total right-aligned with currency, and date. Declared status filters form
  one quiet bar above the queue; the contract's default ordering rules (oldest waiting
  first when it says so).
- **The detail panel shows the selected order whole**: header facts (customer, dates,
  status), then the item lines as a compact table — description, quantity, unit value,
  line total — then the money summary (subtotal, discounts, total) with the **total as
  the loudest number on the panel**.
- **Transition actions come from the contract's commands**, rendered only when available
  for the order's current status, each labeled with its outcome ("Approve order",
  "Cancel order"). Destructive or terminal transitions (cancel) sit apart from
  progressive ones and ask one plain confirmation naming the order; a reason input
  appears only when the contract declares one.
- **Editing an order** (when the contract allows it in the current status) is an explicit
  switch; edit never changes status, transitions never edit lines.
- **Creation** happens via one "New" action opening the create command's inputs in the
  panel area; the new order joins the queue in its starting status.
- Session/context inputs never render as fields; ids are never typed — the selection IS
  the id. Never invent statuses, fees or totals the contract does not declare; every
  number shown is the contract's number.

## Attention hierarchy (the spine of this experience)

1. The selected order's lines and total — the facts under verification.
2. The available transitions — few, contextual, outcome-named.
3. The queue and its status filter — who is next.
4. Creation and secondary details — quiet.

## Loops

- Filter to the status that needs work → select the first order → verify lines and
  total → act → the order's chip updates and, if the filter excludes its new status, it
  leaves the queue → the next order is already there.
- After a transition the panel stays on the same order showing its new status — proof in
  place, no redirect; the operator chooses when to move on.

## Feedback & feedforward

- Transition buttons are enabled only when truly available; a missing transition is
  absent, not disabled-forever.
- A failed command reports inside the panel, above the button that failed, normal body
  color, with retry; the queue stays live.
- Form validation (create/edit) speaks at the field, in words, at commit time — never a
  toast.
- Success is local: chip, status and trail updating in place. No page-level banners, no
  redirects.

## Disciplines (transversal — always)

- The page name appears once; the panel's title is the order's identity, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: queue rows select, buttons commit.
- Link color only on real links; alarm color only where the contract flags trouble
  (an overdue or cancelled state), never on the cancel button at rest.

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
Everything above holds: the concept, the contextual transitions, the work-the-queue loop, feedback
and disciplines. Only the shape changes, because the queue and the selected order can no longer
sit side by side. Where this section and the layout described above differ, this section wins on
mobile.

- **Side by side becomes a sequence**: queue → order. Each is a view of its own, with back, inside
  this page — never another page. The queue is the home view; nothing opens by itself on arrival.
- **The status filter becomes one compact control** at the top of the queue (a select or a short
  segmented choice over the declared statuses), never a wrapping bar of buttons. Filter and scroll
  survive a round trip to an order and back.
- **The queue is a list of rows**, one order per row: number and customer first, then status chip
  and date small, the total right-aligned with its currency. No table and no horizontal scroll.
- **The order view keeps the panel's reading order**: header facts, then the item lines as
  stacked rows (description first, quantity × unit value small, line total right-aligned), then
  the money summary with the **total still the loudest number on screen**. Edit and New open as
  views of their own, one field per line, commit at the bottom, and return to the order view.
- **Transitions sit at the bottom of the order view**, where the thumb reaches: only those the
  contract allows from the current status, outcome-named, progressive ones first, cancel apart
  and below with its plain confirmation. "Detail on stage" holds because a transition is
  reachable only from the order view, never from a queue row.
- **After a transition** the view stays on the same order, showing its new status. Back returns
  to the queue at the same place, with the row updated — or gone, if the filter now excludes it.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the order's lines and total, 2. its available transitions,
3. the way back to the queue.

Forbidden on mobile:
- wide tables (the queue or the item lines) or any horizontal scroll;
- transitions or swipe actions on queue rows;
- a drawer or sheet that covers part of the queue to show the order;
- the queue and the order stacked on one long screen.

## Forbidden

- Grouping orders into stage lanes with quick overlay peeks — that is the
  `lifecycleLanes` experience, not this one.
- A status dropdown or editable status field; status moves only through named
  transitions.
- Showing every verb for every order with most disabled; unavailable transitions do not
  render.
- Acting on an order from the queue row without its detail on stage.
- Typed ids for anything the defs marks as selection/session/context.
- Invented totals, taxes or delivery promises; an empty queue for a filter says once,
  quietly, what will appear there.
