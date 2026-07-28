# agentNewTheme — spec

> Human-readable rationale. The machine contract is `flow.json` (authoritative).
> Analysis: `todo/analise-agent-new-theme.md`. Control/checklist: `todo/todo-agent-new-theme.md`.
> Contract v1 validator: `l2/aura/molecules/shared/vThemeContract.ts`.
> Authoring guidance injected at generation: `l2/aura/molecules/skills/themeAuthoring`.

## Purpose

Generate, from scratch, the current project's theme file `l2/skills/theme.ts`
(contract v1) via an LLM guided by the shared `themeAuthoring` meta-skill, with a single
human checkpoint. It removes the manual step of copying a `theme.ts` between projects.

Downstream, the molecule agents (New Molecule / New Molecule Variant / Improve Molecule)
read `theme.ts` and style each molecule's `.less` from its tokens and canonical rules.
This agent is UPSTREAM: it prepares the theme; it does not touch molecules.

## Scope (v1)

- IN: generate a NEW theme from a natural-language description + clarification answers.
- OUT (backlog, see control Fase 8): cloning an existing theme, improving an existing
  theme, image/upload input, multi-theme per project, a confirmation/preview checkpoint
  before writing (plus an adjust loop), smoke-molecule preview, a force/rebuild overwrite.

## Flow (see flow.json for the authoritative detail)

```
root (@@agentNewTheme { prompt })
  └─ t1-plan (codefast)         admission + userLanguage + known fields + missing questions
       ├─ [if questions] t2-clarify  THE CHECKPOINT — collect the missing fields
       └─ t3-generate (design)  themeAuthoring + prompt + answers → theme.ts + theme.html
                                (written + compiled as soon as the contract gate is green)
```

- **t1-plan** parses the initial prompt into the fields it can already determine
  (`known`) and asks ONLY for what is missing. If nothing is missing, the checkpoint is
  skipped (fast path). Admission fails readably (before any LLM call) if the project
  already has a `theme.ts`. It is the ROOT's own cheap call — `agentNewTheme.ts` owns the
  hooks; `steps/t1-plan/` owns the prompt and the gate.
- **t2-clarify (the checkpoint)** emits a clarification into its own payload; the shared
  Decision Clarification widget renders the dynamic questions (options + recommended
  defaults + free text). Localized to `userLanguage`. Closed fields (the enums) come as
  options; open ones (name, colors, background CSS) are typed. Cancelling stops the
  pipeline with nothing written.
- **t3-generate** injects the `themeAuthoring` meta-skill + the prompt + answers and
  produces the `theme.ts` (contract v1, English comments) plus a structured summary
  (`{ name, displayName, background, palette[], signature[] }`). The gate reads the
  generated SOURCE statically (no eval) and validates the reconstructed module with
  `vThemeContract.validateVThemeModule` (+ header, no imports, suffix, empty examples,
  summary consistency), retry ≤ 1. On a GREEN gate it writes `theme.ts` and a
  deterministic `theme.html` (rendered from the same summary) to `l2/skills` and compiles
  the `.ts` best-effort, so the molecule agents can import the theme immediately. A gate
  that stays red writes nothing and ends the pipeline there. `openStepView` shows the
  palette/signature read-only (shared Theme Confirmation widget in `readonly` mode).

## Key design decisions (why)

- **Generate, not clone.** A client wants their own look; cloning is a separate future
  mode. The value is authoring a valid contract-v1 theme without hand-editing a file.
- **One checkpoint** (adjust A1, 2026-07-27). It minimizes friction by asking only the
  gaps, with suggested options. The final confirmation screen was dropped: the human
  decides BEFORE generation and the deterministic contract gate decides after it, which
  is what actually protects the project. Trade-off accepted: a theme the user dislikes is
  already on disk, and regenerating means deleting the file (admission stays strict).
- **Nothing on disk until the gate is green.** A generation that fails the contract gate
  twice — or a cancelled checkpoint — leaves the project untouched.
- **Quality via the meta-skill.** The `themeAuthoring` skill encodes the authoring rules
  distilled from the Variant acceptance tests (P3–P10: geometry is the render's; overlays
  opaque; primitives not glassified; comments in English; etc.), so generated themes avoid
  those defects.
- **Shared contract validator.** `vThemeContract` is the single source of truth used both
  to WRITE (this agent's gate) and to READ (agentNewMoleculeVariant's admission).
- **i18n split.** Questions/labels follow `userLanguage`; the `theme.ts` content is
  always English.
- **Prose in, not arguments.** The description is natural language, so the mention accepts
  it raw (`@@agentNewTheme a soft neumorphic theme…`); `{ prompt: '…' }` still works. The
  platform's `safeParseArgs` throws on prose, so it is called only on an object literal —
  parsing is isolated in `helpers/ntEntry` (pure, tested) because entry-format bugs have
  bitten this agent family three times.
- **Every prompt declares its modelType.** `<!-- modelType: X -->` on the first line,
  chosen from `skills/modelTypes.md`; without it the platform falls back to a cost-based
  selection and the call 404s.

## Artifacts

- Output (on a green gate): `_<dest>_/l2/skills/theme.ts` + `_<dest>_/l2/skills/theme.html`.
- Work (l4): `l4/agentNewTheme/plan.json` (t1), `answers.json` (t2), `draft.json` (t3 —
  kept after the write: the structured summary is not recoverable from `theme.ts`),
  `trace-<step>-<attempt>.json`.
- Shared: `l2/aura/molecules/shared/vThemeContract.ts`, `.../shared/widgetDecisionClarification.*`
  (the checkpoint), `.../shared/widgetThemeConfirmation.*` (read-only step view).

## The `theme.html` artifact

A deterministic doc/preview page rendered from the structured summary (palette swatches
+ tokens + signature + a few sample surfaces). It is NOT part of the contract the molecule
agents consume (they read only `theme.ts`) — it is documentation and the intended entry
point for a future Improve Theme. Whether the Studio preview can render it and attach a
mention is unverified (analysis §6.2); the guaranteed Improve Theme trigger is a mention.
