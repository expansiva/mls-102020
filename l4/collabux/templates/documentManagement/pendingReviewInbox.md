# documentManagement — experience `pendingReviewInbox`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

An **inbox of what waits for me**: only the documents whose next move belongs to the acting
user — approve, reject, sign, review — and one document at a time on stage, read and decided,
then gone from the pile. The question is not "where is this document?" but "what is waiting
for me, and how much is left?". Where `libraryList` is a shelf of every document found by its
metadata and `folderExplorer` walks the places documents live, this page holds no library at
all: it is a desk with a pile, and the pile shrinks. Target: reach an empty inbox, each
document decided deliberately, without ever losing the count of what remains.

## How to instantiate from the defs (the slots)

- **The pile is the query that returns documents awaiting the acting user** — a pending /
  assigned-to-me query, or the documents query narrowed by its declared status or assignee
  input, set from session and never shown as a field. If the contract declares no such
  narrowing, the pile is the documents in the status the contract names as awaiting a
  decision; never invent an assignment the contract does not carry.
- **The remaining count heads the pile**: "7 waiting" from the query's total when declared;
  otherwise the number of loaded items, worded as such ("7 loaded").
- **Each pile entry** carries the document name, what is asked of me (the pending action in
  words, from the status or request type the contract declares), who asked and since when
  (when declared). Age is muted text, never alarm, unless the contract flags it as overdue.
- **The stage binds to the current document**: preview or best summary first, then the facts
  that justify the decision (version, owner, the change or note the contract carries), then
  the decision commands — only those valid for its status, outcome-named ("Approve", "Sign",
  "Reject with note"). Commands the contract does not declare do not exist.
- **Inputs a decision needs** (a rejection note, a signature confirmation) come only from the
  command's declared inputs, collected on the stage, one field per line.
- **Session/context inputs never render as fields**: the acting user is known. Ids are never
  typed — the document is the one on stage.

## Attention hierarchy (the spine of this experience)

1. The current document on stage — its preview and the facts the decision needs.
2. The decision commands for it, outcome-named.
3. The remaining count — how much is left.
4. The pile itself, as a quiet queue to jump within.

## Loops

- Decide loop: read the staged document → decide → it leaves the pile with a one-line trace
  ("Approved — Contract 2026-14") → the next document takes the stage automatically → the
  count drops by one. The user never has to go and pick the next one.
- Skip loop: "Later" (when it is a pure UI move, not a command) sends the document to the
  end of the pile without deciding; skipped is not decided, and the count does not drop.
- Jump: picking an entry in the pile stages it; the order of the pile never changes because
  of a jump.
- Empty pile: one calm sentence ("Nothing waiting for you") with the time of the last
  decision when known — an empty inbox is the goal reached, not an error.

## Feedback & feedforward

- The decision's confirm is disabled until its declared inputs are valid; validation sits at
  the field, in words.
- Reject and any irreversible decision confirm once, naming the document; approve needs no
  dialog unless the contract marks it consequential.
- While a decision runs, the stage's commands lock; the pile stays readable. Failure renders
  on the stage above the commands, in normal body color, with retry — the document stays on
  stage and in the pile.
- The last decision stays undoable for a moment only if the contract declares an undo
  command; otherwise its trace is just a line.
- A preview that cannot render says so on the stage and still shows the facts.

## Disciplines (transversal — always)

- The page name appears once, in the header; the stage heading is the document's name, and
  **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: pile entries stage, stage commands decide,
  an open/download link is a link only.
- Link color only on real links; pending-action labels, ages and counts are muted or
  semantic, never blue.
- One decision at a time: no document is decided without having been on stage.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the pile loads more by itself.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: only what waits for me, one document on stage, decide and advance, the
remaining count, the loops and the disciplines. The pile and the stage cannot sit together, so the
stage becomes the home view and the pile hides behind the count. Where this section and the layout
described above differ, this section wins on mobile.

- **The stage is the home view**: the current document fills the column — name, what is asked of
  me, then the preview or summary, then the facts, one per line.
- **The count is a control at the top** ("4 of 7 waiting"): it opens the pile as a view of its
  own, one entry per row; tapping an entry stages it and returns to the stage. Back returns too.
- **The decision commands sit at the bottom**, where the thumb reaches, only those valid for the
  status, outcome-named; a decision needing input opens its fields in place, one per line.
- **After deciding**, the one-line trace shows on top and the next document is already staged,
  scrolled to its start.
- **Later** is a quiet text control beside the commands, never a swipe only.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the staged document and its facts, 2. the decision commands at the
bottom, 3. the remaining count.

Forbidden on mobile:
- the whole pile as the home view, with decisions taken from its rows;
- swipe as the only way to approve, reject or skip;
- a drawer over the stage to show the pile;
- losing the remaining count while a document is on stage.

## Forbidden

- A full library of all documents with metadata filters as the page's structure — that is
  `libraryList`, not this one; this page shows only what waits for the acting user.
- Folders, breadcrumbs or any location hierarchy — that is `folderExplorer`.
- Bulk select-and-approve; each document is decided on stage, one at a time.
- Decision buttons on pile entries; deciding a document that was not staged.
- Asking the user who they are, or filtering the pile by a typed user.
- Page-level toasts carrying validation; redirects after a decision; inventing statuses,
  pending actions or counts the contract does not declare.

## Signals (how to check the generated page)

1. **S1 my pile only:** the page lists only documents awaiting the acting user's action; there
   is no general document list or folder navigation.
2. **S2 one on stage:** exactly one document is shown in full with its decision commands; the
   other pending documents appear only as compact pile entries without decision buttons.
3. **S3 auto-advance:** after a decision succeeds, the next pending document is staged without
   the user selecting it.
4. **S4 remaining count:** a visible count of documents still waiting drops after each decision.
5. **S5 empty goal:** with nothing pending, one calm sentence states the inbox is clear.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "listOverflow": "infinite",
    "validation": "inline-below",
    "feedback": "inline"
  },
  "groups": { "prefer": ["groupViewData", "groupTriggerAction"], "forbid": ["groupViewHierarchy"] }
}
```
