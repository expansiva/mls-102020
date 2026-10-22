# operationsQueue — experience `slaCountdownList`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**The queue read as a clock.** One list, ordered by time remaining, where every row leads
with its countdown ("12 min left", "overdue 4 min") and the status is secondary. The
operator does not ask "what status is this in?" but "what breaks first?" — and the page
answers by keeping the item closest to its deadline at the top, always. Where
`workQueueSplit` is a seated desk grouping by status with a working panel, and
`cardTriageMobile` is a deck advanced by thumb, this is a single time-ordered list whose
protagonist is the deadline. Target: nothing goes past its deadline unseen; the operator
always knows the next breach before it happens.

## How to instantiate from the defs (the slots)

- **The clock field**: the item's due/deadline date-time as the contract declares it.
  The countdown is computed from it — time remaining, or time overdue once past. When the
  contract declares no due field, the page degrades to **age since creation** ("waiting
  23 min"), ordered oldest first, and says so once in a quiet caption above the list. With
  neither a due nor a creation date, the list keeps the contract's order and the countdown
  column simply does not exist — never an invented timer.
- **The list is the main query**, one row per item: countdown first (leading edge, large,
  tabular), then identity, then status as a small chip. Order is time remaining ascending,
  overdue on top — the contract's sort when it declares one by due date, otherwise the
  page orders the loaded rows and never fakes a server order.
- **Time bands, not buckets**: the list carries quiet divider lines where the countdown
  crosses a threshold the contract declares (an SLA target, a warning window). Without a
  declared threshold, the only divider is "overdue" vs "on time" — the page never invents
  a warning window.
- **Transitions are a row action**: the contract's commands valid for the row's status
  (start, complete, assign) as one compact outcome-named button per row, plus a quiet
  overflow for the rest. An input a transition needs (assignee, reason) expands the row
  in place.
- **Status filters come from declared statuses** only, one quiet row above the list; they
  narrow the clock, never reorder it. Session/context inputs never render as fields; ids
  are never typed — the row is the target.

## Attention hierarchy (the spine of this experience)

1. The top rows — overdue and next to breach, their countdowns loudest.
2. The countdown column as a whole — the shape of the next hour in one vertical scan.
3. Each row's next transition.
4. Filters, captions and the time-basis note, demoted.

## Loops

- Glance at the top → act on the row that breaks first → it leaves or drops in rank → the
  next deadline is now on top. The page re-ranks only between actions, never under the
  pointer.
- The countdown ticks in place (minute resolution is enough) without reshuffling rows;
  when a row crosses into overdue it changes its countdown wording and color where it
  stands, and moves to the top at the next refresh or action — announced, not jumped.
- An empty list says once, calmly, that nothing is waiting against the clock.

## Feedback & feedforward

- The countdown wording is the feedforward: "8 min left" becomes "due now", then
  "overdue 3 min" — the same slot, the same place, the words carrying the state.
- Alarm color belongs ONLY to the countdown text of overdue rows (and the declared warning
  band, when declared); never the whole row, never the page frame. A list that is all red
  ranks nothing.
- A transition in flight locks only its row with a running state; failure lands inside
  the row, in normal body color, with retry. Success is the row moving or leaving — no
  banner, no toast, no dialog.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: the identity may open the item, the row
  button transitions, and neither borrows the other's role.
- Link color only on real links; status chips and captions are muted.
- Time is always relative and unit-bearing ("12 min left", "2 h overdue"); the absolute
  due time is available as secondary text, never the only reading.

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
Everything above holds: the time-ordered list, the countdown as protagonist, the degrade to age,
the row transitions, feedback and disciplines. The countdown column cannot sit beside wide
identity text, so each row stacks with the countdown on its first line. Where this section and the
layout described above differ, this section wins on mobile.

- **Countdown leads each row**: first line, the countdown large and tabular with the status chip
  at the end edge; second line, the identity wrapping, never cut.
- **The row's next transition** is a full-width button at the row's foot, labeled by outcome; the
  overflow is one 44px control at the row's top corner, away from it.
- **Band dividers stay** as full-width quiet lines ("Overdue", "On time"); no table, no
  horizontal scroll.
- **Filters** wrap onto a second line, or fold behind one quiet control when many.
- **A transition that needs an input** expands the row in place, the field and its confirm kept
  above the on-screen keyboard.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the top rows and their countdowns, 2. each row's transition,
3. the band dividers, 4. filters and captions.

Forbidden on mobile:
- the countdown moved below the identity or shrunk to a caption;
- rows reordering while the reader scrolls;
- a list-and-detail sequence as the only way to act, or swipe-only transitions;
- any horizontal scroll.

## Forbidden

- Grouping the queue by status with a working panel beside it — that is `workQueueSplit`.
- One card at a time advanced by two thumb touches — that is `cardTriageMobile`.
- Ordering by anything but time remaining (or age, in the degraded case) as the primary
  axis; status columns or status-grouped sections.
- Invented SLA targets, warning windows or timers when the contract declares no due or
  creation date.
- Alarm color on whole rows or the frame; rows jumping while the pointer is on them.
- Typed ids; page-level toasts carrying validation; redirects after a transition.

## Signals (how to check the generated page)

1. **S1 one ordered list:** the collection is a single list, not grouped by status, with no
   side panel beside it.
2. **S2 time first:** each row's first (leading) element is a relative time text — time left
   or overdue from the due field, or "waiting" from the creation date when there is no due
   field — never the identity or the status.
3. **S3 time order:** the rendered order follows that time (most urgent first), and the
   overdue/on-time divider, when present, is a quiet line inside the same list.
4. **S4 act in the row:** a transition is reachable from the row itself, without opening a
   detail view or page.
