# auditTrail — experience `chronologicalLog` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, filters — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An investigator's reading surface: **the module's events as one chronological stream,
newest first, narrowed by filters, inspected one at a time**. The user does not know in
advance what they are looking for — they know a period, a person, or a kind of action, and
they read. The page has two halves that never fight: the stream (what happened, in order)
and the inspection panel (everything about the one event under the lens). Where
`entityHistoryLens` starts from ONE chosen record and tells its story, this experience
starts from time itself and lets any record appear in it.

## How to instantiate from the defs (the slots)

- **The stream comes from the event query**: one row per event, in strict reverse
  chronological order — the contract's timestamp is the spine and nothing may reorder it.
- **Each row carries exactly what identifies the event**: when (compact, humane — absolute
  date with time), who (the actor's name, never an id), and what happened in business
  words ("Alterou o limite de crédito de Cliente X"). One line; details wait for the panel.
- **Filters come from the contract's filter inputs** — typically who, what kind, when —
  rendered as a compact filter row above the stream. Actors and entities are pickers over
  what the contract exposes, periods are range choices; **ids are never typed**. Filters
  apply visibly and are removable one by one; active filters are always readable as words.
- **Selecting a row opens the inspection panel** beside the stream (over it on narrow
  screens): the full event — every field the contract provides, changed values shown as
  readable before/after pairs when the contract carries them, raw payload last and
  collapsed. The stream stays visible and keeps the selected row marked.
- **Export**, when the contract provides it, acts on the CURRENT filtered stream and says
  so on its label ("Exportar resultado filtrado").
- **Session/context inputs never render as fields** — the viewing user, the organization:
  caption at most, never editable. This page reads; it never writes.

## Attention hierarchy (the spine of this experience)

1. The filter row — the question being asked, readable as words.
2. The stream — newest first, scannable by the "who + what" line.
3. The inspection panel — deep, but only for the selected event.
4. Export and secondary tools, quiet, after the content.

## Loops

- Narrow with a filter → scan the stream → open an event → read → close or move to the
  next row (selection moves without losing filters). The investigation tightens by
  filtering, never by navigating away.
- Paging through a long stream keeps filters and selection context; returning to the page
  keeps the last question asked when the contract's state allows it.

## Feedback & feedforward

- A stream that is loading shows skeleton rows in place; the filter row is usable first.
- A filter combination with no events says so in the stream area, in words that repeat the
  active filters ("Nenhum evento de Maria neste período") — never a generic empty state,
  never invented rows.
- A failed query reports inside the stream region, normal body color, with retry; filters
  stay as set. Panel failures report inside the panel; the stream stays.
- Alarm color appears only if the contract flags an event as critical — never on rows by
  default; a log painted red ranks nothing.

## Disciplines (transversal — always)

- The page title appears once, in the header; the panel titles itself with the event, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, filters filter, export
  exports — no row both opens the panel and navigates elsewhere.
- Link color only on what is clickable; timestamps, actor names and captions are muted
  unless they are real links the contract justifies.

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
Everything above holds: time as the spine, the read-only stance, filters as the question, the
loops, feedback and disciplines. Only the shape changes, because the stream and the inspection
panel can no longer sit side by side. Where this section and the layout described above differ,
this section wins on mobile.

- **Side by side becomes a sequence on the same page**: stream → event. The inspection is the
  view "over the stream" the body already names for narrow screens: a view of its own with back,
  inside this page. The stream stays one tap away, at the same place, the inspected row marked.
- **The stream is the home view**: strict reverse chronological order, one event per row — the
  "who + what" line first, the timestamp muted under it. Rows may wrap to two lines; never a table,
  never horizontal scroll. More events load at the end.
- **Filters become a quiet bar on top of the stream**: the active filters readable as words, each
  removable with one tap, and one control that opens the filter choices (period, person, action)
  as a view of their own, one choice per line, applied with one button at the bottom. The stream
  keeps the filters after every visit to an event.
- **The event view** shows every field in one column, before/after pairs stacked (before above
  after) rather than side by side, raw payload last and collapsed. It never edits anything.
- **Export**, when declared, stays quiet at the foot of the stream, its label naming the filtered
  scope.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the active filters as words, 2. the stream (or, in the event view,
the event), 3. the way back.

Forbidden on mobile:
- a drawer or sheet over part of the stream to show the event;
- before/after values in side-by-side columns that force sideways scrolling;
- filter choices spread as a form over the stream, or a stream that forgets its filters;
- any edit, delete or replay control, on any view.

## Forbidden

- Opening pre-anchored on a single record's history with before/after as the main content
  — that is the `entityHistoryLens` experience, not this one; here time is the spine and
  the record is a filter at most.
- Any control that edits, deletes or replays events — an audit surface is read-only.
- Rows sorted by anything but time; grouping that hides chronology.
- Typed ids in filters; actor or entity filters as free-text guessing.
- Inventing severity, categories or icons for events the contract does not classify.
- Blocking dialogs for inspection — the panel never covers the whole stream on wide
  screens.
- Steps, wizards or any act-like progression — reading a log has no stages.
