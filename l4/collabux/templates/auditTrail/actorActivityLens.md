# auditTrail — experience `actorActivityLens`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

This page answers one question, asked about one person: **"what did this person do?"**. The
user first picks an actor (or arrives carrying one); the page then reads that person's
actions over time as a work diary — day by day, each entry saying what was done and to which
record. Where `chronologicalLog` streams everyone's events with the actor as one filter among
others, and `entityHistoryLens` tells the biography of one record, this lens follows one
pair of hands across every record they touched. Nobody else appears on stage. Target: the
reviewer can say, in a minute, what this person did in a period, and open any single action
to see it in full.

## How to instantiate from the defs (the slots)

- **The subject is the actor**, picked from the users/actors the contract exposes through the
  event query's actor input — one generous search-select, nothing else competing. If the
  actor arrives from context, skip straight to the diary. **The id is never typed**; the
  picker shows names. Without an actor input in the contract, this experience cannot apply:
  render the event query honestly with the actor shown on each row, and nothing more.
- **The subject header** states who is under the lens: name and the few identifying fields
  the contract provides (role, team). It appears once, stays as one compact line while the
  diary scrolls, and offers one control to change the person.
- **The diary is the event query with the actor fixed**: entries grouped under day headings,
  newest day first; within a day, newest first. Each entry: time, the action in business
  words, the record touched (its display name; a real link only when the contract gives
  one). The actor is never repeated on entries — it is the subject.
- **Opening an entry expands it in place**: every field the contract provides, changed
  values as before/after pairs when carried, raw payload last and collapsed.
- **Period and kind of action**, when the contract declares those filters, are small choices
  above the diary; the period choice is stated in words in the subject header ("Last 7
  days").
- **Session/context inputs never render as fields**; this page reads and never writes.

## Attention hierarchy (the spine of this experience)

1. Who is under the lens — the subject header.
2. The most recent day's actions.
3. The earlier days, each under its heading.
4. The period and action choices, and the subject switcher.

## Loops

- Pick a person → read today, then yesterday → open one action that matters → collapse →
  keep reading. More days load at the bottom ("Show earlier days").
- Change the subject swaps the whole diary; the period and action choices persist, so two
  people can be read the same way one after another.
- A day heading carries the number of entries loaded for that day, as a quiet caption, so a
  heavy day is seen before it is read.

## Feedback & feedforward

- Loading: the subject header resolves first, then skeleton days in place.
- A person with no actions in the period says so in words about the person and the period
  ("No actions by Maria in the last 7 days") — never invented entries.
- A failed diary query reports inside the diary region, normal body color, with retry; the
  subject header stays.
- Alarm color only where the contract flags an event as critical; the diary is otherwise
  calm.

## Disciplines (transversal — always)

- The page title appears once, in the header; the subject header names the person, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the subject switcher changes the person,
  entries expand, record links navigate — no entry does two of these.
- Link color only on what is clickable; times, day captions and old values are muted.
- Strict chronology inside the diary; days never reorder by volume.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the diary loads earlier days on demand.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the person first, the diary by day, the record named on each entry,
expansion in place, the read-only stance and the disciplines. A phone fits the diary's single
column; only the header and the expanded details compress. Where this section and the layout
described above differ, this section wins on mobile.

- **The person comes first**: without one from context, the opening state is one full-width
  search-select and nothing else.
- **The pinned header is one compact line**: the person's name and the change control; the
  identifying fields show once, at the top.
- **Day headings stay visible while their day scrolls**, carrying the date and the entry count.
- **Each entry takes two lines**: time and action, then the record touched; the whole entry is the
  tap target that expands it. A record link inside the expansion is a separate control.
- **Expanded before/after stacks**, old above new, raw payload collapsed and wrapping.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. who is under the lens, 2. the latest day's actions, 3. the earlier
days.

Forbidden on mobile:
- several people's actions mixed in one diary;
- before/after in side-by-side columns, or any horizontal scroll;
- the full subject header pinned over the diary;
- any edit, revert or replay control.

## Forbidden

- A stream of everyone's events with the actor as one filter among many — that is
  `chronologicalLog`; here nothing renders before a person is chosen.
- Anchoring on one record and its before/after biography — that is `entityHistoryLens`.
- Repeating the actor's name on every entry.
- Rankings of people, productivity scores or comparisons between actors.
- Any control that edits, reverts or replays events; typed ids to choose the person.
- Inventing severity, categories or summaries the contract does not declare.

## Signals (how to check the generated page)

1. **S1 actor first:** with no actor from context, the first state is a person picker and no
   events render.
2. **S2 subject header:** once chosen, the person's name heads the page with a control to
   change it.
3. **S3 diary by day:** entries are grouped under day headings, newest first, and no entry
   shows the actor's name.
4. **S4 record per entry:** each entry names the record that was touched.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "timeline",
    "expand": "collapsible",
    "listOverflow": "load-more",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupSelectOne", "groupViewData", "groupExpandContent"],
    "forbid": []
  }
}
```
