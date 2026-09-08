# CHANGELOG — v4-index

- 2026-07-23: created (Fase 2 do todo-agents-molecules-modelos-novos.md; spec: flow.json v4-index).
- 2026-07-23: reworked from a deterministic import-inserter into an LLM step that
  regenerates the full group showcase (hero + cards + reference table) reusing the
  `indexGroupPage` skill — the index now looks like what `agentUpdateIndexGroupPage`
  produces, instead of only registering an import. Added v4-index.schema.json,
  prompt.md, best-effort compile + agentNewMoleculeFix chaining, and ok:false
  resilience so index failure never blocks the pipeline. Removed the obsolete
  `renderNewGroupIndexTs`/`insertIndexImport` renderers.
- 2026-07-23: THEMED the index — the showcase was coming out on the skill's neutral
  bg-white/slate chrome, making glass molecules invisible. Prompt now injects
  themeInfo.background + the theme Visual Signature and instructs the same mandatory
  deviation as v5-demo (theme background on the page container + theme-coherent
  surfaces/text). Gate now requires the theme background on the container. The
  Visual-Signature extraction was lifted to a shared helper (vTheme.extractVisualSignature
  / loadThemeSignature), reused by v4 and v5.
- 2026-07-24: prompt.md — added a "Slot support" rule after the model wrongly added a
  `<Trigger>` slot (dropdown-only) to the ml-combobox showcase card, which rendered as
  raw black text (combobox does not consume it; light DOM). The rule tells the model to
  only pass slots a molecule supports per the usage table and to use the `placeholder`
  attribute for search/combobox inputs. Prompt-only nudge (no gate/code change).

- 2026-07-24: prompt.md — added "Write ALL code comments in English, regardless of the user's language" (LLM was drifting to Portuguese comments in some files).
- 2026-09-04: gate.ts — added `contract_not_demonstrated`. The showcase must use at
  least one property or event the group's usage skill documents, beyond the envelope
  the `indexGroupPage` mold itself hands over (`name`/`value`/`isEditing`/`@change`).
  Measured on a real NM2 run: a generated showcase carried 6 instances of a button
  group with ZERO `data-variant` — the property the usage skill calls "the only way to
  change how the button looks" — because the mold delivers a closed tag and never says
  a second layer exists. Detection lives in `shared/usageContract.ts`, shared with
  `n7-index` and `s3-indexts`: the three import the same mold, so they must not diverge
  on what counts as coverage. An empty or degraded usage skill never fails. The mold
  itself was fixed in the same pass (a gap for the contract layer plus a paragraph
  saying the two layers are additive, not alternatives). Control:
  todo/moleculetokens/todo-molde-vitrine-e-gate.md
