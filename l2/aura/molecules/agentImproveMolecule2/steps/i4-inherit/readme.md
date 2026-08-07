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

## `parent` is a real answer

It is the decision that defines this step. The user is allowed to conclude the base molecule is
wrong, and this agent still will not touch it. Choosing it emits **no `i4-done` anchor**, so
i3-edit never starts and nothing is written anywhere.

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
- a member named on a choice that does not target one is refused;
- the **model's** suggestion must carry a reason; the human's answer need not;
- Cancel stops the run with nothing written.

## Tests

`gate.test.ts` (10) and `widgetInheritChoiceLogic.test.ts` (10), both pure, no DOM. The one that
carries the design is "'parent' is a VALID answer and NOT an executable one".
