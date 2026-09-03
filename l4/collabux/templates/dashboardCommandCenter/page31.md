# dashboardCommandCenter — experience `overviewBoard` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, flags — never contradict it); this skill is the flavor: how
> the page prioritizes, moves and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This dashboard answers **"how is the operation doing?"** — the whole picture, scannable in
ten seconds, with a consistent path to go deeper anywhere. Where `exceptionTriage` is a
to-do list, this is an instrument panel: a row of key numbers on top, then one calm,
uniform section per subject. Trouble is visible — flagged inside the data where it lives —
but it does not reorganize the page; the layout is stable from visit to visit, and that
stability is the point: the user learns WHERE things are and reads the board by position.

## How to instantiate from the defs (the slots)

- **The stat row comes from aggregate values**: each meaningful total/count in the
  contract becomes one stat tile — value large and tabular, label small below, optional
  comparison only if the contract provides it. **Four to six tiles, one row, all the same
  size.** Fewer real numbers than four? Render fewer — never pad with invented metrics.
- **One section per query, uniform anatomy**: section title (business words) → compact
  content → one "see all" link, right-aligned. Content is the top handful of rows that
  matter (nearest deadline, largest value — the contract's own ordering), never the full
  collection; depth lives behind "see all".
- **Flags color the data, not the page**: an over-budget project shows its variance in
  alarm color inside its row; an overdue task gets a small status chip. The section stays
  neutral around it.
- **Row = drill-down link**, same interactive pattern across every section.
- **Section order comes from decision value**: money/risk first, work in progress second,
  reference lists last. When the defs declares an information hierarchy, follow it.

## Attention hierarchy (the spine of this experience)

1. Stat row — the vital signs, one glance.
2. First section — the subject with the highest decision value.
3. Remaining sections, in declared order, visually equal to each other.
4. "See all" links as the consistent exit to depth.

## Loops

- Scan tiles → notice a number that looks off → the nearby section has the detail → drill
  down through a row → come back; the board is exactly where it was.
- Global filters (a period selector) appear ONLY if the contract declares such inputs, in
  one place at the top right — never per-section filter bars.

## States

- Loading: tiles skeleton first, sections after — the board's shape is visible before its
  numbers.
- A section that fails reports inside its own frame with retry; tiles and other sections
  stay. A failed tile shows an em dash, never a fake zero — a dash is unknown, zero is a
  claim.
- An empty section says what will appear there, once, quietly — the section does not
  disappear (position stability beats space saving).

## Disciplines (transversal — always)

- The page name appears once. Section titles never repeat the page title, and **no heading
  anywhere repeats the label of a button or link near it** ("Projetos" as section title +
  "Ver todos os projetos" as link, never twice the same words).
- One consistent interactive pattern for rows and links; muted text for everything
  passive; link color on nothing that is not clickable.
- Numbers align right with tabular figures; every value carries its unit or currency as
  the contract declares it — a bare number is a guess.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- An exception queue or triage headline hijacking the top — that is the `exceptionTriage`
  experience, not this one.
- Tiles of different sizes, a second row of tiles, or a tile whose number is not in the
  contract.
- Charts without data to back them (no decorative sparklines), and any chart before the
  stat row.
- Full tables with pagination/filter bars embedded in sections — depth is behind "see all".
- Layout that reshuffles by data (sections must not move or resize because of content).
- Steps, wizards, or any act-like progression — this page has no sequence.
