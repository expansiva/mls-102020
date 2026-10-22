# auditTrail — experience `activityDigest`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **digest before the details**: the period's activity summarized as counts — by day, by
actor, by kind of action — so the shape of what happened is seen first, and the unusual
shows itself as the tallest bar or the fullest cell. Only then does the user drill into one
slice and read its events. The question is "how much happened, where, and what stands
out?". Where `chronologicalLog` reads events one by one from the newest, and
`entityHistoryLens` tells one record's story, this page never starts with an event: it starts
with numbers and earns the reading. Target: in one screen, see the period's shape and the
spike, and reach the events behind it in one click.

## How to instantiate from the defs (the slots)

- **Counts come from the contract**: a summary/aggregate query when one is declared (by day,
  actor, action), used as is. Without one, counts are computed from the event query's
  results for the chosen period, and the digest says so ("from the 480 events loaded"); when
  the result is truncated, the digest states the limit and never extrapolates.
- **The period is the one input up front**: the contract's date-range filter, preset to a
  short recent range. Session/context inputs never render as fields.
- **Three summaries, same anatomy**: events per day (a simple bar per day, the count as
  text on each), events per actor and events per kind of action (ranked lists with a count
  and a proportional bar). Only dimensions the event carries; a missing dimension's summary
  is absent, not empty.
- **Spikes are only what the numbers show**: the tallest day bar and the top rows of each
  ranking are visibly larger by proportion alone. No "anomaly" label, no threshold, no
  alarm color unless the contract flags something as critical.
- **Every count is a drill-down**: choosing a day, an actor or an action narrows the digest
  to it (shown as a removable token) and opens the slice's events below — one row each,
  when, who, what in business words, newest first; a row expands to its full fields.
- **Export**, when declared, acts on the current slice and says so on its label.

## Attention hierarchy (the spine of this experience)

1. The period and the active slice tokens — what is being summarized.
2. The per-day bars — the shape of the period and its spike.
3. The per-actor and per-action rankings.
4. The slice's events, read after the numbers.

## Loops

- Look at the shape → choose the tall day → the rankings re-count for that day → choose the
  top actor → the events list shows that actor's events on that day → read, expand one →
  remove a token to widen again.
- Tokens combine (day + actor + action) and are removable one by one; the digest and the
  events always agree with the tokens.
- Changing the period recomputes every summary and clears no token that still applies.

## Feedback & feedforward

- Summaries load as skeleton bars with their shapes; the period control is usable first.
- A period with no events says so in words naming the period; summaries do not render empty
  axes.
- A failed summary reports inside its own block with retry; the other blocks stay.
- Every count is readable as a number; bars never stand alone without their figure.
- Drill-down feedforward: each count is a focusable control whose accessible label says
  what it opens ("Show 34 events by Maria"), without relying on hover.

## Disciplines (transversal — always)

- The page title appears once, in the header; summary blocks are titled by their dimension
  ("By day", "By person", "By action"), and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: counts and tokens narrow, event rows
  expand, export exports.
- Counts are data from the contract or from the loaded events, never estimated; the source
  of a computed count is stated once.
- The page is read-only: no control edits, deletes or replays events.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the events list pages by itself.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: numbers before events, three summaries, spikes by proportion only, every
count a drill-down, tokens and the read-only stance. The summaries stack, and the day bars turn
sideways so they never need horizontal space. Where this section and the layout described above
differ, this section wins on mobile.

- **Period and tokens on top**: the period as one control, the active tokens wrapping under it.
- **By day becomes a list of horizontal bars**, one row per day with its date and count, newest
  first — never a vertical chart that scrolls sideways.
- **By person and by action follow**, each showing its top rows and one "show all" control.
- **Drilling opens the slice's events as a view of its own**, with back returning to the digest at
  the same place and the tokens kept; rows wrap to two lines, expanding in place.
- **Export**, when declared, is quiet at the foot of the events view.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the period and tokens, 2. the per-day bars, 3. the rankings, 4. the
slice's events, in their view.

Forbidden on mobile:
- a vertical day chart wider than the screen, or any horizontal scroll;
- the events list before the summaries on the home view;
- bars without their numbers;
- losing the tokens after returning from the events view.

## Forbidden

- Opening on the raw event stream, newest first — that is `chronologicalLog`; here the
  events come only after a slice is chosen.
- Anchoring on one record's history — that is `entityHistoryLens`.
- Anomaly labels, thresholds, trends or forecasts the contract does not declare.
- Pie charts, gauges or decorative charts; bars without figures.
- Any control that edits, deletes or replays events; typed ids in tokens.
- Counts presented as totals when they come from a truncated load.

## Signals (how to check the generated page)

1. **S1 numbers first:** the first content under the period is a count summary, not an event
   list.
2. **S2 per-day bars:** a per-day summary shows one bar per day with its count as text.
3. **S3 drill-down:** choosing a count adds a removable token and shows the matching events.
4. **S4 grouped counts:** at least one ranking of counts by another dimension (actor or action)
   sits beside or under the day summary.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "expand": "collapsible",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupViewChart", "groupEnterDateInterval", "groupExpandContent"],
    "forbid": []
  }
}
```
