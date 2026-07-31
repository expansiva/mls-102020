# customerManagement — experience `relationshipHub` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

One customer at a time, as a hub: a **highlight band across the top** answers "who is
this, what are they worth, where do they stand" in one glance, and the body of the page
is the relationship itself — contacts, activities, deals, whatever collections the
contract relates, laid out as the main content, not as an appendix. Where
`directoryProfile` splits the stage with a finder, here the customer OWNS the page and
moving to another customer is a secondary, quiet affair. Target: walk into a meeting
knowing this customer after ten seconds on this page.

## How to instantiate from the defs (the slots)

- **The highlight band comes from the customer's own fields**: name largest, then the
  few decisive facts the contract exposes — status, commercial value or totals, key
  document — as short value+label pairs across the band. Only contract facts; fewer real
  facts means a shorter band, never padded.
- **Switching customers is one quiet picker** in the header area (a search-select fed by
  the collection query) — present, findable, and visually subordinate to the band. It is
  the only list of other customers on the page.
- **Each related collection becomes a section of the body**, uniform anatomy: title in
  business words → the most recent or most relevant handful of entries (the contract's
  ordering) → one "see all" link when there is more. Contacts show person + role +
  reachable detail; activities show what + when, reverse-chronological.
- **Adding to a relationship happens in place**: when the contract provides commands to
  add a contact or record an activity, each section offers its own quiet add action
  opening a small form within the section — never a trip to another page.
- **Editing the customer's own record** is an explicit switch on the band; deactivation
  is a subdued action behind it, confirmed by name.
- Session/context inputs never render as fields; ids are never typed — the picker and
  sections carry them. Never invent health scores, sentiment or revenue the contract
  does not declare.

## Attention hierarchy (the spine of this experience)

1. The highlight band — who, worth, standing.
2. The first relationship section — the one with the highest decision value (money or
   most recent movement first, when the defs declares an order).
3. Remaining sections, visually equal to each other.
4. The customer picker and lifecycle actions — quiet frame.

## Loops

- Read the band → scan sections for what changed → add the new activity or contact in
  its section → the entry appears at the top of that section. The band's facts update
  when a command changes them.
- Switching customers repaints band and sections in place; the page's layout never
  changes shape between customers — the user learns WHERE things live.

## Feedback & feedforward

- Section forms validate at the field, in words, at commit time — never a toast.
- A failed command reports inside its own section, above its button, normal body color,
  with retry; the band and other sections stay live.
- Every commit button stays disabled until valid; its label names the outcome ("Add
  contact", "Record activity").
- Success is local: the new entry appearing in its section IS the confirmation. No
  page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once; section titles never repeat it, and **no heading anywhere
  repeats the label of a button or link near it**.
- A control is navigation OR action, never both: "see all" navigates, add actions act,
  the picker selects.
- Link color only on real links; band facts are data, never link-colored; passive
  captions muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A persistent directory list sharing the stage with the profile — that is the
  `directoryProfile` experience, not this one.
- Burying the highlight band under a toolbar, banner or chart; the band is first.
- Sections as tabs hiding each other; the relationship reads by scrolling one page.
- A full customer table anywhere on this page; other customers exist only in the picker.
- Typed ids for anything the defs marks as selection/session/context.
- Invented KPIs in the band, fake "last touch" dates, or placeholder activities — an
  empty section says once, quietly, what will appear there.
