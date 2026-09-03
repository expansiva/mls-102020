# posWorkbench — experience `scanFirstFlow` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (hybrid dialect — one loop on stage, checkout as a separate act)

Built for the high-volume counter with a scanner: **one action at a time**. The capture
scene is dominated by a single input — scan or type-to-find — at the top; each hit drops
straight into the sale. The cart is a compact strip, glanceable but never competing with
the input. When the operator calls for payment, **checkout is a second act that takes
the whole screen**, then hands back a fresh capture scene. Where `counterSplit` keeps
catalog, cart and payment all on one bench, this flow gives each moment the entire
screen. Target: a long sale captured at scanner speed, heads-down, one beep per item.

## How to instantiate from the defs (the slots)

- **The capture input is the page**: one large field, focused at all times, accepting a
  scanned code or typed fragment against the item query. Typed fragments show a short
  suggestion list under the input — pick by tap, never by typing an id.
- **A hit runs the add-item command immediately**: one unit, and the input clears and
  refocuses. The strip answers with the item just added — name, price — as the loudest
  recent fact.
- **The cart strip** is compact: last item added highlighted, line count and running
  total always visible, one tap expanding the full line list in place (quantities with
  +/- and remove, when the contract provides them), one tap collapsing back to capture.
- **The checkout act**: one clearly labeled action on the strip ("Checkout — R$ 47,50"),
  enabled only when lines exist, opens the full-screen payment scene — the sale's lines
  in review, the money summary large, the checkout command's declared inputs (payment
  method as a choice of the contract's options, amount tendered when declared), and one
  commit button naming the outcome and amount. Back returns to capture with the sale
  intact; nothing commits before this scene's button.
- **After commit**: a brief closing confirmation of the completed sale, then a fresh
  capture scene, input focused. Cancel-sale exists in the expanded strip, subdued, one
  plain confirmation.
- Session/context inputs (operator, register) never render as fields — a quiet caption
  at most; ids are never typed as ids. Never invent prices, taxes or payment methods the
  contract does not declare.

## The capture loop (the heart of the first act)

1. Scan (or type + pick) — the input is always ready, never needing a tap to focus.
2. The strip flashes the added line and the new total.
3. The input is already empty and focused for the next item. One item, one beat.

## Feedback & feedforward

- An unrecognized code reports at the input, in words ("No item matches this code"),
  normal body color, input ready to retry — never a blocking dialog mid-scan.
- A failed add or checkout reports inside its own scene, above the control that failed,
  with retry; captured lines are never lost.
- The checkout and commit buttons stay disabled until actionable; labels always carry
  the outcome and the amount.
- Success is local: the strip's flash in capture, the closing confirmation after
  payment. No page-level banners, no redirects beyond the flow's own scenes.

## Disciplines (transversal — always)

- The page name appears once, small; scene titles never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the strip expands, checkout opens the
  act, the commit button commits — none of them doubles.
- Link color only on real links (there may be none); the total is data, never
  link-colored; touch and scan targets stay generous.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A permanent side-by-side catalog and cart with payment on the same stage — that is the
  `counterSplit` experience, not this one.
- A browsable tile catalog on the capture scene; items arrive by scan or search only.
- Stealing focus from the capture input for anything but the expanded strip or checkout.
- Committing payment anywhere except the checkout scene's single button; Back never
  loses the sale.
- Typed ids for items, operator or register; codes are scanned, matches are picked.
- Invented discounts, fees or payment options; an empty sale disables checkout and says
  nothing else — the input is the invitation.
