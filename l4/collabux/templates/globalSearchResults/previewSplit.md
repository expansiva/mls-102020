# globalSearchResults — experience `previewSplit`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**Look before you open**: the results list on one side and, beside it, a preview of the
selected result — enough of the record to tell whether it is the one, without leaving the
search. The user moves down the list, the preview follows, and only the right record is
opened fully. The question is "is this the one?", asked of several candidates in a row.
Where `groupedResults` sends the user straight into a record from its type section, and
`unifiedListFacets` refines a ranked list until the answer surfaces, this page answers by
inspection: selecting is cheap, opening is deliberate. Target: tell similar records apart
(two customers called "Acme") in place, and open only the right one.

## How to instantiate from the defs (the slots)

- **The search input sits at the top**, holding the term, re-searchable in place; other
  query inputs never render as fields.
- **The list is the search query's results**, in the contract's ranking: each row a small
  type label, the identity with the term highlighted, and at most one decisive fact. Rows
  select; they do not open.
- **The preview binds to the selected row**: the record's identity as its heading, then the
  fields the result carries (or the record's detail query, when the contract declares one
  per type), as labeled facts in reading order, the matched fields first with the term
  highlighted. Without extra fields, the preview shows what the result carries and stays
  honest — never invented facts.
- **One "Open" control in the preview** navigates to the full record ("Open customer Acme
  Ltda"); it is the page's only way out to a record.
- **The first result is selected after each search**, so the preview is never blank while
  results exist; the selection is marked in the list.
- **Session/context inputs never render as fields; ids are never typed.**

## Attention hierarchy (the spine of this experience)

1. The preview of the selected result — is this the one?
2. The list with the selection marked — the other candidates.
3. The search input with the term.
4. The "Open" control, clear but single.

## Loops

- Search → the first result previews → read → not it → arrow down (or click the next row) →
  the preview follows → it is the one → Open.
- Compare loop: moving up and down between two similar rows swaps the preview in place, at
  the same layout, so differences show by position.
- Refine: editing the term re-runs the search and re-selects the first result; back from an
  opened record restores the term, the list scroll and the selected row.
- No matches: one calm sentence naming the term, in the list region; the preview region
  stays quiet.

## Feedback & feedforward

- Selection is instant; a preview that needs its own query shows a skeleton in the preview
  region only, while the list stays usable.
- Moving fast through rows cancels older preview loads; the preview always matches the
  marked row.
- A failed preview says so in the preview, with retry, and keeps the Open control available.
- A failed search reports in the list region with retry; the term is preserved.
- The Open label names the record it opens — feedforward for the only navigation.

## Disciplines (transversal — always)

- The page name appears once, in the header; the preview's heading is the record's
  identity, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, Open navigates; nothing on this
  page writes, and a row never navigates by itself.
- Link color only on real links (Open, and links the preview's fields carry); facts are
  muted.
- Highlight marks the term where it matched, in the list and in the preview, and nothing
  else.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the list loads more at its end.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: inspect before opening, the preview bound to one result, the single Open,
the term kept, and the disciplines. The list and the preview cannot sit side by side, so the
preview becomes a view of its own with previous and next. Where this section and the layout
described above differ, this section wins on mobile.

- **The list is the home view**: the input on top, then one row per result; tapping a row opens
  its preview, it never opens the record.
- **The preview is a view of its own** with back, inside this page: identity, then the facts one
  per line, matched fields first.
- **Previous and next** at the preview's foot move to the neighbouring results without returning
  to the list, so comparing stays one tap.
- **Open** is one clear control at the bottom, where the thumb reaches, naming the record.
- **Back** returns to the list at the same scroll, the previewed row marked.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the preview's facts, 2. the Open control, 3. previous / next and
the way back.

Forbidden on mobile:
- a row tap that opens the record directly, skipping the preview;
- a sheet or drawer over part of the list for the preview;
- swipe as the only way to move between previews;
- any horizontal scroll, or losing the term after back.

## Forbidden

- Sections per entity type with "see all" links — that is `groupedResults`.
- A facet rail and refinement tokens as the page's main tool — that is `unifiedListFacets`.
- Rows that navigate on click; more than one way out to the record.
- A blank preview while results exist; an auto-opened record.
- Actions on rows or in the preview (edit, delete, assign); this page only inspects and
  opens.
- Typed ids anywhere; invented preview facts the contract does not provide.

## Signals (how to check the generated page)

1. **S1 side by side:** the results list and a preview region render together on desktop.
2. **S2 select, not open:** clicking a row changes the preview and does not navigate.
3. **S3 first previewed:** after a search with results, the first row is selected and
   previewed.
4. **S4 single Open:** the preview has exactly one control that opens the full record, its
   label naming the record.
