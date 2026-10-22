# dashboardCommandCenter — experience `personalBriefing`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

This dashboard is read, not scanned: it answers **"what does my day look like?"** as a short
written briefing — a few paragraphs of plain sentences with the key numbers inside them, the
way a good assistant would brief their manager at nine in the morning. Three movements, always
in the same order: what is mine, what changed, what is next. Where `exceptionTriage` hands over
a to-do list of trouble and `overviewBoard` lays out an instrument panel of tiles and sections,
this page turns the same contract into prose addressed to one person, so the day is understood
before anything is clicked. Target: a person opening the page once or twice a day who wants
orientation in under a minute, on any device.

## How to instantiate from the defs (the slots)

- **"What is mine" comes from queries scoped to the user**: counts and totals of the items the
  contract assigns to the requesting person (owned, assigned, awaiting them). Each becomes a
  clause in the first paragraph ("You have 7 open orders, 2 of them due today, totalling
  R$ 48,200."). The person comes from session context — never a field, never a picker.
- **"What changed" comes from dated or status-bearing data**: items whose status, date or flag
  the contract exposes as recent (since last visit, today, this period — whatever the contract
  declares). Without a recency field or input, this paragraph is omitted entirely — never
  guessed from ids or invented "since yesterday" deltas.
- **"What is next" comes from the nearest future dates**: deadlines, scheduled items, the
  contract's own ordering of upcoming work. The first two or three are named; the rest are
  counted ("and 4 more this week"). Without dates, the paragraph uses the contract's ordering
  and says "first in line", never "next".
- **Numbers live inside sentences**: each number is emphasized (weight, tabular figures, unit
  or currency as declared) and is the link to the items behind it — the number is the
  drill-down. A number with nothing behind it to open is plain emphasized text.
- **Flagged facts are phrased, not tiled**: an exception the contract flags becomes its own short
  sentence near the top of its paragraph, with its decisive value in alarm color — only that value.
- **Commands the contract declares** (acknowledge, act on an item) never sit inside the prose;
  they live at the item they act on, after drill-down, or as one quiet action closing the
  paragraph that names its outcome.

## Attention hierarchy (the spine of this experience)

1. The opening sentence — the one-line summary of the day ("A busy day: 3 things need you
   before noon."), computed from the three paragraphs below it.
2. "What is mine" — the person's own load, in numbers inside words.
3. "What changed" — the news since they last looked (when the contract can say it).
4. "What is next" — the nearest upcoming items, named.

## Loops

- Read top to bottom → tap a number → its items open → act or return → the briefing is exactly
  where it was, the sentence updated if the number changed.
- The briefing is regenerated from data on each visit or reload; its moment is stated once,
  quietly, under the opening sentence ("as of 09:12") when the contract provides freshness.

## Feedback & feedforward

- Loading: line-shaped skeletons where the sentences will be — the shape of prose, not of tiles.
- A paragraph whose query fails is replaced by one sentence in normal body color saying that part
  could not be read, with retry; the other paragraphs stay.
- Zero is stated in words, warmly and briefly ("Nothing is waiting for you."), never hidden; a
  value that failed is never written as zero.
- Grammar follows the numbers: singular and plural agree, "1 order" never "1 orders".

## Disciplines (transversal — always)

- The page name appears once, in the header; paragraphs have no headings unless the contract gives
  them business names, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: numbers in sentences navigate; actions act.
- Link color only on numbers that open something; the rest of the prose is ink, the freshness
  caption is muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields, nor do they appear in the prose.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names, query
  names) is never rendered as visible text — sentences speak in business words only.
- Never invent a number, comparison or judgement ("better than last week") the contract does not
  declare; adjectives in the opening sentence come only from counts the page already shows.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the written briefing, the three movements in their order, numbers inside
sentences as the drill-down, feedback and disciplines. Prose already fits a phone, so only the
line length and the tap targets change. Where this section and the layout described above
differ, this section wins on mobile.

- **One reading column**: the opening sentence first, slightly larger, then the three paragraphs
  in order, at a comfortable reading size with short paragraphs; never two columns of text.
- **Numbers are tap targets**: each linked number carries a tap area at least 44px high around
  it, with enough line height that two linked numbers on adjacent lines never overlap.
- **Drill-down opens the items as a view of its own** inside the page, with back returning to the
  same sentence and scroll.
- **"What is next" names at most two items** inline; the rest stay counted in words.
- **A declared action** closing a paragraph becomes one full-width control at the end of that
  paragraph, where the thumb reaches.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the opening sentence, 2. "what is mine", 3. "what changed",
4. "what is next".

Forbidden on mobile:
- turning the paragraphs into tiles, cards or a carousel;
- anything that scrolls sideways;
- truncating a sentence behind "read more" or cutting a number;
- a sticky bar of actions over the prose.

## Forbidden

- Stat tiles or a row of KPI cards as the page's shape — that is the `overviewBoard` experience,
  not this one.
- Exception lanes of rows ranked by severity as the main surface — that is the `exceptionTriage`
  experience, not this one.
- Charts, tables, filter bars or pagination on the briefing itself.
- A "what changed" paragraph without a contract field that dates or marks the change.
- Numbers outside sentences, bullet lists of label/value pairs posing as prose, or generic filler
  sentences that carry no number from the contract.
- Steps, wizards, or any act-like progression — this page is read once, top to bottom.

## Signals (how to check the generated page)

1. **S1 Prose first:** the main region renders paragraphs of sentences with numbers embedded in
   the text; no stat tiles, no KPI row, no chart.
2. **S2 Three movements in order:** the paragraphs follow mine → changed (when present) → next,
   preceded by one opening summary sentence.
3. **S3 Number is the link:** every clickable element in the prose is a number (or a named item)
   that opens the items behind it; no separate "view" buttons beside sentences.
4. **S4 Person from context:** no field or picker selects the user; the scope comes from session.

## Molecule rules

```json
{
  "axes": {
    "density": "comfortable",
    "feedback": "inline"
  },
  "groups": { "prefer": [], "forbid": ["groupViewChart", "groupViewTable", "groupViewMetric", "groupNavigateSteps"] }
}
```
