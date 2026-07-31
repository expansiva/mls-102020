# auditTrail — experience `entityHistoryLens` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, filters — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

This page answers one question, asked about one thing: **"what happened to this record?"**
It is a lens, not a log. The user first chooses (or arrives already carrying) a single
record; the page then tells that record's story as a timeline of its changes, each change
readable as a plain before/after. Where `chronologicalLog` starts from time and lets any
record appear in the stream, this experience starts from the record and shows nothing that
did not happen to it. The story reads top-down like a biography: what it is, then
everything it went through, newest first.

## How to instantiate from the defs (the slots)

- **Act one — the subject.** If the record arrives from context (a link from another
  page), skip straight to its story. Otherwise the opening state is a single record
  picker over what the contract exposes — one generous search-select, nothing else
  competing. **The id is never typed**; the picker shows business identity (name, code as
  the contract labels it).
- **The subject header** states which record is under the lens: its display name and the
  few identifying fields the contract provides. It appears once, stays fixed while the
  story scrolls, and offers one control to change the subject (back to the picker).
- **Act two — the story.** Every event the contract returns for this record becomes one
  timeline entry, newest first: when, who (name, never id), and what changed.
- **The before/after is the product**: each change renders as readable pairs — field label
  in business words, old value struck or on the left, new value emphasized or on the
  right, formatted as the contract declares (currency, dates, enumerations in words).
  Never raw diffs, never JSON as the primary reading; raw payload may exist collapsed at
  the entry's end.
- **Lifecycle events read as milestones**: creation, status transitions and closure are
  visually distinct entries — the punctuation of the biography — when the contract marks
  them as such; never invent milestones it does not declare.
- **Session/context inputs never render as fields**; this page reads and never writes.

## The reading choreography

- The timeline is one column, generous line height — built for reading, not scanning
  density. Consecutive entries by the same actor on the same day may share a quiet date
  shoulder, but every entry keeps its own timestamp.
- Long stories load more on demand at the bottom ("Mostrar alterações anteriores"); the
  newest chapter is always the first thing seen.
- Within-story narrowing, when the contract provides filters, is limited and humble — by
  period or by kind of change — rendered as small choices above the timeline, never a
  filter wall.
- Changing the subject swaps the whole story; two records are never on stage at once.

## Feedback & feedforward

- Loading: the subject header resolves first, then skeleton entries in place.
- A record with no history says so in the story area, in words about the subject ("Nenhuma
  alteração registrada para este contrato") — never invented entries.
- A failed history query reports inside the story region, normal body color, with retry;
  the subject header stays.
- Alarm color only where the contract flags a change as critical; the biography is
  otherwise calm.

## Disciplines (transversal — always)

- The page title appears once, in the header; the subject header names the record, not the
  page, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the subject switcher navigates within the
  page's own states; timeline entries expand, they do not navigate.
- Link color only on what is clickable; old values, timestamps and captions are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A cross-record event stream with who/what/when filters as the main surface — that is the
  `chronologicalLog` experience, not this one; here nothing renders before a subject is
  chosen.
- Showing events from other records, "related activity", or module-wide statistics.
- Any control that edits, reverts or replays a change — the lens is read-only.
- Typed ids to choose the subject; raw payload as the primary rendering of a change.
- Inventing a change summary, severity or milestone the contract does not declare.
- Two subjects compared side by side; tabs of records.
- Toasts or page banners for load errors — failures live in the region that failed.
