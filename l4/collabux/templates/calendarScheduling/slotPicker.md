# calendarScheduling — experience `slotPicker`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (corridor dialect — four short acts, one page)

Scheduling **from the side of the person booking**, not the scheduler: choose what, choose the
day, choose a free time, confirm. The question it answers is **"when can I get this?"** — the
booker never sees other people's appointments, only what is open to them. Each act narrows the
next, and every choice made stays visible above the act in progress, so going back is one tap on
a choice, never a back button through screens. Where `calendarGrid` hands the scheduler a map of
everyone's time and `agendaTimeline` streams the items to keep up with, this experience is a short
corridor that ends in one booking. Target: customers, patients or employees booking a service,
room or appointment for themselves.

## How to instantiate from the defs (the slots)

- **Act 1, what**: the service (or resource, or appointment type) comes from the booking
  command's selection input or a services query — one card or row per option, its business name
  and the facts the contract carries (duration, price, place). When the command has no such
  input, act 1 does not exist and the corridor starts at the day.
- **Act 2, day**: a compact month of dates. When the contract declares an availability query,
  days with no free slot are muted and not selectable; without one, every day the command
  accepts is selectable and availability is learned at act 3 or at commit — never guessed.
- **Act 3, time**: the free slots of the chosen day, as a grid of time buttons, from the
  availability query. Without an availability query, act 3 is the command's time input as a
  plain time choice, and the server's answer at commit is the truth.
- **Act 4, confirm**: a summary of every choice in words (what, day, time, and any place or
  resource the contract returns), the remaining command inputs one per line (notes, contact
  fields the contract asks for), then ONE commit button naming the outcome ("Confirm booking").
- **Who is booking comes from the session**: never a field, at most a caption on the summary.
  Ids are never typed; other people's bookings are never shown.

## Attention hierarchy (the spine of this experience)

1. The act in progress — the one decision to make now.
2. The choices already made, as a compact trail above it, each one tappable to change.
3. The commit at act 4, naming what will be booked.
4. The confirmation after commit.

## Loops

- Pick service → the days appear → pick a day → its free times appear → pick a time → the
  summary appears → confirm → the page shows the confirmation in place.
- Change of mind: tap an earlier choice in the trail → that act reopens with the choice kept
  marked; later choices that no longer fit are cleared, and the page says which, once.

## Feedback & feedforward

- Each act appears only when the previous one is chosen; nothing below is shown empty or
  disabled in advance. A step indicator ("Step 2 of 4", in the page's language) sits with the
  trail.
- Loading the days or times shows the act's frame with a quiet running state, not a full-page
  spinner.
- A day with no free time (once known) says so in one line and offers the next date that has
  one, when the availability query provides it.
- If the slot was taken meanwhile, the failure appears at act 3 in normal body color, the slot
  is marked as no longer free, and the user picks another — the other choices are kept.
- Success replaces the corridor with the confirmation: what, when, where, in words, plus the
  cancel or reschedule command when the contract declares one. No redirect, no blocking dialog.

## Disciplines (transversal — always)

- The page name appears once, in the header; acts are labeled by their question ("Choose a
  day"), and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: trail choices navigate back; option, day and
  time buttons choose; only the final button commits.
- Nothing is committed before act 4 — choosing a slot never books or holds it unless the
  contract declares a hold command.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields; the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions (canceling the booking after
  success): never a default button, always behind a confirmation that names the booking.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the four acts, the trail of choices, availability only from the contract,
one commit, the confirmation in place, loops and disciplines. The corridor already fits a phone;
what changes is that only the act in progress gets the screen. Where this section and the layout
described above differ, this section wins on mobile.

- **One act at a time fills the column**; the trail of earlier choices collapses into one short
  line at the top ("Haircut · Tue 14"), each part tappable to reopen its act.
- **Services are full-width rows**, name first, the contract's facts on a second line.
- **The month is a compact calendar** that fits the width, one month at a time with earlier /
  later controls; it never scrolls sideways.
- **Times are a grid of buttons**, three or four per line, grouped by morning and afternoon when
  the day is long.
- **Confirm** shows the summary, the remaining inputs one per line, and the commit at the bottom
  where the thumb reaches, kept visible above the on-screen keyboard.
- **Touch**: every target is at least 44px high, day cells and time buttons included; nothing
  depends on hover.

Mobile attention hierarchy: 1. the act in progress, 2. the trail line, 3. the commit at act 4.

Forbidden on mobile:
- a week of time columns, or anything that scrolls sideways;
- several acts open at once, stacked below each other;
- a trail that cannot be tapped, forcing the browser's back to change a choice;
- the commit hidden under the keyboard.

## Forbidden

- A week or month grid of everyone's blocks — that is `calendarGrid`; the booker sees free time,
  never occupancy.
- An agenda list of existing items with inline actions — that is `agendaTimeline`.
- Showing other people's appointments, names or reasons on any act.
- Inventing availability, opening hours, durations or "next free" suggestions the contract does
  not provide.
- A single long form with service, date and time fields side by side instead of the corridor.
- Typed ids; editable fields for who is booking; redirects or blocking dialogs after confirm.

## Signals (how to check the generated page)

1. **S1 Corridor:** the page shows its decisions in sequence (what → day → time → confirm), and
   a later act does not render before its previous choice is made.
2. **S2 Trail:** after a choice, it stays visible above the act in progress and can be tapped to
   reopen that act.
3. **S3 Booker view:** no other person's booking identity appears anywhere on the page.
4. **S4 One commit:** exactly one command call happens, from the final act; earlier choices
   never call a command.
