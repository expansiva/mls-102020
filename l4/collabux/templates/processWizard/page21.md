# processWizard — experience `linearStepper` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, steps, fields, validations — never contradict it); this skill is
> the flavor: how the page moves, focuses and feels. Where the two seem to conflict, the
> defs wins on DATA and this skill wins on BEHAVIOR.

## Concept (narrative dialect)

A **formal corridor of numbered steps**: one step per screen, a visible rail announcing
the whole journey, strong validation at every door, and a full summary before anything is
committed. This is the shape for processes where order matters and skipping is failure —
a closing, an onboarding, a setup. Where `growingDocument` lets the process accumulate on
one page, this experience isolates each step so the current decision is the only thing on
stage. Target: the user always knows where they are, what remains, and that nothing is
real until the final confirmation.

## How to instantiate from the defs (the slots)

- **Steps come from the contract's declared stages** — the process's input groups in
  their declared order, one screen each. Each step's title is a short business phrase for
  its decision, never "Step 2".
- **The numbered rail shows every step**: number and short title, current highlighted,
  completed marked, future muted. **The rail is a map, not navigation** — future entries
  are never clickable, never link-colored; returning is a dedicated Back control, one
  step at a time, and completed values are preserved on return.
- **Inside a step**: required fields visibly required before any mistake (feedforward);
  selection inputs are pickers, never typed ids; fields the system resolves
  (session/context — who runs the process, which unit) never render as inputs, at most a
  quiet caption.
- **A step whose record already arrived collapses to a summary line.** Many processes are
  opened from somewhere that already carries the record a step exists to choose — a hub, a
  related list, a notification. When that happens the step does NOT ask again: it renders a
  single quiet line naming the record ("Project: Riverside remodel") with one "change" link
  that reopens the picker in place, and the corridor advances past it. Opened cold, with
  nothing carried, the same step renders its picker in full. **One step, two faces — the
  difference is whether the record is already there, never a different screen.**
- A collapsed line is not a completed step in the rail: the rail marks it done and the user
  never lands on it, but "change" always brings the choice back without losing what came
  after it.
- **The final step is always the summary**: everything entered, in plain words, grouped
  by step, each group with one quiet "edit" link jumping back to its OWN step (the one
  legitimate rail shortcut — backward only). The single commit button names the outcome
  ("Close the shift", "Finish setup").
- Nothing is persisted by intermediate steps unless the contract explicitly declares
  per-step commands; Next validates and advances, and only the summary commits.

## The acts (the spine of this experience)

1. *Opening* — the first step states in one line what the process will accomplish.
2. *One act per step* — fill, validate, Next; the corridor only moves forward.
3. *The summary act* — read everything, edit backward if needed.
4. *Commit and closing* — one plain confirmation of what was done, with the single next
   destination if the contract declares one. No redirect.

## Feedback & feedforward

- Validation is per step, at the field, in words, at Next time — Next stays disabled
  until the step is valid, and its label is always "Next" until the summary, where the
  button names the real outcome.
- Commit failure lands on the summary, above the commit button, in normal body color,
  with retry — every entered value is intact.
- While committing, the summary locks and the button shows a running state.
- Abandoning mid-process asks nothing if nothing was entered; with values entered, one
  plain confirm ("Discard this closing?") — never silent loss, never a double dialog.
- Success is the closing act itself — no page banner over a half-dead wizard.

## Disciplines (transversal — always)

- The page name appears once, in the header; step titles never repeat it, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: Next advances, Back retreats, the summary
  button commits — no control changes role between states.
- Link color only on real links (the summary's edit links); the rail's future steps and
  all captions are muted.
- One step fits its screen comfortably; a step needing heavy scroll is two steps done
  badly.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## Forbidden

- Keeping completed steps visible on the same page as collapsed recaps while the next
  unfolds below — that is the `growingDocument` experience, not this one.
- A clickable rail, tabs, or any way to jump forward; skipping required steps.
- Committing before the summary, a Next that commits, or a commit that navigates (the
  closing act is the consequence of success, not a redirect).
- Editing in place on the summary — editing is jumping back to the step that owns the
  value.
- Typed ids or editable fields for anything the defs marks as selection/session/context.
- Page-level toasts carrying validation; inventing steps, defaults or validations the
  contract does not declare.
