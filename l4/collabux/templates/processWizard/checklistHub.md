# processWizard — experience `checklistHub`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, steps, fields, validations — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The process as **a board of cards, one per declared stage, done in any order**: each card
states what it needs, opens in place to be worked, and turns "ready" when its required
values are in. The process finishes when every required card is ready — not when the user
reaches the end of a corridor. This is the shape for processes whose parts are independent
and gathered over time: an onboarding waiting on several people, a closing whose checks can
run in any sequence. Where `linearStepper` isolates numbered steps in strict order and
`growingDocument` reveals acts one below the other, this answers "what is still missing,
and which part can I do now?". Target: the remaining work is countable at a glance, and the
finish button is honest about why it is or is not available.

## How to instantiate from the defs (the slots)

- **One card per declared stage** — the process's input groups, in declared order as the
  resting order of the board. Each card carries a short business title for its decision,
  never a number, plus one muted line saying what it asks ("Who joins and from when").
- **Each card has exactly two visible states**: not ready (what is still missing, in words)
  and ready (a one-line recap with real values). A card with no required field the contract
  declares is marked optional and never blocks the finish.
- **Opening a card expands it in place** into its fields; only one card is open at a time.
  Required fields visibly required before any mistake; selections are pickers, never typed
  ids; session/context values never render as inputs — at most a quiet caption.
- **A card's own confirm** ("Mark ready" style, named for the card's decision) validates and
  closes it. It persists only if the contract declares per-stage commands; otherwise values
  are held on the page until the finish.
- **A card whose record already arrived** (carried from where the process was opened) starts
  ready, its recap naming the record, with one "change" link.
- **Dependencies only when the contract declares them**: a card that needs another's answer
  shows "Needs: <other card>" and stays closed until that card is ready. Never invent order.
- **The finish button names the outcome** ("Finish onboarding") and sits under the board.

## Attention hierarchy (the spine of this experience)

1. The progress line — "3 of 5 required ready" — the board's single number.
2. The not-ready cards, each saying what is missing.
3. The open card, when one is open.
4. The finish button, disabled with its reason until every required card is ready.

## Loops

- Glance at the board → open any not-ready card → fill → confirm → the card turns ready, the
  count moves → pick another. The order is the user's.
- Reopen a ready card through its "change" link; editing it returns it to not ready until
  confirmed again. Cards that depend on it say so before they are touched.
- All required ready → the finish button wakes → finish → the board becomes a calm statement
  of what was done. No redirect.

## Feedback & feedforward

- The finish button's reason is written next to it while disabled ("2 required parts
  missing: Access, Equipment") — never a silent gray button.
- Validation is per card, at the field, in words, at that card's confirm.
- A failed per-card save reports inside that card, with retry; other cards stay usable.
- A failed finish reports above the finish button, in normal body color; every card intact.
- Closing an open card with unconfirmed edits asks one plain confirm naming the card.

## Disciplines (transversal — always)

- The page name appears once, in the header; card titles never repeat it, and **no heading
  anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: a card header opens, the card's confirm
  confirms, the finish button commits — nothing changes role between states.
- Link color only on real links ("change"); recaps, counts and "missing" lines are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — if a region has no business name, it has no
  heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: cards in any order, ready versus not ready, the progress count, the
finish gated by required cards, feedback and disciplines. The board becomes one column of cards
and an open card becomes a view of its own, because fields inside an expanded card would push the
board out of sight. Where this section and the layout described above differ, this section wins on
mobile.

- **The board is a list of full-width cards**: title, ready or missing line, recap when ready.
  The progress line sits above the list, the finish button below it.
- **Tapping a card opens it as a view of its own**, with back, inside this page: its fields one
  per line, labels above, the matching keyboard for numbers and dates.
- **The card's confirm sits at the bottom of its view**, where the thumb reaches; confirming
  returns to the board at the same scroll position, the card now showing ready.
- **Back from a card with unconfirmed edits** asks one plain confirm naming the card.
- **The finish button stays in the flow under the last card**, full label, with its disabled
  reason written above it.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the progress line, 2. the not-ready cards, 3. the finish button
with its reason.

Forbidden on mobile:
- cards in a grid of two or more columns, or anything that scrolls sideways;
- a card's fields expanded inside the list, pushing the other cards off screen;
- a step counter or "next" between cards;
- a finish button whose disabled reason is hidden or truncated.

## Forbidden

- A numbered rail with one step per screen and a forward-only Next — that is `linearStepper`.
- Acts revealed one below the other only as earlier ones complete — that is `growingDocument`.
- Enforcing an order the contract does not declare, or hiding cards until others finish.
- A finish button that enables while a required card is not ready, or that says nothing about
  why it is disabled.
- Typed ids or editable fields for anything the defs marks as selection/session/context.
- Page-level toasts carrying validation; inventing cards, dependencies or checks.

## Signals (how to check the generated page)

1. **S1 Cards, not steps:** every declared stage is visible at once as a card; no "Next" and no
   step number exist on the page.
2. **S2 Any order:** a card other than the first can be opened and confirmed while earlier cards
   are still not ready (unless the contract declares a dependency).
3. **S3 Countable progress:** a line states how many required cards are ready out of the total,
   and it changes when a card is confirmed.
4. **S4 Honest finish:** the finish button is disabled while a required card is not ready and its
   reason names the missing cards; it enables when all required are ready.
