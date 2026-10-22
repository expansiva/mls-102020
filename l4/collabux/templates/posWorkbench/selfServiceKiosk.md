# posWorkbench — experience `selfServiceKiosk`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (corridor dialect — three short acts: choose, review, pay)

The screen faces the customer, not the operator: someone who has never seen it before,
standing, maybe in a hurry, orders and pays alone. The page is a **short corridor of three
acts** — choose items from large visual tiles, review "your order", pay — with the order's
total always visible and a way back at every point. There are no codes, no search-first
input, no operator words. Where `counterSplit` gives a trained operator a dense bench with
catalog and cart together, and `scanFirstFlow` gives a cashier a heads-down scan loop, here
the question is **"can a stranger order and pay without help?"** Target: a first-time
customer picks three items and pays in under a minute, never asking what a button means.

## How to instantiate from the defs (the slots)

- **The choose act comes from the item query**: large tiles in two to four columns — image
  when the contract carries one, else a large name tile — the name in plain words and the
  price. Declared categories become big tabs or buttons across the top; with none, the
  tiles are one scroll. No search field unless the catalog is too long to browse, and then
  as a secondary control.
- **Tapping a tile** opens a large item card: image or name, description when declared,
  price, a big quantity stepper starting at 1, and "Add to my order" running the add-item
  command. Options or modifiers appear only when the contract declares them, one choice
  per row.
- **"Your order"** is a bar always visible during choosing: item count and total, and the
  button to review. The review act lists items in plain words with +/- and remove (when the
  contract provides them), the total largest, and "Pay" naming the amount.
- **The pay act shows the checkout command's declared inputs** as large choices (the
  contract's payment methods as big buttons, never a dropdown) and one commit. Amount
  tendered appears only when declared. A customer name or number for pickup appears only
  when the create or checkout command declares it.
- **The done screen** shows the order number or the confirmation the contract returns,
  large, then returns to the start by itself after a short pause or one tap.
- Session/context inputs (register, store, operator) never render as fields or captions;
  ids are never typed. Never invent prices, promotions, upsells or payment methods.

## Attention hierarchy (the spine of this experience)

1. The large tiles — the menu itself.
2. The "your order" total — what I am going to pay.
3. The next step's button — one obvious move per act.
4. Back and start over — always present, never loud.

## Loops

- Start → tap a category → tap a tile → choose quantity → add → the bar's total changes →
  more items or "Review" → adjust → "Pay" → choose payment → done → back to start.
- Back from review returns to choosing with the order intact; back from pay returns to
  review. "Start over" asks once, then empties the order.
- After a long time with no touch, the screen asks whether the customer is still there and,
  without an answer, starts over — no half order left for the next person.

## Feedback & feedforward

- A step indicator shows where the customer is ("Step 2 of 3", in plain words naming the
  act) at the top of each act.
- Every add answers at once: the bar's count and total change with a brief highlight.
- Errors speak in plain language, large, near the control, with one way to try again
  ("This payment did not go through. Try again or choose another way to pay."); never an
  error code, never a toast.
- Buttons name what happens next ("Add to my order", "Review my order", "Pay R$ 32,00").

## Disciplines (transversal — always)

- The page name, if shown at all, appears once, small — the screen belongs to the menu;
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: category buttons and back navigate, add
  and pay commit.
- Link color only on real links (there are none); prices and totals are data.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields; long categories load more as they scroll.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
  "Start over" is the only such act.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — and neither is operator vocabulary:
  no SKU, line, register, checkout, tender or void.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: three short acts, large visuals, plain words, the total always in view.
On a phone the customer orders from their own device, so the tiles shrink to fit but stay the
largest thing on screen. Where this section and the layout described above differ, this section
wins on mobile.

- **Categories become one row of chips** under the step indicator; this row is the only thing
  that may scroll sideways.
- **Tiles in two columns**, image on top (or the name, large), name and price under it.
- **The item card is a view of its own** with back, the quantity stepper large and "Add to my
  order" at the bottom where the thumb reaches.
- **"Your order" is a bar fixed at the bottom** with count, total and the review button; in
  review and pay the main button takes its place.
- **Payment methods stack as full-width buttons**, one per line.
- **Touch**: every target is at least 44px high, tiles and steppers more; nothing depends on
  hover.

Mobile attention hierarchy: 1. the tiles (or the review list), 2. the total in the bar, 3. the
next step's button.

Forbidden on mobile:
- horizontal scroll of anything but the category chips;
- a total hidden while choosing;
- small text links as the only way back;
- dropdowns for payment method or quantity.

## Forbidden

- A dense operator bench with catalog and cart side by side — that is the `counterSplit`
  experience, not this one.
- A scan or code input as the main way to add items — that is the `scanFirstFlow`
  experience, not this one.
- More than three acts before the done screen, or a sign-up step the contract does not need.
- Operator jargon, codes, ids or internal statuses anywhere on screen.
- Small tiles, dense tables or lists without visuals or large names.
- Invented upsells, combos, promotions or tips not in the contract.

## Signals (how to check the generated page)

1. **S1 Big tiles:** items are chosen from large tiles; no scan or code field is the main input.
2. **S2 Three acts:** choosing, reviewing and paying are separate acts with a step indicator and
   a back control in each.
3. **S3 Total in view:** while choosing, a persistent "your order" area shows the item count and
   total.
4. **S4 Plain words:** no visible label uses operator terms (SKU, line, register, tender, void).
5. **S5 Back to start:** after payment, a done screen leads back to the first act with an empty
   order.
