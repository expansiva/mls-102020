# assetManagement — experience `maintenanceBoard` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This page exists so no asset sits idle unnoticed: **what needs work owns the screen,
ranked by urgency, readable from across the room**. It is an operations wall, not a
catalog. Assets that are overdue, due soon or currently down render as large-state cards
grouped by urgency; assets that are fine barely appear. Where `assetRegistry` documents
every asset equally and lets the user look things up, this experience pre-decides what
matters and puts it first — the user's job is to act, not to search.

## How to instantiate from the defs (the slots)

- **Urgency lanes come from flagged data**: whatever the contract marks as trouble — an
  overdue date, a down/maintenance state, a threshold breach — decides the lane. Worst
  lane first ("Parados", "Vencidos", "Vencem em breve"), worst asset first inside each.
  Lane titles say the problem in business words, never the query name.
- **Each card carries what an operator needs at a distance**: the asset's identity, its
  operational state written large and in words ("PARADO", "Vence em 3 dias" — as the
  contract's data phrases it), the decisive fact (the date or reading that put it here),
  and the one action the contract commands for this situation ("Iniciar manutenção",
  "Registrar retorno"). Nothing else competes.
- **Operational state is legible before reading**: state text is the card's loudest
  element; alarm color goes ONLY on the states the contract flags as critical — a wall
  that is all alarm ranks nothing.
- **The healthy remainder** renders after the lanes as one quiet line or collapsed count
  ("42 ativos operando normalmente") with a link to wherever the contract lets the full
  registry live — never a table on this page.
- **Actions commit through the contract's commands**, in a compact panel on the card when
  inputs are needed: references are pickers, **ids never typed**, session/context values
  (who is acting) never editable — caption at most.

## Attention hierarchy (the spine of this experience)

1. The headline count — one sentence: how many assets need action now.
2. The worst lane, worst card first.
3. Remaining lanes in descending urgency.
4. The healthy remainder, demoted to a quiet line.

## Loops

- Scan lanes → pick the worst card → act on it (start maintenance, record return) → the
  card resolves out of its lane or moves to a calmer one → the board shrinks. The board's
  success is its own emptying.
- On return/reload the board re-ranks from fresh data; each lane shows its freshness
  quietly when the contract provides it — never a live spinning ticker.

## The good-news state

When no lane has cards, say it calmly and proudly — one sentence ("Nenhum ativo precisa de
atenção agora"), the healthy count still visible below. Design this state; never let it
fall into a generic empty illustration, never hide the page.

## Feedback & feedforward

- An action in flight locks only its card; the rest of the wall stays live.
- Failure reports inside the card that failed, normal body color, with retry — the card
  never disappears on failure. Action buttons are disabled until any required inputs are
  set, labels naming the outcome.
- Success is local and visible: the card's state text changes in place, then the card
  settles into its new lane or resolves out — movement the operator can follow, never a
  silent vanish. No page banners, no redirect.
- Loading: lane skeletons in place, headline last — never a flash of "all clear" before
  data arrives.

## Disciplines (transversal — always)

- The page title appears once, in the header; lane titles never repeat it, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the card's action button acts; if a card
  links to the asset's full record, that is one distinct link, separate from the action.
- Link color only on what is clickable; the healthy remainder, freshness notes and
  captions are muted.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A neutral searchable list of all assets with a full dossier pane as the page's spine —
  that is the `assetRegistry` experience, not this one; here urgency organizes everything.
- Lanes sorted by anything but urgency/severity; healthy assets given equal stage.
- A card without a way to act; alarm color as decoration on lanes, headers or backgrounds.
- Full data tables, filter walls or pagination on the first screen.
- Inventing urgency thresholds, health scores or due dates the contract does not declare.
- Typed ids anywhere; editable session/context values.
- Steps, wizards or any act-like progression — a wall has no sequence.
