# globalSearchResults — experience `unifiedListFacets` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, result types — never contradict it); this skill is the
> flavor: how the page prioritizes, moves and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Exploratory search: the user does not yet know what they are looking for — they know a
term and will recognize the answer when they see it. This page gives them **one list,
ranked purely by relevance across all entity types**, and a rail of facets to carve it
down: type, date, status. The loop is progressive refinement — search, scan, narrow,
scan again — until the answer surfaces. Where `groupedResults` slices by kind first and
shows a map of drawers, this page trusts the ranking and hands the user the knife.

## How to instantiate from the defs (the slots)

- **The search input sits at the top**, holding the current term, re-searchable in
  place; searching resets the list and clears nothing the user did not ask to clear
  (applied facets survive a re-search when the contract allows it).
- **One list, ranked by the contract's relevance**, all types interleaved. Each row:
  a small type chip first (so kind is scannable inside the mix), then identity, then
  the matched fragment with the term highlighted, then at most one or two decisive
  facts. The whole row is a link to the record — the page's single interactive pattern.
- **The facet rail comes from the contract's filterable fields** — type, date range,
  status — and ONLY from them: a facet the contract cannot filter by must not exist.
  Each facet value shows its count when the contract provides one; counts are data,
  never estimated.
- **Applied facets are always visible** above the list as removable tokens, each
  removable one by one, plus one "clear all" when more than one is applied. The rail
  and the tokens are two views of the same state — never in disagreement.
- **Session/context inputs never render as facets or fields; ids are never typed.**

## Attention hierarchy (the spine of this experience)

1. The search input with the current term.
2. Applied-facet tokens — what the list currently means.
3. The top of the ranked list — the best candidates.
4. The facet rail — present, quiet, ready to narrow.

## Loops

- Search → scan the top rows → too broad → apply one facet → the list re-ranks under
  the same term → scan again → click through. Each refinement is one interaction and
  the list answers immediately.
- Backing out is as easy as narrowing: remove one token, the list widens; the rail
  never forces starting over.
- Refined to zero: one calm sentence stating the term AND the applied facets, with the
  most direct exit — removing the last facet — offered right there. Never a dead end.

## Feedback & feedforward

- While the list refreshes (search or facet change), the LIST region shows its working
  state; the rail, tokens and input stay usable — refinement never locks the page.
- If the search fails, the failure renders in the list region, in normal body color,
  with retry; the term and applied facets are preserved exactly.
- Facet counts update with the result set; a facet whose count is zero renders muted
  and inert, never hidden (the shape of the rail is how the user learns the data).
- Highlighting marks the matched term wherever it matched, and nothing else.

## Disciplines (transversal — always)

- The page name appears once. Facet group titles never repeat the page title, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows navigate; facets and tokens
  filter (state, not navigation); nothing submits.
- One consistent interactive pattern for rows; link color appears on nothing that is
  not clickable — facet values and chips are controls, not links, and are not blue.
- Result counts and facet counts come from the contract — a number on this page is
  never computed by wishful thinking.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Sections grouped by entity type with per-group "see all" links — that is the
  `groupedResults` experience, not this one; here the types meet inside one ranking.
- Facets the contract cannot filter by, invented counts, or facet values not present
  in the data.
- Actions on rows (edit, delete, assign) — this page finds records; it never operates
  on them.
- A facet that navigates to another page, or applying a facet wiping the search term.
- Hiding the rail when results are few, or reordering facet groups by result shape —
  the rail's stability is how it stays learnable.
- Typed ids anywhere; the search input takes words, and rows resolve the rest.
