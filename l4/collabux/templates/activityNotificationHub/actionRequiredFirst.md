# activityNotificationHub — experience `actionRequiredFirst`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**What needs me, then what happened.** The hub is split by consequence, not by time or by
kind: on top, the notifications that demand an action from this user (approve, reply,
confirm, fix); below, the ones that only inform. The action section is a to-do list that
shrinks as items are handled; the information section is a quiet log read in passing.
Where `inboxSplit` treats every item the same, one at a time in a panel, and `feedTimeline`
mixes everything in one river by time, this page answers first "what is blocked on me?" and
only then "what is new?". Target: nothing that needs this user's action is buried under
information, and the action section reaching zero is the visible end of the job.

## How to instantiate from the defs (the slots)

- **Action-required is decided by the contract, never by guessing**: an item belongs to
  the action section when the contract marks it (an "action required" flag, a kind or
  category the contract declares as actionable) or when it carries a contextual command
  that resolves it. Everything else is information. When the contract can tell neither,
  every item with an available action counts as action-required.
- **The action section, on top**: a headline sentence with its count ("4 need your
  action"), then one row per item — what is asked, from whom, when, and the resolving
  action as a button labeled by outcome ("Approve request", "Reply"). Oldest first, or
  by a due date the contract declares — the item waiting longest is never at the bottom.
- **An action that needs input** (a reason, a reply text) expands the row in place to
  collect it; the action section never navigates.
- **The information section, below**: a quieter list, newest first, items as one line
  each (who/what, when), read/unread marking when the contract distinguishes it, and one
  scoped "mark all as read" for this section only when declared. Information items carry
  no buttons except an identity link to their source.
- **A resolved action item leaves the action section**; when the contract keeps it as a
  record, it appears in the information section as what was done.
- Filters only from contract inputs, applying to both sections. Session inputs never
  render as fields; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The action headline and its count — how much is blocked on me.
2. The action rows and their resolving buttons.
3. The information section — quiet, read in passing.
4. Filters, mark-all and captions, demoted.

## Loops

- Read the top action row → act (or expand, fill, act) → the row leaves, the count drops,
  the next action row moves up — until the action section reaches zero.
- Action section at zero: one calm sentence ("Nothing needs your action") stays in its
  place, so the information below never jumps up to impersonate work.
- Skim the information section at leisure; marking it read never touches the action
  section.

## Feedback & feedforward

- Action buttons name the outcome and enable only when the item is actionable; required
  inputs validate at the field before the button enables.
- A failed action stays in its row, in body color, with retry, input kept; the rest of
  the page stays live.
- Success: the row leaves the action section with a brief exit and the count drops — no
  banner, no toast, no dialog.
- Alarm color only on a due date the contract flags as overdue inside an action row —
  never on the section, never on unread information.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (section titles are plain: "Needs your action",
  "Updates").
- A control is navigation OR action, never both: identity text links to the source, the
  button resolves.
- Link color only on real links; information rows and captions are muted.
- The two sections never merge, never reorder against each other, and an information item
  never carries a primary button.

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
Everything above holds: the action section first, the information section below, resolving in
place, the shrinking count, feedback and disciplines. On a phone the action section takes the first
screen, and the information section follows below it. Where this section and the layout described
above differ, this section wins on mobile.

- **The action headline, then the action rows**, full width: what is asked wrapping, from whom and
  when under it, the resolving button full width at the row's foot.
- **Inputs expand in place** in the row; the field and its button stay above the keyboard.
- **The information section follows**, as one-line rows; long sections show the latest few and one
  control to show more in place.
- **Filters** fold behind one quiet control at the top, applying to both sections.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the action headline and count, 2. the action rows and buttons, 3. the
information section.

Forbidden on mobile:
- tabs that hide the action section behind the information, or the reverse as the default;
- actions reachable only by swipe or long press;
- opening an item in another view to act on it;
- any horizontal scroll.

## Forbidden

- A list with a selected item's detail panel beside it — that is `inboxSplit`.
- One chronological stream mixing action and information items — that is `feedTimeline`.
- Ordering the page by time across both sections; information above action items.
- Classifying items as action-required by reading their text; inventing flags or due dates.
- Primary buttons on information items; mark-all affecting the action section.
- Typed ids; page-level toasts carrying validation; redirects after acting.

## Signals (how to check the generated page)

1. **S1 two sections:** the page renders two distinct sections, action-required first and
   information second, each with a plain title.
2. **S2 action count:** the action section opens with a sentence stating its count.
3. **S3 buttons only above:** resolving buttons appear in the action section; information
   rows carry no primary button.
4. **S4 zero holds its place:** with no action items, the action section still renders,
   stating there is nothing to act on, above the information.
