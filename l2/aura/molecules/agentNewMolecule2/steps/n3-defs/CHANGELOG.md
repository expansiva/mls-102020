# n3-defs — CHANGELOG

## 2026-07-29 — created (control item 3.5)

Gate covers 12 codes with 17 tests. Two of them exist because a test caught a hole in my own gate:

- **Content checks must run on the UNESCAPED skill literal.** `escapeSkillLiteral` turns a markdown
  code fence into `` \`\`\` ``, so the code detector — which looks for backticks — saw nothing. Added
  `unescapeSkillLiteral` to `shared/moleculeTemplates` (with a round-trip test) and split the two
  concerns: escaping is verified on the RAW literal, content on the unescaped markdown.
- **The code detector matches statement SHAPES, not bare words.** The first version anchored
  `/^\s*(import|export)\s/m`, which missed `- import { html } from 'lit';` inside a bullet; widening
  it to the bare word would have rejected legitimate prose like "must not export events to the
  parent". It now requires `import ... from` and `export const|function|class|default`, and both the
  rejection cases and the acceptance cases are tested.

Other decisions:

- The gate validates the **rendered file**, not the model's markdown: the file is what ships, and the
  skeleton the template produced deserves checking too (nothing validates the `.defs.ts` in the old
  flow — a missing section or an unescaped backtick ships silently).
- The `# Metadata` section is excluded from the code scan: the derived tag contains `--ml-`, which a
  CSS-token check would flag.
- `layoutConfig` must be present AND empty — a filled one means something wrote to it before the
  Design System process did.

## 2026-07-30 — layoutConfig carries the confirmed axes (decision D7)

`renderDefsTs` now receives `plan.layoutConfig` and emits it in the byte shape of the real files
(`{\n  metric: "big-number"\n}`; `{}` on one line for the 5 axis-less groups). The gate compares the
emitted object with `plan.json` and **re-runs the vocabulary gate on the file itself** — defence in
depth, because a hand-edited plan.json would otherwise ship an axis that `buildMoleculeCatalog` drops
with a `console.warn`, silently turning the molecule into a wildcard. Analysis:
todo/analise-layoutconfig-new-molecule-2.md.
