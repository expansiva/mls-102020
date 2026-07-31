# posWorkbench — experience `counterSplit` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The counter: item catalog and search on one side, the cart on the other — **the cart is
ALWAYS visible and its total is the biggest number on the screen**, readable across the
counter by the customer too. Everything is one or two taps; the whole sale, payment
included, happens on this one stage. Where `scanFirstFlow` gives the screen to one action
at a time and makes checkout its own scene, this is a bench where picking and reviewing
happen simultaneously. Target: a multi-item sale rung up in seconds, with the running
total never out of sight.

## How to instantiate from the defs (the slots)

- **The catalog side comes from the item query**: large touch tiles — name and price,
  image when the contract carries one — with search on top for what tiles don't surface.
  Declared category groupings become quick filter chips above the tiles; never invent
  categories.
- **Tapping a tile runs the add-item command**: one tap, one unit, the line appears in
  the cart (or its quantity increments). Quantity beyond repeat-taps is edited on the
  cart line, not asked before adding.
- **The cart side is a live list of the sale's lines**: item, quantity (with immediate
  +/- when the contract provides update/remove), line total; beneath the lines the money
  summary the contract computes — discounts only if a discount command exists — ending in
  the **grand total, huge**.
- **Payment is the final action of the same stage**: one dominant button under the total,
  labeled with the outcome and the amount ("Charge R$ 47,50"), enabled only when the cart
  has lines. It reveals the checkout command's declared inputs (payment method as a
  choice of the contract's options, amount tendered when declared) in place, cart still
  visible; committing completes the sale.
- **Cancel sale** is present but subdued, one plain confirmation.
- Session/context inputs (operator, register) never render as fields — a quiet caption at
  most; ids are never typed. Never invent prices, taxes or payment methods the contract
  does not declare.

## Attention hierarchy (the spine of this experience)

1. The grand total — visible always, from anywhere behind the counter.
2. The catalog tiles — where the hands work.
3. The cart lines — verification at a glance.
4. Payment button — dominant only once lines exist; cancel — quiet.

## Loops

- Tap items → the cart grows, total updates instantly → adjust a quantity on its line →
  charge → confirm payment inputs → the sale completes, the cart resets empty, focus
  returns to search/tiles for the next customer. Zero navigation between sales.
- Wrong item: remove on the line itself, immediately, no confirmation for a single line
  (the cart is the draft) — cancel-sale is the only destructive act that asks.

## Feedback & feedforward

- Every tile tap answers instantly in the cart — the line appearing IS the feedback;
  no dialogs on add.
- A failed command (add, checkout) reports inside the region it belongs to — the cart or
  the payment area — normal body color, with retry; tiles stay usable.
- The payment button stays disabled until the sale is chargeable; its label names the
  outcome and amount. Validation of payment inputs speaks at the field, in words.
- Success is local and brief: a short completed-sale confirmation in the cart area, then
  the reset. No page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, small — this screen belongs to the sale, not to a title;
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both; nothing on this page navigates.
- Link color only on real links (there may be none); the total and prices are data,
  never link-colored; touch targets stay generous everywhere.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A single dominant scan/search action with the cart as a compact strip and checkout as
  a separate full-screen scene — that is the `scanFirstFlow` experience, not this one.
- Hiding or collapsing the cart at any moment, or a total smaller than the page title.
- A quantity prompt before adding an item; add first, adjust on the line.
- Payment as a wizard of steps or on another page; it happens beside the cart.
- Typed ids for items, operator or register; tiles and session carry them.
- Invented discounts, fees, loyalty points or payment options not in the contract.
