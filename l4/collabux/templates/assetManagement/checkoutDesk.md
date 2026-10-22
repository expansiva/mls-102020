# assetManagement — experience `checkoutDesk`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The lending counter for shared equipment — laptops, tools, vehicles, projectors. Its two
questions are **"who has what, since when?"** and "can I hand this out or take it back
now?". The page opens on the equipment that is out, each line naming the holder and the
time held, and its two gestures are check out and check in, done at the counter in
seconds. Where `assetRegistry` documents every asset equally in a dossier, and
`maintenanceBoard` ranks assets by the work they need, this page is about custody: the
person holding the asset is as much the subject as the asset itself. Target: a hand-over
or a return registered in a few seconds, and nothing out without a name beside it.

## How to instantiate from the defs (the slots)

- **"Out now" comes from the assets the contract shows as assigned**: one line per asset —
  the holder's name first, then the asset's identity, then since when ("since Mon 14", "3
  days") from the assignment date, and the due date when the contract carries one. Longest
  held, or overdue, first. Without any date, the line shows the holder only and sorts by
  holder name.
- **Overdue** is marked only when the contract carries a due date and it has passed: the
  time phrase in alarm color, nothing invented from durations.
- **"Available" comes from the unassigned assets** in operational state, as a compact list
  below or beside "Out now", identity and type, each with "Check out".
- **Check out uses the assign command**: a holder picker (a person, a team — whatever the
  contract assigns to), the due date and note only when declared, the asset already chosen.
  The commit label names both ("Lend to Ana Lima").
- **Check in uses the return/unassign command** the contract declares, from the "Out now"
  line, with the condition or note input only when declared. Without a return command, check
  in does not render, and the page says once, quietly, that returns are registered
  elsewhere.
- **A holder view**: choosing a holder's name narrows "Out now" to everything that person
  has — useful when someone returns several items at once; each is checked in from its line.
- **Search** (when declared) finds an asset or a holder at the counter in a few letters.
- Session/context inputs never render as fields; the desk operator comes from session. Ids
  are never typed — assets and holders are picked or found. Never invent due dates, fines
  or lending rules.

## Attention hierarchy (the spine of this experience)

1. "Out now" — holders and times, oldest or overdue first.
2. The check-in action on each line.
3. Search — the way to the asset or person standing at the counter.
4. "Available" with its check-out actions.

## Loops

- Return: someone arrives with an item → search or find the line → Check in → confirm the
  note when declared → the line leaves "Out now" and the asset appears under "Available".
- Hand-over: find the asset under "Available" → Check out → pick the holder → set the due
  date when declared → commit → the asset moves to "Out now" with "since today".
- Several returns from one person: tap the holder's name → check in each line → clear.

## Feedback & feedforward

- The check-out commit stays disabled until a holder is chosen and declared required inputs
  are valid; validation at the field, in words, never a toast.
- A check-out or check-in in flight locks only its line; the rest of the desk stays live.
- A failure reports on the line, above its button, normal body color, with retry; the asset
  stays in its true list — never shown as returned when it was not.
- Success is the move between lists, where the eye can follow, with a brief inline note
  ("Returned by Ana Lima").

## Disciplines (transversal — always)

- The page name appears once, in the header; the two lists are titled in business words
  ("Out now", "Available"), and **no heading anywhere repeats the label of a button or link
  near it**.
- A control is navigation OR action, never both: holder names filter, the asset name links
  to its record when a route is declared, buttons commit.
- Alarm color only on overdue times when a due date exists.

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
Everything above holds: custody as the subject, "Out now" first, check out and check in as the two
gestures, holder filtering and the disciplines. The two lists can no longer sit side by side, so
they stack, and the counter's search leads. Where this section and the layout described above
differ, this section wins on mobile.

- **Search sits at the top**, then "Out now", then "Available", each titled with its count.
- **Each "Out now" line is a compact block**: the holder's name first, the asset below, the time
  held at the right; "Check in" full width at the block's foot.
- **Check out opens a view of its own**, with back: the asset at the top, the holder picker, the
  due date and note when declared, one field per line, the commit at the bottom where the thumb
  reaches. After it commits, back to the desk with the asset under "Out now".
- **Check in confirms on the line itself**, with the declared note input opening in place.
- **Scanning an asset code**, when the contract accepts a code search, opens the matching line.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. search, 2. "Out now" and its check-in buttons, 3. "Available",
4. the way back from check out.

Forbidden on mobile:
- the two lists side by side, a table, or any horizontal scroll;
- swipe as the only way to check in;
- check out without a holder chosen;
- losing the search or scroll place after a check-in.

## Forbidden

- A neutral asset list with a full dossier pane as the spine — that is the
  `assetRegistry` experience, not this one.
- Urgency lanes of assets needing maintenance — that is `maintenanceBoard`.
- An asset shown as out without its holder, or a holder typed as free text when the
  contract assigns to a person.
- Invented due dates, fines, lending limits or overdue rules.
- Check-in and check-out merged into one ambiguous toggle.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 custody first:** the first list shows assets currently out, each line with the holder's
   name.
2. **S2 two gestures:** check out and check in are separate, outcome-named actions.
3. **S3 holder picked:** check out requires choosing a holder through a picker.
4. **S4 move between lists:** after a check-out the asset leaves the available list and appears
   among the assets out, with its holder.
