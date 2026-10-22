# kanbanBoardView — experience `myCardsBoard`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**A personal board: only my cards, arranged by what I do next.** The team board answers
"where is everything?"; this one answers "what is mine, and what is my next move on each?".
The columns are still the statuses — moving a card still changes its status — but the board
shows only the cards the session user owns, the column where the user acts next comes
first and widest, and each card names its next step as its one button. Where `classicBoard`
shows the whole team's flow, and `swimlaneBoard` compares carriers across lanes, this page
drops everyone else and turns the board into a personal next-action list. Target: the user
opens their board, sees what they must move today, and moves it — without scanning other
people's work.

## How to instantiate from the defs (the slots)

- **Mine is the session's scope**: the main query filtered by the owner/assignee the
  contract declares, with the session user as the value — never a field, never a picker.
  When the contract exposes no owner dimension, this experience degrades to the full board
  and says so once in a quiet caption, never pretending the cards are the user's.
- **Columns come from the status dimension**, in declared process order, but only the
  statuses where the user has cards or can act render as full columns; terminal statuses
  (done, closed) collapse into one quiet trailing column with its count. Empty
  non-terminal statuses show as a thin header with "0", never removed.
- **The next-action column leads**: the status from which the user's most common move
  departs (the first non-terminal status in the user's hands, as the process order says)
  renders first in emphasis — wider, heading slightly louder — without breaking order.
- **Each card**: title, the one fact that sets urgency (due date when declared), and the
  **next step button** — the contract's transition natural from the card's status,
  labeled by outcome ("Start", "Send to review"). Other allowed moves behind a quiet "Move
  to"; drag may exist as a shortcut, never as the only way.
- **A headline sentence** above the board: how many cards are mine and how many are due
  or overdue when a due date is declared ("9 cards · 2 due today").
- **Create, when declared**, opens a minimal form with the session user as owner (context,
  never asked) and the first status as context. Ids never typed.

## Attention hierarchy (the spine of this experience)

1. The headline — how much is on my plate.
2. The next-action column and its cards' next step buttons.
3. The rest of my columns in process order.
4. The terminal column, create and filters, demoted.

## Loops

- Open → read the headline → take the top card of the leading column → press its next step
  → the card moves to its new column, counts and headline update → next card.
- A card handed off (its owner changes by a contract command) leaves this board with a
  one-line note in its place until the next refresh.
- Nothing assigned: one calm sentence that the user has no cards, with create when declared.

## Feedback & feedforward

- The next step button names the destination; "Move to" lists only legal moves.
- While a move commits, the card shows a running state; failure returns it to its column
  with the reason and retry on the card — never a page toast.
- Alarm color only on the due fact of overdue cards — never whole cards or columns.
- Success is the card moving; no banners, no dialogs.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a column header never reads like a next step button).
- A control is navigation OR action, never both: the card title opens its detail, the next
  step moves it.
- Link color only on real links; counts and captions are muted.
- Other people never appear as owners on this board; the owner fact is dropped from cards.

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
Everything above holds: only my cards, the headline, the next-action column leading, the next step
button per card, feedback and disciplines. Columns cannot stand side by side, so my statuses become
stacked groups, the next-action group first. Where this section and the layout described above
differ, this section wins on mobile.

- **The headline on top**, then my statuses as stacked groups in process order, the next-action
  group expanded first; each group headed by its status name and count.
- **Cards full width**: title wrapping, the urgency fact under it, the next step as a full-width
  button at the card's foot, "Move to" as one 44px control at the top corner.
- **The terminal group** collapsed at the end, with its count.
- **Card detail** opens as a view of its own with back, returning to the same group and scroll.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the headline, 2. the next-action group and its next step buttons,
3. my other groups, 4. the terminal group and create.

Forbidden on mobile:
- status columns side by side, or a board scrolling sideways;
- other people's cards, or an owner picker;
- drag or swipe as the way to move;
- any horizontal scroll.

## Forbidden

- The whole team's cards in one flat run of columns — that is `classicBoard`.
- Lanes per assignee or type crossing the statuses — that is `swimlaneBoard`.
- An owner/assignee filter field or picker; the session user typed or chosen.
- Cards without a next step when the contract allows a move from their status.
- Removing non-terminal statuses because they are empty; reordering columns against the
  process order.
- Typed ids; page-level toasts carrying validation; whole cards in alarm color.

## Signals (how to check the generated page)

1. **S1 no owner picker:** the page has no field or picker to choose whose cards are shown.
2. **S2 next step on the card:** each non-terminal card carries one primary button named
   for its next status change.
3. **S3 personal headline:** a sentence above the board states how many cards are the
   user's.
4. **S4 terminal folded:** terminal statuses are collapsed into one trailing column or
   group with its count.
