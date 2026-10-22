# globalSearchResults — experience `commandPalette`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **jump box**: the user already knows the record they want and types a few letters of it;
the page answers as they type with only the top handful of matches, the first one already
highlighted, and Enter opens it. The question is not "where does this term live?" nor "help
me explore", but "take me there, now". Where `groupedResults` maps the matches into one
section per type and `unifiedListFacets` ranks a long list and hands the user facets to
refine it, this page shows no map and no knife: one input, a few candidates, the keyboard.
Target: from focus to the opened record in a couple of keystrokes and one Enter, with the
hands never leaving the keyboard.

## How to instantiate from the defs (the slots)

- **The input is the search query's term input**, focused when the page opens, with a short
  placeholder naming what can be found (the entity types the contract returns, in business
  words). It is the only input; other query inputs never render as fields.
- **Results update as the user types**, after a short pause, from the same query; only the
  top matches render (about eight), in the contract's ranking. A count beyond them, when the
  contract provides it, is one quiet line ("23 more — refine the term"), never a page of
  results.
- **Each candidate is one line**: a small type label, the record's identity with the typed
  letters highlighted, and at most one decisive fact, muted. All lines share one anatomy.
- **The first candidate is active by default**; arrow up / down move the active line,
  Enter opens the active record, Escape clears the term (a second Escape leaves the input).
  The mouse may click a line, which does the same as Enter.
- **Recent records**, only when the contract declares such a query, fill the empty state
  under the input; otherwise the empty state is one line of keyboard hints.
- **Session/context inputs never render as fields**; ids are never typed as ids — a code
  typed as a term is just a term.

## Attention hierarchy (the spine of this experience)

1. The input with the typed term.
2. The active candidate — what Enter will open.
3. The other few candidates.
4. The keyboard hints and the "more" line, quiet.

## Loops

- Type → the candidates settle → the first is the one → Enter → the record opens. Done.
- Not first? Arrow down once or twice → Enter. Still not there? Type one more letter; the
  list narrows and the active line returns to the first.
- No match: one calm sentence naming the term, right under the input, and the input keeps
  the term for correcting.
- Coming back to the page restores focus to the input with the term selected, ready to be
  replaced.

## Feedback & feedforward

- The active line is unmistakable (a solid highlight and an Enter hint at its end): the user
  sees what Enter will do before pressing it.
- While a query runs, the previous candidates stay in place, marked as updating; the input is
  never blocked and never loses typed letters.
- Results that arrive late for an older term are discarded; the list always matches the
  current term.
- A failed query says so under the input, in normal body color, with retry on Enter.

## Disciplines (transversal — always)

- The page name appears once, in the header (or as the input's label), and **no heading
  anywhere repeats the label of a button or link near it**; candidates carry no section
  headings.
- A control is navigation OR action, never both: every candidate navigates to its record;
  nothing on this page writes.
- Keyboard first: every behavior is reachable without the mouse, and the focus is always
  visible.
- Highlight marks the typed letters where they matched, and nothing else.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the page asks only for the top matches.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: one input, the top matches only, the first one ready, open and done, and
the disciplines. A phone has no arrow keys, so the keyboard's search key takes Enter's role and
taps replace the arrows. Where this section and the layout described above differ, this section
wins on mobile.

- **The input is pinned at the top**, full width, focused on arrival with the on-screen keyboard
  open; a clear control sits inside it.
- **Candidates fill the space above the keyboard**: about five lines, each a full-width tap target
  with the type label, the identity with the match highlighted, and the one fact.
- **The keyboard's search / go key opens the first candidate**, which stays marked as the one it
  will open.
- **Back** from the opened record returns here with the term kept.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the input with the term, 2. the first candidate, 3. the other
candidates.

Forbidden on mobile:
- candidates hidden behind the on-screen keyboard;
- a filter control or type tabs added because the screen is small;
- more than a screenful of candidates, or any horizontal scroll;
- losing the term after returning from a record.

## Forbidden

- One section per entity type with "see all" links — that is `groupedResults`.
- A long ranked list with a facet rail — that is `unifiedListFacets`.
- Pagination, "load more", or more than about eight candidates at once.
- A search button that must be clicked before results appear; results only on submit.
- Actions on candidates (edit, delete, assign); this page only jumps.
- Typed ids anywhere; invented recents, counts or types the contract does not declare.

## Signals (how to check the generated page)

1. **S1 focused input:** the search input has focus when the page opens.
2. **S2 few results:** at most about eight candidates render; no pagination and no facets.
3. **S3 first active:** the first candidate is marked active, and Enter opens it.
4. **S4 arrow keys:** arrow up / down move the active candidate.

## Molecule rules

```json
{
  "axes": {
    "search": "bar",
    "recordsView": "list"
  },
  "groups": { "prefer": ["groupSearchContent"], "forbid": [] }
}
```
