# activityNotificationHub — experience `groupedDigest`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**The summary before the items.** Notifications arrive in volume and most are alike; the
page folds them into digest lines — "12 orders approved", "3 mentions", "2 stock alerts" —
so the whole picture fits on one screen. Each line is a group the user can expand in place
to see its items and act on them, or settle whole. Where `inboxSplit` handles one item at a
time in a panel, and `feedTimeline` scrolls one item per row through time, this page reads
by KIND first and item second. Target: a hundred notifications understood in one glance as
a handful of lines, and the one group that matters opened and handled.

## How to instantiate from the defs (the slots)

- **Groups come from a dimension the contract declares** on the notification: its kind,
  type, source entity or event — whichever the contract carries. When the contract
  returns groups with counts, use them; otherwise the page groups the loaded items and the
  count says what is loaded. Without any such dimension, the page groups by the source
  record when one is present, and falls back to a plain list only as a last resort.
- **Each digest line**: the count and the kind in one plain sentence ("12 orders
  approved"), the unread part of the count when the contract distinguishes it ("4 new"),
  and the time of the newest item, muted. Lines order by the newest item, unread groups
  first when the contract distinguishes read state.
- **Expanding a line** opens it in place, below itself: the group's items as compact rows
  (who/what, when), each with its contextual action when the contract declares one,
  labeled by outcome. Large groups show the latest few and one control to show the rest
  in place.
- **Group-level actions**: "mark group as read" on each line when the contract declares
  mark-as-read (applied to that group's items), labeled with its scope ("Mark 12 as
  read"). A group-level act on the items themselves (approve all) only when the contract
  declares a command that takes several items.
- **Mark-all-read** once, at the top, labeled with its scope. Filters only from contract
  inputs. Session inputs never render as fields; ids are never typed.

## Attention hierarchy (the spine of this experience)

1. The digest lines — the whole picture, one sentence each.
2. Unread counts within them — where something is new.
3. The expanded group's items and their actions.
4. Mark-all, filters and captions, demoted.

## Loops

- Scan the lines → expand the one that matters → act on its items or mark the group read
  → collapse → the line updates its counts in place → scan again.
- Several groups may be open at once; expanding never moves the lines above it, and
  collapsing returns the list to exactly where it was.
- Nothing new says once, calmly, that the user is caught up.

## Feedback & feedforward

- A digest line's sentence is the feedforward: count and kind tell what expanding will show.
- An item action that fails reports in its own row, in body color, with retry; a group
  action that fails reports on its line.
- Success is local: the item settles (muted, action replaced by a one-word outcome), the
  line's counts drop; a fully settled group stays as a muted line until the next visit.
  No banners, no dialogs, no toasts.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it** (a digest line is a sentence, not an action's label).
- A control is navigation OR action, never both: the line expands, item actions act, an
  item's identity links to its source record.
- Link color only on real links; times, counts of settled groups and captions are muted.
- Counts are always exact for what they describe; a count never claims more than the
  contract or the loaded items support.

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
Everything above holds: the digest lines, expand in place, item and group actions, counts that
update, feedback and disciplines. A digest is already one column; on a phone each line and its
expansion simply take the full width. Where this section and the layout described above differ, this
section wins on mobile.

- **Each digest line is a full-width row**: the sentence wrapping, the new count and newest time
  under it, the expand affordance at the end edge; the whole row toggles.
- **An expanded group** shows its items as rows below the line, each with its action as a button
  on its own line, labeled by outcome; the group's mark-as-read at the group's foot.
- **One group open at a time** on a phone: opening another closes the first, keeping the opened
  line at the top of the screen.
- **Mark-all and filters** stay at the top in one quiet row that wraps.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the digest lines, 2. the open group's items and actions, 3. mark-all
and filters.

Forbidden on mobile:
- expanding a group into a separate view or a sheet;
- actions reachable only by swipe or long press;
- items shown ungrouped as the home view;
- any horizontal scroll.

## Forbidden

- A list with a selected item's detail panel beside it — that is `inboxSplit`.
- A flat chronological stream under day headers, one item per row — that is `feedTimeline`.
- Groups from a dimension the contract does not carry; invented counts or summaries.
- Opening a group as a separate page, drawer or dialog; expansion happens in place.
- Bulk acts on items without a contract command that takes several.
- Typed ids; page-level toasts carrying validation; alarm color as decoration.

## Signals (how to check the generated page)

1. **S1 digest lines:** the home view is a list of group lines, each a sentence with a count,
   not individual notifications.
2. **S2 expand in place:** activating a line reveals its items directly below it, on the
   same surface.
3. **S3 line counts live:** acting on an item inside a group changes that group's count on
   its line, in place, without reloading the list.
4. **S4 no split, no day stream:** there is no detail panel beside the list and no day
   headers as the main structure.
