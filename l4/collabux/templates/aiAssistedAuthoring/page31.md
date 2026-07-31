# aiAssistedAuthoring — experience `draftCanvas` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, inputs, artifacts — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A writing desk: **the artifact is the page** — a document, center stage, being written by
a human — and the AI sits at its side as a rail of suggestions, applied one at a time or
dismissed. The human's text is sovereign; the machine never touches the canvas without an
explicit accept. Where `generateReviewShare` is a corridor the artifact travels through
(configure, generate, review, publish), this is a desk where the artifact never leaves the
author's hands — assistance without surrender.

## How to instantiate from the defs (the slots)

- **The canvas comes from the artifact's content field**: one generous editable document
  region at a comfortable reading width, center stage, with the artifact's title above
  it (editable if the contract accepts it). The canvas is the ONLY editable surface.
- **The suggestion rail comes from the contract's suggestions/findings**: one quiet card
  per suggestion beside the canvas, each stating in plain words what it proposes and
  what part of the draft it concerns. Each card offers exactly two moves — **accept**
  and **dismiss** — mapped to the contract's commands. Accept applies precisely that
  suggestion's change to the canvas, visibly, near where it landed; dismiss removes the
  card quietly. No returned suggestions means no rail, silently — never placeholder
  advice.
- **Requesting fresh suggestions**, when the contract declares such a command, is one
  quiet control on the rail; it never rewrites the canvas — it refills the rail.
- **Save and publish come from their commands**: save as the canvas's own commit,
  publish (when declared) as one contextual button whose confirmation names, in plain
  words, what goes where. **Session/context inputs never render as fields; ids are
  never typed.**

## Attention hierarchy (the spine of this experience)

1. The canvas — the human's draft, the largest and calmest thing on the page.
2. The suggestion rail — present, quiet, never overlapping the text.
3. Save state — is my writing safe — always answerable at a glance.
4. Publish, contextual and last.

## Loops

- Write → glance at the rail → accept one card (the canvas updates where it landed,
  the card leaves the rail) → keep writing. One suggestion at a time; the author stays
  in control of the pace.
- Dismiss is as respectable as accept: a dismissed card leaves without argument and
  does not return for the same text.
- Save whenever dirty; publish when the draft is ready — publishing does not end the
  page; the draft remains open for a next version if the contract allows.

## Feedback & feedforward

- The canvas's dirty state is always visible near the save control; save stays disabled
  until dirty, its label naming the outcome ("Save draft").
- An accept that fails reports inside its own card, in normal body color, with retry —
  the canvas is left exactly as it was, and the card stays.
- Save or publish failure renders beside its button with retry; **typed text is never
  lost** — not on failure, not on refresh of the rail, not on publish.
- While a suggestion applies, only that card locks; the canvas and other cards stay
  usable.
- Success is local: the card resolves, the save state settles. No page banners.

## Disciplines (transversal — always)

- The page name appears once; the artifact's title belongs to the artifact, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: accept applies, dismiss removes, save
  saves, publish publishes — no control changes role between states.
- Link color only on real links; suggestion cards and captions are muted, not blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A staged configure → generate → review → publish corridor, or a configuration panel
  gating the canvas — that is the `generateReviewShare` experience, not this one.
- The AI rewriting the canvas wholesale, auto-applying suggestions, or altering ANY
  text without an explicit accept on a specific card.
- Invented suggestions, scores or confidence values the contract does not return.
- Blocking modals to present suggestions, or a rail that covers the text being written.
- Typed ids for anything the defs marks as selection/session/context.
- Blocking success dialogs, page-level toasts carrying validation, redirects after
  publish.
