# caseManagement — experience `conversationFirst` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

One case, told as a conversation: **the thread of comments and events is the page's center
and its product**. Reading top to bottom IS understanding the case — who asked what, what
was tried, what changed, where it stands now. Case data and status actions exist, but at
the margin, as the reference shelf beside the story. Where `caseWorkbench` is a bench with
queue, data and thread as peers for working many cases, this experience is one case's
narrative given the whole room — built for depth, handover and "read this before you
touch it".

## How to instantiate from the defs (the slots)

- **The subject arrives from context** (a link from a queue elsewhere) or, failing that,
  from a single case picker as the opening state — one search-select over what the
  contract exposes, **ids never typed**, nothing else competing.
- **The header states the case once**: subject, requester, current status in words. It
  stays fixed while the story scrolls and never repeats below.
- **The thread interleaves comments and events in strict time order**: comments as spoken
  entries (author name, moment, text), status changes and assignments as quiet system
  lines between them ("Maria assumiu o caso") — as the contract's data phrases them,
  never invented. Oldest first, reading like a transcript; arriving lands the reader at
  the newest entry with the path back up intact.
- **The composer closes the story**: attached to the thread's end, disabled-until-typed,
  the sent comment joining the transcript immediately. Writing is part of reading here —
  the reply is the next line of the same conversation.
- **The margin holds the reference shelf**: the case's fields (every one the contract
  provides, business-worded, read-mostly) and the status actions — ONLY the transitions
  the contract allows from the current status, labeled by outcome ("Resolver caso"). On
  narrow screens the shelf folds behind one control; the thread never folds.
- **Session/context inputs never render as fields**: the commenting agent comes from the
  session — the composer may caption it, never ask it.

## The reading choreography

- The thread is one column at comfortable reading width, generous line height — a
  transcript, not a data grid. Long threads load earlier entries on demand at the top
  ("Mostrar mensagens anteriores"); the story's beginning is reachable, never truncated
  silently.
- System lines are visually quieter than human comments — punctuation, not paragraphs.
- Acting from the shelf (a status change) writes its own system line into the thread when
  the contract's data reflects it — the story stays complete without a reload.

## Feedback & feedforward

- A failed comment reports at the composer, normal body color, with retry, text never
  lost. A failed transition reports on the shelf, by its buttons; the thread stays.
- Transitions that end the case confirm once, in plain words about the consequence;
  action buttons disabled until any required inputs are set.
- Success is local: the new entry or system line appears in place, the header's status
  text updates — no page banner, no redirect, no scroll hijack away from what the user
  was reading.
- Loading: header first, then the thread skeleton; a case with no comments yet shows its
  system lines (creation, assignment) and the composer — a story just beginning, not an
  empty state.

## Disciplines (transversal — always)

- The page title appears once, in the header; the shelf's group labels are subjects, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the composer sends, shelf buttons act;
  if the requester links to a fuller record elsewhere, that is one distinct link.
- Link color only on what is clickable; system lines, timestamps and shelf labels are
  muted; alarm color only on facts the contract flags.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A case queue sharing the stage, or data/thread/actions laid out as three equal regions
  — that is the `caseWorkbench` experience, not this one; here the thread owns the room.
- Two cases on stage at once; tabs of cases; queue navigation inside this page.
- Reordering the thread by anything but time; hiding system events from the transcript.
- Showing transitions the current status does not allow; typed ids anywhere; editable
  session/context values.
- Inventing summaries, sentiment, read receipts or suggested replies the contract does
  not declare.
- Blocking success dialogs, page-level toasts carrying validation, steps or wizards to
  reply or act.
