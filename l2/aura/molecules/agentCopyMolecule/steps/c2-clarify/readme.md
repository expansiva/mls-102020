# c2-clarify

The pipeline's ONLY human stop — and it only stops when there is something to decide.

## Always planted, sometimes silent

`c2` is planted by the root like every other step (decision 4). With **zero collisions** it
auto-completes in `beforePromptStep`: no LLM call, no widget, no question — just the `c2-done`
anchor and a completed status. One plan shape, one code path.

The alternative (c1 emitting an `add-step` when it finds a collision) was rejected: it makes
two plan shapes for the same pipeline, and the conditional path is exactly where a missing
anchor hides.

## The question

A destination molecule collides when ANY of its 4 files already exists. What is at stake is
**the client's translation** — the copy is where the `pt` lives — so the options say the
consequence out loud, and the intro names each colliding file with the `copiedFrom` date of the
copy at risk when it is readable.

| mode | options |
|---|---|
| `single` (one molecule) | `replace` / `cancel` / `rename` |
| `group` / `list` (batch) | `replace-all` / `ignore-existing` / `cancel` |

**Rename is single-only** (control decision 1): renaming item by item does not scale to 12, and
the option's own text says so. The new name arrives through the widget's free-text field — which
is why rename needs no second question — and it is validated against a FRESH collision: renaming
into another molecule that already exists is not a fix.

**Cancel cancels everything, with nothing written** (decision 5). The widget's cancel button and
the `cancel` option end in the same place: the step fails readable and no file is touched.

**`ignore-existing` is the only partial result this pipeline allows** — and it is partial because
the USER chose it, which is a different thing from the agent deciding to copy 10 of 12 (that is
what fail-fast in c1 refuses).

## Mechanics

Checkpoint pattern of `agentNewTheme/steps/t2-clarify`, no widget of its own: the shared
`widget-decision-clarification-102020` renders one question with options plus the free-text
field.

1. `beforePromptStep` — no collision: anchor + completed. With collisions: a cheap envelope call
   (`{ type: 'clarification', json: { planId } }`).
2. `afterPromptStep` — validates the envelope and returns `[]`, which is what keeps the widget
   mounted.
3. `beforeClarificationStep` — mounts the widget with the question built from the context.
4. On answer: gate → write `answers.json` → write the context back → `c2-done` anchor BEFORE the
   update-status (intent order matters) → resume the task.

## Invariants

**This is the only step allowed to mutate `context.json`**, and only two fields: `rename` (single
mode) and `skip` (ignore-existing). Everything else in the context was written once by c1.

**Every outcome anchors or fails.** A path that neither writes nor anchors is how a run goes
green and hangs — the `i4-inherit` defect of 2026-08-10.

## Known traps

- the widget callback runs OUTSIDE the pooling cycle: it applies its own intents through
  `cApplyIntentsAndRefresh` and resumes the task;
- the parent step may have been auto-completed by then, and the backend refuses mutations on a
  completed parent — hence `cFindMutableParent`.
