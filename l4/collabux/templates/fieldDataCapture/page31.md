# fieldDataCapture — experience `guidedCaptureFlow` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, bindings — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

One capture at a time, as a short guided scene — built for one hand, gloves, sunlight, and
zero attention to spare. The screen shows **only the current decision**, huge and
unmissable; everything else waits. Where `rapidEntryWorkbench` is a bench with everything
on it, this is a corridor with one door at a time. Target: an entry completed with the
thumb only, without reading anything twice.

## How to instantiate from the defs (the slots)

- **Each command is a flow.** With more than one command, the opening scene is a chooser:
  one large card per flow, verb-first label, nothing else on screen. With a single
  command, skip the chooser and open directly in its first beat.
- **Each flow's beats come from the command's inputs, grouped by decision:**
  1. *the target* — selection inputs (which task, which project) become a large-tile
     picker beat: tap a tile, advance automatically;
  2. *the values* — measure fields (quantity, hours, date) become one beat each when the
     field deserves full attention (a big number pad), or one compact beat for a small
     related group;
  3. *the extras* — optional text is a single final beat that can be skipped with one tap.
- **Session/context values never become beats** — no beat may ask what the system already
  knows. Show them as a one-line context caption ("Maria · Site A"), never editable.
- **The last beat is always the review**: everything chosen, in plain words on one card,
  with the single commit button naming the outcome ("Log 3.5 hours on Framing").

## The flow choreography

- A slim progress rail shows the beats (dots), current one highlighted. **The rail is a
  map, not navigation**: future dots are muted (never link-colored, never clickable);
  going back is a dedicated Back control, one step at a time.
- Advancing is explicit at every beat: picking a tile advances; value beats advance with a
  clearly labeled Next that stays disabled until the beat's value is valid (feedforward).
- The commit happens ONLY on the review beat. Next never commits; the commit button never
  navigates — advancing to the closing scene is the consequence of success.
- On success: a brief closing scene — plain confirmation of what was logged, then one
  primary "Log another" (restarts the same flow at its first beat) and one quiet "Done"
  state if there is nowhere else to go. No redirect.
- Abandoning mid-flow asks nothing if no value was entered; with values entered, one plain
  confirm ("Discard this entry?") — never silent loss, never a double dialog.

## Feedback

- Each beat validates itself before Next enables; errors are spoken at the field, in words
  ("Hours must be more than zero"), never only by color.
- Command failure lands on the review beat, above the commit button, normal body color,
  with retry — the entered values are never lost.
- While committing, the button shows a running state and the review locks.

## Disciplines (transversal — always)

- The page name appears once; beats have short questions as titles ("How many hours?"),
  never the page title again, never the button label as heading.
- One control = one meaning: Next advances, Back retreats, commit commits. No control
  changes role between states.
- Link color only on real links; muted for everything passive, including future rail dots.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Showing two beats' inputs on the same screen (that is the workbench experience, not this
  one).
- A scrollable long form disguised as a flow — each beat fits the viewport without
  scrolling on a phone.
- Free-typed ids for anything the defs marks as selection/session/context.
- Committing before the review beat, or a review that requires editing in place (editing =
  Back to the beat that owns the value).
- Progress rail as tabs/links; skipping required beats; auto-advancing on value fields
  (only tile pickers auto-advance).
- Toasts or page banners for validation; redirects after success.
