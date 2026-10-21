# activityNotificationHub — experience `inboxSplit` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A personal triage desk for notifications: a list on one side where unread items are
unmistakable, and a panel on the other where the selected item shows its full context and
its one contextual action. The user picks an item up, resolves it, puts it down, picks the
next. Where `feedTimeline` is a river read top to bottom, this is a desk where every item
gets handled deliberately, one at a time, without ever leaving the page.

## How to instantiate from the defs (the slots)

- **The list comes from the notification query**: newest first, unread before read when
  the contract distinguishes them. An unread row is visually loud (weight, a small unread
  marker); a read row is muted. Each row shows only identity: who/what happened and when
  — the detail belongs to the panel, never to the row.
- **Selecting a row fills the item panel**: everything the contract provides about the
  item — the source record, the actor, the moment, the message — in plain reading order.
- **Contextual commands become the panel's actions**: the action that resolves the item
  (`actOnNotification` and kin) is the panel's single primary button, labeled with the
  outcome ("Approve request", not "Act"). Mark-as-read is a quiet secondary — or implicit
  on open, only if the contract declares that behavior.
- **Mark-all-read lives once, above the list**, labeled with its scope ("Mark all 12 as
  read"); it never appears per row and never inside the panel.
- **Filters come only from contract inputs** (kind, unread-only): one quiet row above the
  list. Session inputs (whose inbox this is) never render as editable fields; ids are
  never typed — every reference arrives selected or from context.

## Attention hierarchy (the spine of this experience)

1. The unread headline — one sentence above the list ("5 unread"), computed, text not tile.
2. The list, unread items first and loudest.
3. The item panel — context and the one action.
4. Filters and mark-all, quiet at the edges.

## Loops

- Select → read context → act or mark read → the row quiets in place → the next unread is
  one selection away. The page's success is its own quieting.
- After an action, selection moves naturally to the next unread item so the loop never
  stalls; the list never reshuffles under the user's pointer.
- With nothing selected yet, the panel says once, quietly, what selecting will show — it
  never invents a placeholder notification.

## Feedback & feedforward

- A contextual action that fails reports inside the panel, above its button, in normal
  body color, with retry; the list stays untouched.
- The action button is disabled until the item is loaded and actionable; its label always
  names the outcome.
- Success is local: the row's unread marker fades, the headline count drops, the panel
  confirms in one line. No page banners, no blocking dialogs, no redirects.
- Mark-all shows a running state on its own control; rows quiet as the result lands.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: rows select (they do not navigate), the
  panel's drill-down link navigates, the panel's button acts.
- Link color only on real links (the drill-down to the source record); read rows and
  captions are muted text, never blue.

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
Everything above holds: the triage desk, the one contextual action per item, the quieting loop,
feedback and disciplines. Only the shape changes, because the list and the panel can no longer sit
side by side. Where this section and the layout described above differ, this section wins on mobile.

- **Side by side becomes a sequence on the same page**: list → item. The item is a view of its
  own with back, inside this page — never another page. Its context and its action are always on
  screen together, so nothing is acted on blind.
- **The list is the home view**: the unread headline on top ("5 unread"), then mark-all and the
  declared filters in one quiet row, then the rows. Each row stays identity only (who/what, when);
  unread is still unmistakable by weight and the small marker, read rows muted. No horizontal
  scroll.
- **The item view** shows the full context in plain reading order, the drill-down link to the
  source record as a real link, and the one primary action at the bottom, where the thumb
  reaches, labeled with the outcome. Mark-as-read, when explicit, is a quiet secondary next to it.
- **After acting**, the item view confirms in one line and offers "Next unread" as its primary
  control, so the loop never stalls. Back returns to the list at the same scroll and filters, with
  the row quieted in place and the headline count lower; the list never reshuffles.
- **Mark-all** stays once, above the list, never inside the item view.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the unread headline and the unread rows (or, in the item view, its
context), 2. the one action, 3. the way back or to the next unread.

Forbidden on mobile:
- a drawer or sheet over part of the list to show the item;
- the item's action shown without its context on the same screen;
- swipe gestures that act on rows from the list — acting happens in the item view;
- losing the list's place (scroll, filters) after visiting an item.

## Forbidden

- A single chronological stream grouped by day with actions inline on every row — that is
  the `feedTimeline` experience, not this one.
- Acting on an item without its context on screen, or forcing navigation away to see it.
- Alarm color on unread items — unread is emphasis, not an emergency.
- Blocking dialogs for mark-as-read, page-level toasts carrying validation, counts or
  badges the contract does not provide.
- Typed ids for anything the defs marks as selection/session/context.
- Pagination controls dominating the list — depth stays quiet, triage stays on top.
