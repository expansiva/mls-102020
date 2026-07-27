# t4-confirm — CHECKPOINT 2

The ONLY step that writes to disk. Same checkpoint mechanics as t2-clarify (clarification
emitted into this step's own payload; `afterPromptStep` returns `[]`; the widget is mounted
by `beforeClarificationStep`).

Input: `l4/agentNewTheme/draft.json`.
Widget: shared `widget-theme-confirmation-102020` — the palette swatches and the layout
signature rendered over the theme's own background.

- **Confirm & create** → writes `l2/skills/theme.ts` (verbatim draft) and `l2/skills/theme.html`
  (deterministic renderer, `helpers/ntThemeHtml.ts`, built from the SAME summary the user
  just approved), then compiles the `.ts` best-effort so the molecule agents can
  `import('/_<dest>_/l2/skills/theme.js')` right away. Emits the `t4-done` result with the
  written paths and the compile outcome.
- **Exit** → nothing is written; the draft stays in l4 as a record and the step completes
  with a "discarded" trace.

No adjust/iterate loop in v1 (control Fase 8): re-running the agent regenerates from scratch.
