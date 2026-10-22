# operationsQueue — experience `stationWallDisplay`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**A wall screen for one station**: a kitchen display, a packing bench, a pickup counter. The
page is read from across the room by several people at once, and touched only to say "done
with this one". Tickets line up in arrival order, left to right, large enough to read at
three metres; one **bump** advances the oldest work and the line closes up. Where
`workQueueSplit` is a seated desk with a queue and a working panel, and `cardTriageMobile`
is a personal deck in one operator's hand, this is a shared, glanceable board for a station:
no selection, no reading panel, no filters to fiddle with. Target: anyone at the station
knows what to make next from where they stand, and clearing a ticket is one touch.

## How to instantiate from the defs (the slots)

- **The tickets are the main query**, in arrival order (oldest first, the contract's
  creation date or its declared order) — never re-ranked by priority unless the contract's
  order says so. Each ticket shows: its short identity (number, table, customer name — as
  the contract labels it) very large; the age since arrival ("6 min") large and tabular;
  and the item's body lines (what to prepare, quantities) when the contract exposes them,
  in a readable size, never truncated.
- **The station is context**: when the contract takes a station, area or site input, it
  comes from the session or the page's context and shows once in the header as the
  screen's name ("Grill"). It never renders as a field the crowd could change.
- **Bump is the single command**: the contract's transition that advances an item from the
  displayed status (start, ready, complete — whatever it declares as the next step), one
  big button at the foot of each ticket, labeled with the outcome ("Ready"). Other
  transitions (cancel, pause) live behind one quiet control on the ticket, never beside
  bump.
- **Status, when the contract declares more than one displayed status**, shows as a band
  of words across the ticket's top ("New", "In progress"); the line is still by arrival,
  never split into status columns.
- **Recall**: when the contract allows reverting the last transition, one quiet "Undo
  last bump" in the header brings the last bumped ticket back; without such a command,
  there is no recall.
- Ids are never typed; nothing on this page asks for input except a reason a transition
  requires, collected on the ticket itself.

## Attention hierarchy (the spine of this experience)

1. The oldest tickets at the leading edge — what to do next, readable across the room.
2. Each ticket's age — how long it has waited.
3. Each ticket's bump button.
4. Header (station name, count waiting, recall), small and quiet.

## Loops

- Look up → read the oldest ticket → do the work → bump → the ticket leaves and the line
  closes up from the right → the next oldest is now first. No navigation, no selection.
- New tickets arrive at the trailing end of the line with a brief, calm highlight — never
  inserted ahead of older work, never a sound or flash the contract does not declare.
- The screen refreshes itself; a ticket under a finger never moves until the touch ends.

## Feedback & feedforward

- Bump commits in one touch, with a short in-place undo window on the bumped ticket
  ("Ready — undo") when the contract allows reverting; otherwise one touch commits.
- Age crossing a threshold the contract declares (a target prep time) turns the AGE text
  to alarm color; without a declared threshold, age is always neutral.
- A failed bump keeps the ticket in place with the reason on it, in body color, with retry;
  a running bump shows on that ticket only.
- An empty station says once, in large calm words, that nothing is waiting.

## Disciplines (transversal — always)

- The page name appears once, in the header, as the station's screen name; tickets never
  repeat it, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: bump acts, nothing on a ticket navigates.
- Legibility at distance is the rule: minimum type well above desktop default, high
  contrast, no muted text for anything that must be read from the station.
- One ticket anatomy for the whole line; no hover, no tooltips, no small print.

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
Everything above holds: arrival order, the large ticket anatomy, one bump per ticket, recall,
feedback and disciplines. A phone or a small tablet mounted at a station shows the line top to
bottom instead of left to right, because a row of wide tickets no longer fits. Where this
section and the layout described above differ, this section wins on mobile.

- **The line runs top to bottom**: the oldest ticket first, full width, then the next; new
  tickets join at the bottom.
- **Each ticket keeps its size**: identity and age on the first line, large; body lines wrapping
  below, never cut; bump full width at the ticket's foot.
- **The header stays small and fixed**: station name, count waiting, recall when declared.
- **The overflow** for other transitions is one 44px control at the ticket's top corner, away
  from bump.
- **Touch**: every target is at least 44px high, bump much more; nothing depends on hover.

Mobile attention hierarchy: 1. the oldest ticket, 2. its age and bump, 3. the next tickets,
4. the header.

Forbidden on mobile:
- tickets shrunk to compact rows to fit more on screen;
- the line scrolling sideways, or any horizontal scroll;
- bump behind a swipe or a long press;
- the overflow placed next to bump.

## Forbidden

- A queue list with a selected item's working panel — that is `workQueueSplit`.
- A personal card deck with two-touch arm-and-confirm and status filter chips — that is
  `cardTriageMobile`.
- Status columns, priority re-ranking, or newer tickets placed ahead of older ones.
- Filters, search, selection or forms on the main surface; the station as an editable field.
- Small or muted text for identity, age or body lines; hover-revealed actions.
- Typed ids; page-level toasts; blocking dialogs on a routine bump.

## Signals (how to check the generated page)

1. **S1 ticket line:** the collection renders as large tickets in one line (left to right on
   desktop, top to bottom on mobile), not as a table or compact list rows.
2. **S2 one bump:** each ticket carries exactly one large primary transition button, other
   transitions behind one quiet control.
3. **S3 no workbench:** the page has no detail panel, no selection state, and no filter or
   search inputs on the main surface.
4. **S4 distance type:** the ticket identity renders well above the page's body text size.
