# caseManagement — experience `intakeTriage`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

**Triage, not resolution.** New cases arrive untriaged; the dispatcher's job is to give each
one a priority, an owner and a category, and send it on — in seconds, not minutes. Every
new case is a row with its classification controls right on it; once classified and
routed, it leaves the intake list. Nobody reads a thread here, nobody resolves anything.
Where `caseWorkbench` is a bench for working cases to resolution with record, thread and
actions as peers, and `conversationFirst` gives one case's narrative the whole room, this
page never opens a case: it sorts the incoming pile. Target: an intake list emptied at the
pace cases arrive, each one routed with the right priority, owner and category.

## How to instantiate from the defs (the slots)

- **The intake list is the case query narrowed to what awaits triage** — the contract's
  "new"/"unassigned" status or filter when it declares one; otherwise the main query,
  newest arrivals visible first or oldest first as the contract orders. A quiet headline
  above it counts what is waiting ("9 new cases").
- **Each row is a triage line**: on the left, what arrived — subject, requester, arrival
  time, and the first line of the description (never more than two lines). On the right,
  the **triage controls**, one per classification field the contract's command accepts:
  priority as a compact choice, owner (assignee, team, queue) as a search-select picker,
  category as a picker. Only fields the contract declares appear; a missing one is simply
  absent.
- **One routing command per row**: the contract's assign/route/classify command, a
  button labeled with the outcome ("Route"), enabled once every field the command
  requires is set. When the contract splits classification into several commands, each
  control commits through its own command and the row leaves once its triage status
  changes.
- **Current values prefill** when the contract provides them (a suggested category, a
  default priority) — shown as values, never as decisions already made.
- **Quick read without opening**: the row's subject expands the row in place to show the
  full description and attachments' names — read-only, collapsible — never a thread or
  a status action.
- Session/context inputs never render as fields (the dispatcher is known); ids are never
  typed — owners and categories come from pickers.

## Attention hierarchy (the spine of this experience)

1. The top untriaged row — what just arrived and needs routing.
2. Its triage controls and the route button.
3. The waiting headline — how big the pile is.
4. Filters and captions, demoted.

## Loops

- Read the row → set priority, owner, category → route → the row leaves with a brief exit,
  the headline drops, the next row moves up with focus on its first control. Keyboard
  flow: the controls and the route button are in tab order, row after row.
- Unsure? Expand the row in place to read the full description, classify, collapse.
- The empty intake is the designed rest state: one calm sentence that nothing new is
  waiting.

## Feedback & feedforward

- The route button stays disabled until the command's required fields are set; its label
  names the outcome, and a caption under it may restate the destination ("to Billing team").
- A routing in flight locks only its row; failure lands in that row, in body color, with
  retry, and the chosen values are kept.
- Success is the row leaving and the headline dropping — no banner, no dialog, no toast.
- Alarm color only on a priority value the contract marks critical, or a fact it flags —
  never on whole rows.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label
  of a button or link near it**.
- A control is navigation OR action, never both: the subject expands, the pickers set
  values, route commits; a link to the full case, if offered, is one distinct quiet link.
- Link color only on real links; arrival times and captions are muted.
- One row anatomy for the whole list; controls aligned in columns so the eye scans down
  each classification.

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
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: triage only, the controls on the row, one route per case, rows leaving the
list, feedback and disciplines. The arrival text and the controls can no longer sit side by side,
so each triage line stacks them. Where this section and the layout described above differ, this
section wins on mobile.

- **Each case is a full-width block**: subject and arrival time first, requester and the first
  description line under them, then the triage controls one per line, then route full width at
  the block's foot.
- **Pickers open in place** as a short list under the control, with search when long; never a
  separate page.
- **After routing**, the block leaves and the next block moves up into the same place, with its
  first control in view.
- **The headline** stays at the top of the list; filters fold behind one quiet control.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the top case block, 2. its controls and route, 3. the headline.

Forbidden on mobile:
- opening a case view to triage it;
- triage controls side by side, cramped on one line;
- swipe gestures that route or dismiss;
- any horizontal scroll.

## Forbidden

- A queue beside a full case workspace with record, thread and status actions — that is
  `caseWorkbench`.
- A case's thread as the page center, with a composer — that is `conversationFirst`.
- Resolve or close actions, comment composers, or any resolution work on this page.
- Opening a case (panel, drawer, page) to classify it; triage happens on the row.
- Fields the routing command does not accept; inventing priorities, categories or
  suggestions the contract does not declare.
- Typed ids for owners or categories; page-level toasts; blocking dialogs on routing.

## Signals (how to check the generated page)

1. **S1 controls on the row:** each case row carries its own classification controls
   (pickers/choices) and a route button, without opening anything.
2. **S2 no resolution:** the page has no comment composer and no resolve/close action.
3. **S3 no workspace:** there is no detail panel, drawer or case view beside or over the
   list; at most a row expands in place, read-only.
4. **S4 routed rows leave:** after routing, the row leaves the list and the waiting count
   drops.
