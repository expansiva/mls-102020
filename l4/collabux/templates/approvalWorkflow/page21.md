# approvalWorkflow — experience `readAndDecide` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, transitions, fields — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

**One record under review, read like a memo, decided at the end.** The page is built for
a decision that deserves attention: the reviewer reads downward through a deliberate
hierarchy — who/what, the decisive facts, the narrative, the trail — and only at the end
of that reading path meets the decision. Each outcome is one deliberate beat of its own.
Where `decisionQueue` clears many easy calls fast, this page slows one consequential call
down. Target: a decision the reviewer could defend out loud, because the page made them
read before it let them act.

## How to instantiate from the defs (the slots)

- **The reading order is fixed, top to bottom:**
  1. *identity* — what is being requested and by whom, in one strong line;
  2. *decisive facts* — the few values the decision hinges on (amount, dates, category),
     large, labeled, right-aligned when numeric;
  3. *narrative* — description, justification, line items, whatever the contract exposes
     as the request's body;
  4. *trail* — prior comments, status history, audit entries, quiet and chronological.
- **The decision block sits at the END of the reading flow** — after the trail, not in a
  sticky header, not floating. Reaching it means the page has been read.
- **Outcomes come from the declared transitions, one control each** (approve, reject,
  request changes — only what the contract declares), labeled with the outcome, visually
  peers except the contract's primary path.
- **Each outcome has exactly one deliberate beat**: *reject* (and *request changes*)
  expands an inline reason field at the decision block — required before its button
  enables; *approve* opens one plain confirmation dialog restating identity and the
  decisive fact, then commits. One beat per outcome, never two.
- **Session/context inputs never render as fields** — the reviewer's identity is known;
  show it at most as a quiet caption. Ids are never typed; the record under review comes
  from context, and any comment target is implicit.
- **The record under review is normally already there, and then its selection collapses.**
  A reviewer arrives from a notification, a queue or a related list, carrying the record. The
  step that exists to choose it renders one quiet line naming it ("Change order #418 ·
  Riverside remodel") with a "change" link that reopens the picker in place — never a
  selector the reviewer has to operate before reading. **Opened cold, with nothing carried,
  the same step renders the picker in full**, and the decision block stays inert until a
  record is chosen. One screen, two faces.
- A collapsed selection never hides the record's identity: the line IS the identity header,
  and reading down still starts from it.

## The decision beats (the spine of this experience)

1. Read down: identity → facts → narrative → trail.
2. Arrive at the decision block; outcomes visible, none pre-selected.
3. One deliberate beat for the chosen outcome (inline reason, or plain confirm).
4. Commit; the page restates the new status where the decision block was.

## Feedback & feedforward

- The reason field validates at the field, in words, before its button enables; the
  button's label names the outcome ("Reject request"), never a generic "Submit".
- Command failure renders inside the decision block, above its buttons, in normal body
  color, with retry — the reading content is untouched and nothing entered is lost.
- While a decision runs, the decision block locks and shows a running state; the rest of
  the page stays readable.
- Success is local and final: the decision block becomes a calm statement of what was
  decided, by whom, when — no page banner, no redirect; any onward step is one quiet link.
- Alarm color only on facts the contract flags (over budget, past due) — never on the
  reject button by default, never on the frame.

## Disciplines (transversal — always)

- The page name appears once, in the header; sections have plain reading titles, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: outcome buttons decide, trail links
  navigate, and no button doubles as a link.
- Link color only on real links; the trail and captions are muted, not blue.
- Numbers carry their unit or currency as the contract declares; a bare number is a guess.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A list of pending requests with inline approve/reject on each row — that is the
  `decisionQueue` experience, not this one.
- Decision buttons before or beside the content (sticky headers, floating bars): the
  decision lives at the end of the reading path.
- Approving without its confirmation beat, or rejecting without a collected reason when
  the contract requires one; double dialogs on any outcome.
- Auto-advancing to a "next request" after deciding — this page holds one record and
  closes its story.
- Typed ids for the record, the requester, or anything the defs marks as
  selection/session/context.
- Page-level toasts carrying validation; inventing facts, statuses or trail entries the
  contract does not declare.
