# n3-defs

Writes the `.defs.ts` — the spec every later step reads, and the file other collab routines read to
know what the component does.

## The boundary

| written by the template | written by the model |
|---|---|
| the mls header | the five-section markdown |
| `// Do not change – automatically generated code.` | |
| `export const group = '<canonical>';` | |
| `export const layoutConfig` with the confirmed axes | |
| the escaped `skill` literal | |
| the `- TagName:` line (swapped for the derived tag) | |

`layoutConfig` carries the axes confirmed at the checkpoint (decision D7). The gate checks the file
matches `plan.json` EXACTLY and **re-runs the vocabulary validation on the emitted file**, so a
hand-edited plan cannot ship an axis the DS catalog would silently drop. The Design System process
still owns the field afterwards (it updates the variable when it exists), and Improve must preserve it
(Q7c).

The **escaping is mandatory**: a backtick or `${` in the markdown breaks the template literal and the
file does not compile. `escapeSkillLiteral` handles it and the gate verifies it happened — nothing in
the old flow did either.

## Gate (`gate.ts`) — 12 codes, 17 tests

It validates the **rendered file**, not the raw markdown, because the file is what ships.

| code | when |
|---|---|
| `empty` | nothing came back |
| `header` | the first line is not the deterministic header for this file |
| `group` | missing or wrong `export const group = '<canonical>';` |
| `layout_config` | `layoutConfig` missing, or not exactly the axes confirmed at the checkpoint |
| `axis_*` | the vocabulary re-check on the emitted file (unknown axis, value outside the enum, axis that does not govern the group, no governing axis declared) |
| `skill_literal` | no `export const skill = \`...\`;` |
| `skill_escaping` | an unescaped backtick or `${` — the file would not compile |
| `section_missing` / `section_order` / `section_empty` | the five sections, present, ordered, non-empty |
| `tagname` | the `- TagName:` line is absent or not the derived tag |
| `implementation_detail` | code in the contract (fence, import/export statement, decorator, class declaration, CSS token, class attribute, Lit construct) |
| `requirement_question` | a bullet phrased as a question would carry the question into the contract |

Two subtleties the tests pin down:

1. **Content checks run on the UNESCAPED literal.** A markdown code fence survives escaping as
   `` \`\`\` `` and slipped straight past the code detector until the test caught it.
2. **The detector matches statement SHAPES, not words.** "Must not export events to the parent" is
   legitimate contract prose; `export const` is not. An earlier word-level version rejected the
   first, so both cases are now tested.

The `# Metadata` section is excluded from the code scan: the tag itself contains `--ml-`.

## Artifacts

- `l2/molecules/<group>/<name>.defs.ts`
- `trace-n3-defs-<attempt>.json`
- the `n3-done` anchor, titled with the written path

Retry ≤ 1 with the gate errors in context; a second failure fails the step.
