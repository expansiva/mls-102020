# supplierManagement — experience `onboardingPipeline` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The supplier base as a pipeline: suppliers grouped by **habilitation stage** — new, under
review, approved, blocked — side by side, each stage a column of cards. The page exists
to MOVE suppliers forward: its central question is "who is stuck, and what unblocks
them". Documentation pendencies are visible on the card itself, because a pendency is
what holds a supplier in place. Where `directoryCompliance` examines one supplier deeply
at a desk, this page reads the whole population's flow at a glance and acts on the
laggards. Target: spot every supplier waiting on something and push the ready ones
forward without opening a detail page.

## How to instantiate from the defs (the slots)

- **Stages come from the contract's standing values**: one column per stage the data
  distinguishes, in process order (new → under review → approved, blocked apart as the
  terminal exception). Never invent intermediate stages the contract does not encode.
- **Each supplier is a card in its stage's column**: name, how long it has been in this
  stage when the data carries a date, and its **pendencies** — the missing or unverified
  facts the contract exposes (absent tax id, missing document) as short muted flags on
  the card. A card with no pendencies is visibly ready to advance.
- **Advancing is the card's one action**: the transition command the contract provides
  (approve, send to review, block), rendered on the card or on its opened summary,
  labeled with the destination outcome ("Approve supplier"). Each transition asks one
  plain confirmation naming the supplier; a reason input appears only when the contract
  declares one.
- **A card opens a compact summary in place** (an overlay over the board) for the facts
  needed to decide — fiscal identity, terms — read-only here; deep record editing is not
  this page's job and appears only as a link when the contract declares a route.
- **New suppliers enter the pipeline** via one "New" action opening the create command's
  inputs; the new card lands in the first stage.
- Session/context inputs never render as fields; ids are never typed — the card IS the
  supplier. Never invent pendencies, SLAs or stage durations the contract does not carry.

## Attention hierarchy (the spine of this experience)

1. The column counts — where the population sits, one glance.
2. The stuck cards — oldest in stage first within each column, pendencies visible.
3. The advance actions on ready cards.
4. "New" and the board's frame — quiet.

## Loops

- Scan columns → open a card with no pendencies → confirm the transition → the card
  slides to its new column, both counts update → next card. The board's health is
  visible as its shape.
- Cards with pendencies are not dead ends: the pendency flags say exactly what is
  missing, so the operator knows what to chase before returning.

## Feedback & feedforward

- A transition button is disabled when the contract says the move is not available; its
  label always names the destination outcome, never a bare arrow.
- A failed transition reports on the card (or its open summary), normal body color, with
  retry; the card stays in its true column — the board never shows a move that did not
  happen.
- Create form validates at the field, in words, at commit time — never a toast.
- Success is local: the card's movement IS the confirmation. No page-level banners, no
  redirects.

## Disciplines (transversal — always)

- The page name appears once; column titles are stage names, never the page title, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: cards open their summary, transition
  buttons act, an external record link (if any) only navigates.
- Link color only on real links; alarm color only on the blocked column's standing and
  true pendency flags — never on whole columns or card backgrounds.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A directory list with a deep fiscal panel and approve/block worked one at a time at a
  desk — that is the `directoryCompliance` experience, not this one.
- Editing supplier record fields on the board or in the summary overlay.
- Free-form drag between arbitrary columns when the contract only provides specific
  transitions; every move is a named command with a confirmation.
- Columns for stages the data cannot express, or invented "aging" timers.
- Typed ids for anything the defs marks as selection/session/context.
- Hiding empty columns; an empty stage shows once, quietly, what will appear there —
  position stability beats space saving.
