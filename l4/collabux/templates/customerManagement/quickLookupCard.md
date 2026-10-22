# customerManagement — experience `quickLookupCard`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A lookup desk for someone with a caller on the line: the page opens as **one large search
field and nothing else**, and a match becomes **one customer card** — identity, the contact
facts as tappable actions, and the few facts that answer "who am I talking to". There is no
directory to browse: without a query the page shows no customers at all. Where
`directoryProfile` keeps a finder and a list sharing the stage with a profile, and
`relationshipHub` lets one customer own the page with the whole relationship as its body,
here the question is narrower and faster: **"is this the customer, and how do I reach or
help them right now?"** The card is deliberately short; depth is one link away, not on the
page. Target: from a name, document or phone spoken aloud to the right card in one breath.

## How to instantiate from the defs (the slots)

- **The search field comes from the collection query's declared search input** — the only
  input on the opening screen, focused on load, large, with a hint naming what it accepts
  (the business words of the fields the contract searches by). Other filters the contract
  declares stay behind one quiet "refine" control; they never sit beside the field.
- **Matches are a short candidate strip, not a list to browse**: at most a handful of rows
  (the first page of the query), name loudest plus one disambiguating fact (document, city,
  status — whatever the contract exposes). One match opens its card directly; several ask
  for a pick; more than a handful says "keep typing" and shows no further pages.
- **The card is the selected customer's own fields**, in this order when present: name and
  status, the identifying document, then contact facts (phone, email, address) each as a real
  action — call, write, copy — then at most three short commercial facts (terms, segment,
  owner). Fewer real facts means a shorter card, never padded.
- **Card actions come from the commands**: the most frequent on a call (record a note or
  contact, correct a contact fact) render as buttons on the card opening a small form
  inside it; the update command opens prefilled. Deactivation, if declared, sits at the
  card's foot, quiet, confirmed by name.
- **Related history, when the contract relates one**, shows only the latest two or three
  entries under the card, with one link to the full history; absent, the card simply ends.
- **Creation is the empty result's way out**: "no customer matches" offers the create
  command, prefilled with what was typed into the matching field when it is a name.
- Session/context inputs never render as fields; ids are never typed — the pick IS the id.

## Attention hierarchy (the spine of this experience)

1. The search field — always the first thing and always one keystroke away.
2. The customer card — identity and contact actions above everything else on it.
3. Card actions (note, correct) — inside the card, below the facts.
4. The latest history entries and lifecycle action — quiet foot of the card.

## Loops

- Hear a name → type a fragment → one match opens the card (or pick among a few) → call,
  note, correct → clear the search with one control (or a key) → the next caller. Clearing
  resets the card and returns focus to the field.
- Correcting while on the call: edit on the card → Save → the card returns to read mode with
  the new value, the search left as typed.

## Feedback & feedforward

- Search answers as the person types, after a short pause; a visible "searching" state on
  the field, never a spinner over the whole page.
- "No match" is a sentence with the create action, not an empty frame; "too many matches"
  says how many and asks for one more detail.
- Forms on the card validate at the field, in words, at commit time — never a toast; the
  commit label names the outcome ("Save contact", "Record note").
- A failed command reports inside the card, above its button, with retry; the search and
  the card's facts stay on screen.

## Disciplines (transversal — always)

- The page name appears once, in the header; the card's title is the customer's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: candidates select, card buttons commit, a
  phone or email rendered as a link only opens the call or the mail.
- Link color only on real links; captions and history stay muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields; here the candidate strip never pages.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.
- **Nothing preloads**: no "recent customers", no default list on open — the page waits
  for a query.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: search as the only door, one short card, contact facts as actions, no
directory. On a phone the person often holds the call on the same device, so the card must answer
in the first screen. Where this section and the layout described above differ, this section wins on
mobile.

- **The search field sits at the top, full width**, focused on open; the clear control inside it
  is large enough to tap.
- **Candidates are full-width rows** under the field, name loudest and one fact below; a pick
  replaces them with the card, with back returning to the candidates and the search as typed.
- **The card fills one column**: name and status, document, then contact facts as large tap rows
  (call, write, copy), then the short commercial facts.
- **Card actions open a one-column form inside the card**, one field per line, the commit at the
  bottom where the thumb reaches.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the search field, 2. identity and contact actions on the card,
3. card actions and the latest history.

Forbidden on mobile:
- a list of customers shown before anything is typed;
- the card in a drawer or sheet over the candidates;
- phone or email as plain text when the contract provides them;
- multi-column forms or anything that scrolls sideways.

## Forbidden

- A persistent directory list beside the card, or a browsable paginated list of customers —
  that is the `directoryProfile` experience, not this one.
- A highlight band with the relationship's collections as the body of the page — that is the
  `relationshipHub` experience, not this one.
- Preloaded lists, "recent" or "favorites" sections invented without a query to back them.
- Tabs, long profile blocks or full history on the card; depth is one link away.
- Typed ids for anything the defs marks as selection/session/context.
- Invented scores, sentiment or value facts the contract does not declare.

## Signals (how to check the generated page)

1. **S1 Search only:** on open, the page shows a focused search field and no customer rows.
2. **S2 Single card:** after a pick, exactly one customer is presented, as one card; no list of
   other customers remains beside it.
3. **S3 Short card:** the card has no tabs and no full-length related list; its actions (edit,
   record) open inside the card, not on another page.
4. **S4 Fast reset:** one control clears the search and the card and returns focus to the field.
