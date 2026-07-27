# agentNewTheme

Generates the current project's theme file `l2/skills/theme.ts` (contract v1) from
scratch, via an LLM guided by the shared `themeAuthoring` meta-skill, with two human
checkpoints. Written only after the user confirms. See `spec.md` (rationale) and
`flow.json` (authoritative contract).

## Run (Studio)

Mention the agent in the project where you want the theme (the project must NOT already
have `l2/skills/theme.ts`):

```
@@agentNewTheme { prompt: "a soft neumorphic light theme, brand color #6C5CE7, rounded corners, subtle shadows" }
```

- An empty/vague prompt is fine — Checkpoint 1 will ask for the missing fields with
  suggested options. A rich prompt may skip Checkpoint 1 (fast path).
- Checkpoint 1: answer the questions (fundo, paleta, cantos, borda, sombra, movimento,
  tipografia, nome).
- Checkpoint 2: review the summary (layout + palette swatches) → **Confirm** writes
  `theme.ts` + `theme.html`; **Exit** discards.

After confirming, the molecule agents (e.g. `@@agentNewMoleculeVariant`) can consume the
new theme.

## Layout

```
agentNewTheme.ts          root: parse { prompt }, admission, plant the step tree
flow.json                 authoritative spec (t1-plan → t2-clarify → t3-generate → t4-confirm)
spec.md / README.md       rationale / this file
helpers/                  ntFs, ntSteps, ntTypes, ntThemeHtml  (nt* — owned by this agent)
schemas/                  t1-plan.schema.json, t3-generate.schema.json
steps/t1-plan/            prompt + gate (the call itself is the ROOT's — no separate agent)
steps/t2-clarify/         agentNtClarify (Checkpoint 1; mounts shared Decision Clarification)
steps/t3-generate/        agentNtGenerate (design) + prompt (injects themeAuthoring) + gate
steps/t4-confirm/         agentNtConfirm (Checkpoint 2; mounts shared Theme Confirmation; writes on confirm)
```

Shared (outside this folder):
- `l2/aura/molecules/shared/vThemeContract.ts` — contract v1 validator + types (the t3 gate).
- `l2/aura/molecules/skills/themeAuthoring` — the authoring meta-skill (injected at t3).
- `l2/aura/molecules/shared/widgetDecisionClarification.*` / `widgetThemeConfirmation.*` — checkpoint widgets.

## Test

```
node scripts/run-tests.mjs 102020
```

Runs the gate/logic tests (contract validator, t1/t3 gates, theme.html renderer, widget
logic). Acceptance (Studio) after publishing 102020: see `todo/todo-agent-new-theme.md`
Fase 7.

## Status

The pipeline is complete and unit-tested (spec, helpers, the four steps, both checkpoint
widgets, the theme.html renderer, the t1/t3 gates). NOT yet exercised in the Studio:
publishing 102020 and the acceptance run are `todo/todo-agent-new-theme.md` Fase 7.
