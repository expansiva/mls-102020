# agentNewMolecule2

Creates a new molecule from a prose description: `.defs.ts`, `.ts`, `.less`, `.html` and the group
index. In a project that has `l2/skills/theme.ts` the molecule is born pure in that theme; without a
theme the result is the neutral one.

Read `flow.json` (the contract) and `spec.md` (the rationale) before changing anything here.

## Run it

```
@@agentNewMolecule2 a KPI card showing a label, a big value and a variation badge with an up/down arrow
```

Prose only — there is no object form. A bare mention fails readably: there is nothing to build
without a description.

The run stops once, at the **checkpoint**, showing the proposed name/tag, the description, the final
prompt, the functional/visual requirements — all editable — the **Design System layout axes** as
pre-filled selects, and a read-only line naming the detected theme. Confirm to proceed, Cancel to stop
with nothing written.

The layout axes decide which pages the Design System picks this molecule for. Code offers only the axes
that govern the group and only their allowed values; the model pre-selects one per axis; you change it
if it got it wrong. Leaving them all on "any" makes the molecule the group's fallback wildcard, so at
least one must be chosen — unless the group has no governing axis, and then the section does not appear
at all.

## Pipeline

| step | model | writes |
|---|---|---|
| root | `classifier` | — (picks the group) |
| `n1-bootstrap` | none | `l4/.../context.json` |
| `n2-plan` | `reasoning` | `l4/.../plan.json` (checkpoint) |
| `n3-defs` | `reasoning` | `<name>.defs.ts` |
| `n4-render` | `code` | `<name>.ts` + compiles (retry ≤ 1) |
| `n5-less` | `design` | `<name>.less` |
| `n6-demo` | `code` | `<name>.html` |
| `n7-index` | `code` | `index.ts` + `index.html` (failure does not block) |
| `n8-summary` | `general` | — |

## Test it

```
node harness/run-tests.mjs 102020
npx tsc -p tsconfig2.json --noEmit
```

Every step owns one gate file and one `.test.ts` beside it. A new rule goes into the gate **and** its
test, in the same commit — prose rules get rationalized away by the model, gates do not.

## Where things live

- `steps/nN-*/` — one folder per step: `agentNm2*.ts`, `prompt.md`, `gate.ts`, `gate.test.ts`,
  `readme.md`, `CHANGELOG.md`
- `helpers/` — paths and stor mechanics (`nmFs`), the context contract (`nmContext`), types
  (`nmTypes`), intent/anchor plumbing (`nmSteps`), deterministic templates (`nmTemplates`)
- `schemas/` — the tool schema of each LLM call

Shared, outside this folder: `shared/mentionEntry`, `shared/vThemeContract`, `shared/llmTool`,
`shared/widgetDefsClarification`, `skills/lessAuthoring`, `skills/moleculeGeneration`,
`skills/playgroundGenerator`, `skills/indexGroupPage`, `skills/index` (group registry).

## Two things that will bite you

1. **Every `prompt.md` must open with `<!-- modelType: X -->`** (valid values in
   `skills/modelTypes.md`). Without it the platform falls back to a cost-based alias and the call
   fails with `404 Model alias not found or inactive: cost`.
2. **Headers are the orchestrator's.** The `.defs.ts`, `.ts` and `.less` headers are prepended by
   code; prompts explicitly tell the model not to write one. The old flow parsed the model's first
   line to decide where to save the file — a hallucinated header wrote to the wrong path.

## Relationship to the old flow

The eight-agent chain in `agentsManageMolecules/` is **untouched** and still works. This agent runs
beside it; what happens to the old one is decided after acceptance (control item 3.13).
