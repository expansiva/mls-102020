# financialTransactions — experience `paymentWizard`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (hybrid dialect — a queue on stage, each payment as a short guided act)

**One payment at a time, guided.** The page is a calm queue of entries waiting to be paid
(or received), shown as cards; picking one starts a **two-scene guided act** — first review
the entry, then enter the payment details and confirm — closed by a success scene that hands
back the queue. Nobody pays from the list and nobody types an amount while still unsure which
entry it is. Where `ledgerTable` is a dense bench that settles many entries at once by
selection, and `cashflowReview` is a calm reading of money already moved, here the question is
**"am I paying the right entry, the right amount, on the right date?"** Speed is traded for
certainty. Target: a payment registered with no doubt about which entry, which amount and which
date — by someone who does this a few times a week, not all day.

## How to instantiate from the defs (the slots)

- **The queue is the entries query, as a vertical list of cards, never a table**: one card per
  entry — identity (description, counterparty), the due or entry date, the status the contract
  declares, and the **amount large, right-aligned**, tabular, with currency. No column headers,
  no dense rows. When the query declares an open/pending status filter, the queue opens on it.
- **A declared filter with few choices** (category, account, type) becomes a row of pills
  above the list, one per choice plus "All"; a filter with many values stays one quiet select.
  Never a filter bar of inputs, never an invented filter.
- **Picking a card opens the guided act**, as scenes inside this page with back:
  1. **Review** — the entry read-only, every fact the contract gives about it, the amount the
     loudest; one button to continue, labeled with what comes next.
  2. **Payment details** — the payment command's declared inputs (payment date, method,
     account, amount paid when the contract lets it differ), one field per line, prefilled with
     the contract's defaults (date today when declared); the entry's identity and amount stay
     as a compact reminder on top; one confirm button naming the outcome and amount.
- **A step indicator** (for example "Step 1 of 2", "Step 2 of 2", naming the scene) is always
  visible at the top of the act.
- **Success is its own scene**: a large confirmation of what was paid — entry, amount, date —
  and one button back to the queue, where the paid entry is gone (or shows its new status if
  the filter keeps it).
- **Other per-entry commands** (cancel, reschedule) live quietly in the review scene, never on
  the card; cancel confirms naming the entry and amount.
- Session/context inputs never render as fields; ids are never typed — the card IS the id.

## Attention hierarchy (the spine of this experience)

1. In the act: the entry's identity and amount — what is being paid.
2. The one button that moves forward (continue, confirm).
3. The step indicator and back — where am I, how do I return.
4. On the queue: the cards' amounts and dates; pills — quiet frame.

## Loops

- Queue → pick a card → review → continue → fill the details → confirm → success → back to
  the queue, at the same scroll and filter → the next card.
- Back from details returns to review with the typed values kept; back from review returns to
  the queue with nothing committed. Nothing moves money before the confirm button.

## Feedback & feedforward

- The continue button names the next scene; the confirm button stays disabled until the
  required inputs are valid and its label carries the outcome and amount ("Pay R$ 1.240,00").
- Validation at the field, in words, at commit time — never a toast.
- A command failure stays on the details scene, above the confirm button, with retry; every
  typed value is kept.
- Loading the queue keeps card shapes; an unknown amount shows an em dash, never a zero.

## Disciplines (transversal — always)

- The page name appears once, in the header; scene titles name the scene, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: cards open the act, continue and back move
  between scenes, only confirm commits.
- Link color only on real links; amounts in tabular figures with currency, right-aligned; alarm
  color only on facts the contract flags (overdue).
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the queue loads more at its end.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the card queue, one payment at a time, the two scenes and the success
scene, the step indicator. A guided act that takes the whole screen is at home on a phone; only
the buttons move to the thumb. Where this section and the layout described above differ, this
section wins on mobile.

- **The queue is one column of full-width cards**: identity on the left, the amount
  right-aligned and never truncated, date and status small under them.
- **Pills sit in one row under the header**; this row is the only thing that may scroll
  sideways.
- **Each scene takes the whole screen**, back at the top, the step indicator under it, the
  forward button fixed at the bottom where the thumb reaches.
- **The details scene** is one field per line; the date opens the device's date picker and the
  amount raises the numeric keyboard.
- **Back from success** returns to the queue at the same scroll and pill.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the entry's amount and identity, 2. the forward button, 3. the
step indicator and back.

Forbidden on mobile:
- a table, or horizontal scroll of anything but the pills;
- a scene as a sheet over part of the queue;
- the confirm button hidden by the on-screen keyboard;
- truncated or currency-less amounts.

## Forbidden

- A table, a data grid or column headers for the queue; selection and batch payment — that is
  the `ledgerTable` experience, not this one.
- Entries grouped by day with subtotals as a statement to read — that is the `cashflowReview`
  experience, not this one.
- Paying from a card in the queue, or a payment form beside the list.
- A single scene that mixes reviewing the entry and entering the payment details.
- A search field or a row of text inputs as the filter.
- Typed ids for entries, accounts or anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 Card queue:** the entries render as a vertical list of cards; no table and no column
   headers.
2. **S2 Two scenes:** paying goes through a review scene and then a payment-details scene, each
   with back.
3. **S3 Step indicator:** a "Step n of 2" indicator is visible in both scenes of the act.
4. **S4 Confirm only at the end:** no control on the queue or the review scene runs the payment
   command.
5. **S5 Success scene:** success is a scene of its own with a button back to the queue.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "cardLayout": "horizontal",
    "steps": "horizontal",
    "listOverflow": "infinite",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": { "prefer": ["groupNavigateSteps", "groupViewCard"], "forbid": ["groupViewTable", "groupSearchContent"] }
}
```
