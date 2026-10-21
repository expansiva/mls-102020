# activityNotificationHub — experience `feedTimeline` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

One chronological feed, read the way a person catches up: top to bottom, newest first,
grouped under day landmarks, each item complete in itself with its action inline. There is
no selection and no side panel — nothing is "opened", things are read in passing and acted
on in place. Where `inboxSplit` is a desk that handles one item at a time, this is a river:
the user scrolls, skims, taps an action here and there, and reaches the waterline of what
they had already seen.

## How to instantiate from the defs (the slots)

- **The feed comes from the notification query**, newest first, grouped under day headers
  ("Today", "Yesterday", then dates). Day headers are landmarks, plain and muted — never
  controls, never collapsible.
- **Each item is one self-sufficient row**: who/what happened, when (relative time), and —
  when the contract provides one — its inline action as a small button naming the outcome
  ("Approve", "Dismiss"). Everything needed to decide sits in the row; items never expand
  into panels.
- **Unread is a reading marker, not a section**: unread items render slightly louder, and
  a quiet waterline ("You're caught up — seen before this point") marks where the last
  visit ended, when the contract can tell.
- **Mark-all-read sits once at the top**, labeled with its scope; scrolling past items may
  mark them read only if the contract declares that behavior — never invent it.
- **Filters come only from contract inputs**, as one quiet row of choices at the top that
  narrows the same single feed — never multiple parallel feeds.
- **Session inputs never render as fields**; ids are never typed. An item that references
  a record links to it — the link is the row's identity text, not a separate "view" verb.

## Reading flow (the spine of this experience)

1. Top of the feed — mark-all and the newest items: what happened since last time.
2. Downward is backward in time; day headers pace the scroll.
3. The waterline — the natural stopping point; below it, everything is muted and settled.
4. Depth loads quietly as the user keeps scrolling; the page never paginates with numbers.

## Loops

- Scroll → skim → act inline where needed → keep scrolling. Acting on an item settles it
  in place (muted, action replaced by a one-word outcome) — the feed order never changes
  under the reader.
- Returning to the page starts at the top with a fresh waterline; the feed refreshes on
  return, never with a live ticker pushing rows around while the user reads.

## Feedback & feedforward

- An inline action that fails reports inside its own row, in normal body color, with
  retry; the rest of the feed stays untouched.
- Inline action buttons are enabled only when the item is actionable; the label names the
  outcome, never a generic verb.
- Success is local: the row settles, the unread count in the headline drops. No page
  banners, no dialogs, no redirects, no toasts.
- An empty feed says once, calmly, that there is nothing new — a feature, not a shrug.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a day header never says "Mark all read").
- A control is navigation OR action, never both: the item's identity text navigates to
  its source, the inline button acts — the same row offers both, as two distinct controls.
- Link color only on real links; day headers, timestamps and settled items are muted.

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
Everything above holds: the river, the day landmarks, the waterline, the inline actions, the loops
and disciplines. A feed is already one column, so little moves; what matters more on a phone is
that each item stays complete and actionable with a thumb, without opening anything. Where this
section and the layout described above differ, this section wins on mobile.

- **One column, top to bottom**: the page header with the unread count, then mark-all-read and the
  filter row, then the feed under its day headers. Nothing sits beside the feed.
- **The filter row stays one quiet row**: a few choices wrap onto a second line; many collapse into
  one control that opens the same choices in place. It never becomes a strip scrolling sideways.
- **Each item keeps its anatomy on two or three lines**: the identity text (the link to the
  source) first, wrapping instead of truncating; the relative time muted; the inline action button
  below the text, at the row's end edge, labeled by outcome. Link and button stay two distinct
  targets, with clear space between them so a tap never lands on the wrong one.
- **Actions are always visible on the item**: never hidden behind hover, a long press or a
  swipe-only gesture. A swipe may exist only as a shortcut for a button that is already shown.
- **Day headers and the waterline stay** as full-width quiet lines; depth still loads as the
  reader scrolls, and a settled item (muted, one-word outcome) keeps its place in the feed.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the newest items with their inline actions, 2. the day headers and
the waterline, 3. mark-all-read and the filters.

Forbidden on mobile:
- actions reachable only by swipe, long press or hover;
- items that must open a detail view or expand to be acted on;
- truncating the identity text until the item no longer says what happened;
- new rows inserted above the reader while they scroll;
- a filter strip or anything else that scrolls sideways.

## Forbidden

- A persistent selection with a detail panel beside the list — that is the `inboxSplit`
  experience, not this one.
- Items that must be "opened" to be understood or acted on; rows expanding into forms.
- Reordering the feed by anything but time (no severity sort, no unread-first regrouping).
- Alarm color as decoration on unread items or day headers.
- Blocking dialogs, page-level banners, redirects after an inline action.
- Typed ids for anything the defs marks as selection/session/context, and any count,
  grouping or action the contract does not declare.
