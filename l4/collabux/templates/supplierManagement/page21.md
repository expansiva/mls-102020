# supplierManagement — experience `directoryCompliance` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The supplier registry as a compliance desk: a list of suppliers on one side, and on the
other a panel where **fiscal and commercial data are the headline** — documents, tax
identity, terms — because that is what gets a supplier approved or blocked. Approve and
block are first-class, deliberate actions that leave a visible trail. Where
`onboardingPipeline` reads the base as a flow of suppliers moving through stages, this is
a desk where each supplier is examined and judged one at a time. Target: verify a
supplier's fiscal facts and decide approve/block without leaving the page.

## How to instantiate from the defs (the slots)

- **The list comes from the collection query**: supplier name, then its standing (status
  chip: new, approved, blocked — whatever the contract exposes), then one disambiguating
  fact. Declared filters (by status, search) form one quiet bar above the list.
- **The panel opens in read mode**, blocks in this order when present: fiscal identity
  (tax ids, registrations) FIRST and loudest, then commercial conditions (terms,
  currencies), then contacts, then standing and its history.
- **Approve and Block are separate, explicit actions in the panel** — never a dropdown of
  statuses, never inside the edit form. Each asks one plain confirmation naming the
  supplier and the consequence; when the contract accepts a reason/note, the confirmation
  asks for it there.
- **The trail**: every standing change the contract records renders as a quiet
  reverse-chronological list in the panel — what changed, when, by whom when the data
  carries it. The trail is evidence, never editable.
- **Edit is an explicit switch** for record data (the update command's inputs, prefilled);
  editing never changes standing. **Creation** happens in the panel via one "New" action
  above the list.
- Session/context inputs never render as fields; the acting user comes from session,
  shown at most as a quiet caption. Ids are never typed — the selection IS the id. Never
  invent certifications, ratings or risk scores the contract does not declare.

## Attention hierarchy (the spine of this experience)

1. The selected supplier's fiscal block — the facts under judgment.
2. Approve/Block — visible, deliberate, clearly separated from each other.
3. The list and its status filter — the queue of who is next.
4. The trail — quiet proof at the bottom of the panel.

## Loops

- Filter to the standing that needs work → select → verify fiscal data → approve or
  block → the row's chip updates in place, the trail grows by one line → next supplier.
- Correcting data: edit → Save → read mode with saved values; the standing untouched.

## Feedback & feedforward

- Required fields visibly required before any mistake; validation at the field, in
  words, at commit time — never a toast.
- A failed command reports inside the panel, above the button that failed, normal body
  color, with retry; list and other panels stay untouched.
- Approve/Block/Save stay disabled until actionable; labels name the outcome ("Approve
  supplier", "Block supplier" — never "Confirm" alone).
- Success is local: the chip and trail updating in place IS the confirmation. No
  page-level banners, no redirects.

## Disciplines (transversal — always)

- The page name appears once, in the header; the panel's title is the supplier's name,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: rows select, buttons commit.
- Link color only on real links; alarm color only on a blocked standing where the
  contract flags it — never on buttons at rest, never as decoration.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Grouping suppliers into stage columns and moving them between stages — that is the
  `onboardingPipeline` experience, not this one.
- Standing as an editable field, a status dropdown, or approve/block inside Save.
- Approving or blocking without a confirmation that names the supplier.
- An editable trail, or a trail invented when the contract records nothing.
- Typed ids for anything the defs marks as selection/session/context.
- Burying fiscal data below contacts or notes; compliance facts lead the panel.
