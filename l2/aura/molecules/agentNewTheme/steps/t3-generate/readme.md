# t3-generate

THE generation LLM call — and the only writer in the pipeline.

Input: the `themeAuthoring` meta-skill (imported, not a file reference) + the user's
description (task memory) + `plan.known` + the checkpoint answers.
Output on a GREEN gate: `l4/agentNewTheme/draft.json` (`{ themeTs, summary }`),
`l2/skills/theme.ts` + `l2/skills/theme.html`, the `.ts` compiled best-effort
(`mls.l2.typescript.compileAndPostProcess` — the molecule agents import the compiled
`theme.js`), and the terminal `t3-done` anchor carrying `{ theme, files[], compiled }`.
A gate that stays red writes nothing.

`openStepView` mounts the shared Theme Confirmation widget in `readonly` mode from
`draft.json`, so the palette and signature stay inspectable in the chat. It is a VIEW,
not a gate — adjust A1 (2026-07-27) removed the confirmation checkpoint.

The draft is kept after the write on purpose: the structured summary is not
deterministically recoverable from `theme.ts`, and it feeds `theme.html`, that step view
and a future Improve Theme.

Gate (`gate.ts`, pure): the generated file is a SOURCE STRING that is not on disk yet, so
the gate reads the three exports statically (`parseThemeSource`, no eval) and hands the
reconstructed module to the SHARED `vThemeContract.validateVThemeModule` — the same
validator the molecule agents use when they READ a theme. On top of the contract it
checks: one mls header pointing at the destination file, no `import` (self-contained data
module), `suffix === '-' + name`, `examples` empty, no markdown fences, and summary
consistency (name/background identical to `themeInfo`, palette tokens `--ml-*` and
declared in the "## 2. Tokens" table).

Retry ≤ 1 with the gate errors in context; a 2nd failure fails the step with a readable
trace and nothing is written (the first attempt never wrote, so there is nothing to undo).

Known LLM traps: markdown fences around the file; a header copied from a reference theme
(wrong project); TypeScript casts/annotations that break the static read; unescaped
backticks inside the `skill` template literal; palette colors as `var(--ml-x)` instead of
a paintable CSS color; pre-filling `examples`.
