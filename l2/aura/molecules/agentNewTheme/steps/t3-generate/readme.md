# t3-generate

THE generation LLM call: the complete `theme.ts` (contract v1) + a structured summary.

Input: the `themeAuthoring` meta-skill (imported, not a file reference) + the user's
description (task memory) + `plan.known` + the Checkpoint 1 answers.
Output: `l4/agentNewTheme/draft.json` (`{ themeTs, summary }`) + the `t3-done` anchor.
It writes NOTHING to `l2/skills` — only Checkpoint 2 writes.

Gate (`gate.ts`, pure): the generated file is a SOURCE STRING that is not on disk yet, so
the gate reads the three exports statically (`parseThemeSource`, no eval) and hands the
reconstructed module to the SHARED `vThemeContract.validateVThemeModule` — the same
validator the molecule agents use when they READ a theme. On top of the contract it
checks: one mls header pointing at the destination file, no `import` (self-contained data
module), `suffix === '-' + name`, `examples` empty, no markdown fences, and summary
consistency (name/background identical to `themeInfo`, palette tokens `--ml-*` and
declared in the "## 2. Tokens" table).

Retry ≤ 1 with the gate errors in context; a 2nd failure fails the step (readable trace)
and `t4-confirm` never unlocks — nothing is written.

Known LLM traps: markdown fences around the file; a header copied from a reference theme
(wrong project); TypeScript casts/annotations that break the static read; unescaped
backticks inside the `skill` template literal; palette colors as `var(--ml-x)` instead of
a paintable CSS color; pre-filling `examples`.
