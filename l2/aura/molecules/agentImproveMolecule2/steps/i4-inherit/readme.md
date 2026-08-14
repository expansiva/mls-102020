# i4-inherit

One reasoning call + a human checkpoint. **Route C only.** Runs between i2-triage and i3-edit.

## The question

The molecule is a shell: it extends a molecule in another project, and the change needs behaviour
the shell does not implement. Three places the fix can go, with three different costs:

| choice | cost |
|---|---|
| `less` | none. The shell keeps inheriting everything. |
| `override` | the shell **stops inheriting that member**: a later fix in the base no longer reaches it. |
| `parent` | **not executable.** Nothing is written; the run ends naming the file to open in the base project. |

The model **suggests**; the human **decides**. The suggestion arrives pre-selected with its reason
beside it.

## What code decides, and what is left to the model

The prompt gets two lists, both measured from the parent's source: the members that **can** be
overridden, cheapest first, and the members that **cannot** — private ones and module-scope constants,
each with the reason. The second list exists because the first one used to be filtered in silence: a
parent whose behaviour is all private produced a two-item list and a suggestion to override a lifecycle
hook that could not carry the change (CHANGELOG, 2026-08-13).

So: **code supplies the facts and the ordering; the model and the human make the choice.** Deciding in
code *whether a member can carry a given change* was considered and rejected — it is semantic, and a
gate that ruled on it would forbid the legitimate override-`render` case.

## `parent` is a real answer

It is the decision that defines this step. The user is allowed to conclude the base molecule is
wrong, and this agent still will not touch it.

⚠️ Choosing it **does** emit the `i4-done` anchor, carrying `where: 'parent'` — i3-edit reads it and
completes as a declared no-op, i5/i6 no-op after it, and i7 closes with the instruction. Nothing is
written to any file and the run **ends**. This paragraph used to say the opposite ("no anchor"), which
was the 2026-08-10 defect: the run went green and hung, because i3/i5/i6/i7 were already planted and sat
on an anchor that never landed. Validated in the Studio on 2026-08-13.

It is offered prominently on purpose: hiding it would push users into an override that is merely
the *reachable* answer. A defect in shared behaviour patched into one shell leaves every other
shell broken — and hides it.

## Mechanics

Shape borrowed from n2-plan: the reasoning call answers with a `{ type: 'clarification', json }`
envelope (**no tool call** — a tool result leaves the widget unmounted); `afterPromptStep` gates
the suggestion and returns `[]` so the payload stays mounted; `beforeClarificationStep` mounts
`widget-inherit-choice-102020`, rebuilding its value from **disk**, not from the mounted payload;
Confirm re-gates what the human chose, because that is what gets written.

The widget is this step's own. n2-plan's confirms *requirements*; this one presents *consequences*,
and they must be visible before the click, not after — which is also why the three cards are not
styled alike.

## Output

- `l4/agentImproveMolecule2/<runKey>/inherit-suggestion.json` (the model's proposal)
- `l4/agentImproveMolecule2/<runKey>/inherit.json` (the human's decision) — only on `less`/`override`
- result step `i4-done` carrying `{ where, member? }`; **i3-edit renders it as an instruction, not
  as advice**: it was chosen at a checkpoint with the costs spelled out.

## Invariants

- reaching this step for a non-shell is refused — the routing broke;
- an override names a real member of the parent, **unless** the parent is unreadable from here, in
  which case any name is accepted (refusing everything would leave the user unable to answer a
  question they were still asked);
- an override never names a member that **cannot** be overridden — a private member or a module-scope
  constant. The refusal says which of the two and that the answer is therefore `parent`, because
  "unknown member" about something that exists sends the retry looking for a typo;
- a member named on a choice that does not target one is refused;
- the **model's** suggestion must carry a reason; the human's answer need not;
- Cancel stops the run with nothing written.

## Tests

`gate.test.ts` (13) and `widgetInheritChoiceLogic.test.ts` (10), both pure, no DOM. The member map and
the unreachable map are tested in `helpers/imInherit.test.ts`. The one that carries the design is
"'parent' is a VALID answer and NOT an executable one".
