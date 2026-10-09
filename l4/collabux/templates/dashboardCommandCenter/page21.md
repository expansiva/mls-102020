# dashboardCommandCenter — experience `exceptionTriage` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, fields, flags — never contradict it); this skill is the flavor: how
> the page prioritizes, moves and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This dashboard answers ONE question first: **"what needs me right now?"** It is a triage
surface, not a gallery of numbers. Exceptions — whatever the contract flags as wrong or
late — own the top of the page as an actionable list; aggregate health is a quiet strip;
everything that is merely browsable is demoted to the bottom or behind a link. A manager
opening this page decides their next action in ten seconds without scrolling.

## How to instantiate from the defs (the slots)

- **Exception lanes come from flagged data**: any query whose items carry an
  alert/violation semantic (a boolean flag, an overdue date, a threshold breach) becomes a
  lane of actionable rows. One lane per kind of trouble, worst first. The lane title says
  the problem in business words ("Projetos acima do orçamento"), never the query name.
- **Each exception row carries exactly three things**: identity (name), the decisive fact
  (the number/date that makes it an exception, right-aligned, tabular), and one way to act
  — the whole row is a drill-down link to where the problem is handled. A row that offers
  no way to act does not belong in a lane.
- **The headline is the triage count**: a single sentence above the lanes — "3 things need
  attention" — computed from the lanes. It is text, not a tile.
- **Aggregate queries become the health strip**: one compact line of small
  value+label pairs (counts, totals) BELOW the lanes. Small, monochrome, no cards, no
  charts. The strip is context, not the show.
- **Browse-everything queries** (full lists without flags) become a single quiet link or a
  collapsed section at the bottom ("Ver todos os projetos") — never a table on the first
  screen.

## Attention hierarchy (the spine of this experience)

1. Triage headline (how much trouble, one sentence).
2. Exception lanes, worst kind first, worst item first inside each.
3. Health strip (quiet aggregates).
4. Everything else, demoted.

## Loops

- Scan lanes → open an item (row = drill-down) → handle it elsewhere → come back to a
  shorter lane. The page's success is its own shrinking.
- The data refreshes on return/reload; each lane shows its freshness quietly ("há 5 min")
  when the contract provides it — never a spinning live ticker.

## The good-news state

When no lane has items, the page says so calmly and proudly — one sentence ("Nada precisa
de atenção agora"), the health strip still visible below. This state is a feature: design
it, don't let it fall into a generic empty state. Never hide the page or auto-redirect.

## Feedback & feedforward

- Loading: skeleton lanes in place, strip last.
- A lane that fails to load reports inside its own region with retry — other lanes stay.
- Alarm color belongs ONLY to the decisive fact of true exceptions; the page frame,
  headline and strip stay neutral. A page that is all red ranks nothing.

## Disciplines (transversal — always)

- The page name appears once, in the header. A lane title never repeats the page title,
  and **no heading anywhere repeats the label of a button or link near it**.
- Rows are links and must look like ONE consistent interactive pattern; passive text is
  muted, and link color appears on nothing that is not clickable.
- A control is navigation OR action, never both; on this page rows navigate, and nothing
  submits.

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
Everything above holds: the concept, the hierarchy, the loops, the good-news state, feedback and
disciplines. On a phone the triage matters even more: the person decides between two other tasks.
Where this section and the layout described above differ, this section wins on mobile.

- **One column, in triage order**: the triage headline first, then the lanes stacked worst kind
  first, worst item first; the health strip after the lanes; the browse links last.
- **A lane shows only its first few rows** (the worst ones) and one "see all N" control that
  expands it in place; never a lane that pushes the next one off several screens.
- **Each exception row** stays identity + decisive fact + drill-down, laid out on one or two
  lines: the identity on the left, the decisive fact right-aligned and readable. The whole row is
  the tap target.
- **The health strip wraps** into rows of small value+label pairs; still small, still below the
  lanes, still no cards or charts.
- **The good-news state** is the same calm sentence at the top, with the strip below.
- **Touch**: every row and control is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the triage headline, 2. the worst lane, 3. the other lanes,
4. the health strip.

Forbidden on mobile:
- a grid of tiles, a carousel, or anything that scrolls sideways;
- the health strip or any aggregate above the lanes;
- truncating the decisive fact to fit the identity.

## Forbidden

- KPI tiles or charts occupying the top — that is the `overviewBoard` experience, not
  this one.
- An exception row without a drill-down, or a lane sorted by anything but severity/urgency.
- Full data tables, filter bars or pagination on the first screen.
- Red as decoration: alarm color on headers, strips, borders or backgrounds.
- Steps, wizards, or any act-like progression — this page has no sequence.
- Burying the triage headline below a hero, banner or illustration.
