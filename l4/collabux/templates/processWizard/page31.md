# processWizard — experience `growingDocument` (page31)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, steps, fields, validations — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

The process reads like **a document that writes itself downward**: the page starts with
only the first act open; completing it collapses it into a one-line recap and reveals the
next act below. Nothing looks like a wizard — no rail, no "step 2 of 5" — yet the order
is just as strict. This is the shape for processes with FEW acts where the earlier
answers give meaning to the later ones: the recaps stay on screen as running context.
Where `linearStepper` isolates each step in its own screen, this page accumulates them —
by the end, the whole process is readable top to bottom, and the commit is simply the
document's last line. Target: the user never wonders "what did I put back there?" — it is
right above.

## How to instantiate from the defs (the slots)

- **Acts come from the contract's declared stages**, in declared order — this shape wants
  a handful of acts; each act's heading is a short business phrase for its decision,
  never a number.
- **Only one act is ever open.** Acts below the open one do not exist yet on the page —
  not grayed placeholders, simply absent. The page grows only by completion.
- **A completed act collapses into a recap**: one or two lines stating what was decided,
  in plain words with real values — a sentence, not a mini-form. Each recap carries one
  quiet "change" link that reopens ITS act; reopening truncates everything below (later
  acts existed because of the earlier answer) after one plain confirm when work would be
  lost.
- **Inside the open act**: required fields visibly required before any mistake;
  selections are pickers, never typed ids; session/context values never render as inputs
  — at most a quiet caption at the top of the document.
- **The commit is the document's final line**, revealed only when the last act collapses:
  the accumulated recaps ARE the review, so no separate summary screen — one commit
  button naming the outcome ("Finish onboarding"), reachable only past everything
  decided.
- Intermediate acts persist nothing unless the contract declares per-act commands;
  confirming an act validates and collapses, and only the final button commits.

## The acts (the spine of this experience)

1. *Opening* — one line stating what the document will accomplish; the first act open.
2. *Complete → collapse → reveal* — each confirmed act becomes a recap; the next appears
   beneath; the eye keeps moving down, never jumping.
3. *The last line* — recaps above, commit button below; the page IS the review.
4. *Closing* — the commit line becomes a calm statement of what was done. No redirect.

## Feedback & feedforward

- Each act validates itself before its confirm control enables; errors are spoken at the
  field, in words, never only by color.
- Commit failure lands at the final line, above the commit button, in normal body color,
  with retry — every recap and value intact.
- While committing, the final line locks and shows a running state; the recaps stay
  readable.
- Abandoning asks nothing if nothing was entered; with acts completed, one plain confirm
  ("Discard this setup?") — never silent loss, never a double dialog.
- Success is quiet and local at the end of the document — no page banner.

## Disciplines (transversal — always)

- The page name appears once, at the top of the document; act headings never repeat it,
  and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: "change" links reopen, act confirms
  collapse, the final button commits — no control changes role.
- Link color only on the recap "change" links; recaps themselves are muted text, quieter
  than the open act.
- The open act is the loudest region; recaps recede so the growth reads at a glance.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- A numbered progress rail, step counters, one-step-per-screen isolation, or a separate
  final summary screen — that is the `linearStepper` experience, not this one.
- Rendering future acts as visible placeholders, disabled sections or ghost headings; the
  page grows only by completion.
- Editing a recap in place — changing means reopening the act that owns the value, with
  its consequences below made explicit.
- Committing before the last act collapses, or a commit that navigates away.
- Typed ids or editable fields for anything the defs marks as selection/session/context.
- Page-level toasts carrying validation; inventing acts, defaults or recap facts the
  contract does not declare.
