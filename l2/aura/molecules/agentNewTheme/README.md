# agentNewTheme

Generates the current project's theme file `l2/skills/theme.ts` (contract v1) from
scratch, via an LLM guided by the shared `themeAuthoring` meta-skill, with a single human
checkpoint. Written as soon as the generation passes its contract gate. See `spec.md`
(rationale) and `flow.json` (authoritative contract).

## Run (Studio)

Mention the agent in the project where you want the theme (the project must NOT already
have `l2/skills/theme.ts`):

```
@@agentNewTheme a soft neumorphic light theme, brand color #6C5CE7, rounded corners, subtle shadows
```

Prose is the natural form — write the description straight after the mention, colors, colons
and parentheses included. The object form `@@agentNewTheme { prompt: '...' }` also works.

- An empty/vague prompt is fine — the checkpoint will ask for the missing fields with
  suggested options. A rich prompt may skip it entirely (fast path).
- Checkpoint: answer the questions (fundo, paleta, cantos, borda, sombra, movimento,
  tipografia, nome). Cancelling stops the run with nothing written.
- Then the theme is generated, gated and written: `theme.ts` + `theme.html`, with the
  `.ts` compiled. Click the step to review the palette/signature read-only.

Once it lands, the molecule agents (e.g. `@@agentNewMoleculeVariant`) can consume the new
theme. To regenerate, delete or rename `l2/skills/theme.ts` first — the agent refuses to
run in a project that already has a theme.

## Layout

```
agentNewTheme.ts          root: parse { prompt }, admission, plant the step tree
flow.json                 authoritative spec (t1-plan → t2-clarify → t3-generate)
spec.md / README.md       rationale / this file
helpers/                  ntEntry, ntFs, ntSteps, ntTypes, ntThemeHtml  (nt* — owned by this agent)
schemas/                  t1-plan.schema.json, t3-generate.schema.json
steps/t1-plan/            prompt + gate (the call itself is the ROOT's — no separate agent)
steps/t2-clarify/         agentNtClarify (the checkpoint; mounts shared Decision Clarification)
steps/t3-generate/        agentNtGenerate (design) + prompt (injects themeAuthoring) + gate;
                          writes theme.ts/.html on a green gate; openStepView = read-only review
```

Shared (outside this folder):
- `l2/aura/molecules/shared/vThemeContract.ts` — contract v1 validator + types (the t3 gate).
- `l2/aura/molecules/skills/themeAuthoring` — the authoring meta-skill (injected at t3).
- `l2/aura/molecules/shared/widgetDecisionClarification.*` — the checkpoint widget.
- `l2/aura/molecules/shared/widgetThemeConfirmation.*` — the read-only step view (`readonly`).

## Test

```
node scripts/run-tests.mjs 102020
```

Runs the gate/logic tests (contract validator, t1/t3 gates, theme.html renderer, widget
logic). Acceptance (Studio) after publishing 102020: see `todo/todo-agent-new-theme.md`
Fase 7.

Every `prompt.md` must open with `<!-- modelType: X -->` (see `skills/modelTypes.md`);
without it the platform picks a cost-based fallback alias and the call 404s. Quick check:

```
for f in steps/*/prompt.md; do grep -m1 -o 'modelType: [a-z]*' $f; done
```

## Status

The pipeline is complete and unit-tested (spec, helpers, the four steps, both checkpoint
widgets, the theme.html renderer, the t1/t3 gates). NOT yet exercised in the Studio:
publishing 102020 and the acceptance run are `todo/todo-agent-new-theme.md` Fase 7.
