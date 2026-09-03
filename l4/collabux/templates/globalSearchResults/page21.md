# globalSearchResults — experience `groupedResults` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, result types — never contradict it); this skill is the
> flavor: how the page prioritizes, moves and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The user typed a term and wants to know **where it lives**: "acme" might be a customer,
three orders and a contract. This page answers by SLICING: one section per entity type,
each showing its best few matches with the term highlighted, each with its own way to see
more. The type sections are the map; one click on any row opens the record and the search
is over. Where `unifiedListFacets` ranks everything in one list and refines by facets,
this page organizes by KIND first — the user picks the drawer, then the item.

## How to instantiate from the defs (the slots)

- **The search input sits at the top**, holding the current term, re-searchable in
  place. It is the page's only input; searching replaces the results below it, never
  navigates away.
- **One section per entity type the contract returns**: the type's business name as the
  section title ("Clientes", "Pedidos"), with the group's match count beside it when the
  contract provides one. A type with no matches renders NO section — absence is
  information; never an empty drawer.
- **Each section shows its top handful of rows** as the contract ranks them. A row is
  identity first, then the matched fragment with the search term highlighted, then at
  most one or two decisive facts (status, date) — only fields the contract declares.
- **The whole row is a link** to the record — the single interactive pattern of the
  page. Rows carry no other actions.
- **Each section closes with one "see all" link** ("Ver todos os 12 pedidos"), present
  only when there are more matches than shown, leading to the full result for that type.
- **Section order follows the contract's ranking** when declared; otherwise, strongest
  group first. Never alphabetical for its own sake — relevance orders the drawers too.

## Attention hierarchy (the spine of this experience)

1. The search input with the current term — what was asked.
2. The strongest section — the most likely home of the answer.
3. The remaining sections, visually equal to each other.
4. "See all" links as the consistent exit to depth.

## Loops

- Search → scan section titles (the map) → scan the likely section's rows → click →
  gone. The page succeeds when it is abandoned in seconds.
- Wrong slice? The next section is one glance below — no controls to operate between
  slices.
- No matches anywhere: one calm sentence naming the term ("Nada encontrado para
  'acme'") and, when the contract offers them, the declared alternatives — never
  invented suggestions.

## Feedback & feedforward

- While searching, the sections skeleton in place; the input stays usable.
- A type whose query fails reports inside its own section, in normal body color, with
  retry — the other sections stay.
- Highlighting marks the term wherever it matched, and nothing else — highlight is a
  finding, not decoration.
- No write actions exist here, so no confirmations, no toasts: the page's only feedback
  is honest results.

## Disciplines (transversal — always)

- The page name appears once. Section titles never repeat the page title, and **no
  heading anywhere repeats the label of a button or link near it** (section "Pedidos" +
  link "Ver todos os pedidos" — the title stays a bare noun, the link carries the verb).
- A control is navigation OR action, never both; on this page everything interactive
  navigates, and nothing submits.
- Rows and "see all" links are ONE consistent interactive pattern; passive text is
  muted, and link color appears on nothing that is not clickable.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A facet rail, refinement filters, or one single blended list mixing all types — that
  is the `unifiedListFacets` experience, not this one.
- Empty sections for types with no matches, or sections padded to look balanced.
- Actions on rows (edit, delete, assign) — this page finds records; it never operates
  on them.
- Pagination inside a section — depth lives behind "see all", nowhere else.
- Highlighting terms in fields that did not match, or invented match counts.
- Typed ids anywhere; the search input takes words, and rows resolve the rest.
