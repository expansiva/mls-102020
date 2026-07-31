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

## 2026-07-30 — the .defs.ts is written with the canonical stor spelling (first-run bug)

Caught on the first real Studio run: the generated `.defs.ts` was unreachable from the editor's defs
tab. `nmDefsFile` was building `shortName + '.defs'` with extension `'.ts'` instead of the plain
shortName with extension `'.defs.ts'`.

The stor key is plain concatenation (`getKeyToFile`: `<project>_<level>_<folder>/<shortName><extension>`),
so both spellings produce the SAME key — which is why the gate passed, n4-render read the file back and
n8-summary reported the right path. What differs is the stored `IFileInfo`:

- `libModel.createModel` files the model by `mapExt[extension]` under `getKeyModel(..., shortName, ...)`,
  so the model landed in a phantom `<name>.defs` group in the **`ts`** slot. `serviceSource`'s defs tab
  looks up `getModels(project, '<name>', folder).defs`, finds `undefined` and returns silently — dead
  tab, no console error, and it never recreates the file because the key already exists.
- everything filtering `extension === '.defs.ts'` skipped it: `serviceSource.tabConfig`, `libMindMap`,
  and the `deleteAllFiles`/`renameAllFiles`/`cloneAllFiles` loops (an orphan defs on rename/delete).
- extension `'.ts'` also bypassed the `.defs.ts` guard in `libCommom.getInstanceByFile` and sent the
  contract through the TypeScript compile path as if it were a component.

Fixed in `helpers/nmFs.ts` — same spelling every other agent uses (Variant `v2-shell`, New Solution,
Implement Genome). No test asserted the old spelling; `toDisplayPath` is byte-identical either way.
The now-dead `!shortName.endsWith('.defs')` guard in `n7-index`'s `scanGroupMolecules` was left in
place (harmless: correctly-keyed defs no longer pass its `extension === '.ts'` filter).

Trap for anyone repairing an already-generated molecule: `deleteFile` only hard-deletes while the file
is `status: 'new'`. After a save/publish it soft-deletes, leaving the entry in `mls.stor.files` with the
WRONG `shortName`/`extension` — and `writeStorTextAtomic`'s resurrection branch would revive it with
those fields intact, reproducing the bug under the same molecule name.

## 2026-07-30 — o `.defs.ts` passou a compilar (A5b)

Era escrito às cegas. É arquivo TypeScript, e seu modo de falha conhecido — backtick ou `${` sem
escape dentro do literal do skill — era checado só textualmente. Agora escreve primeiro, chama
`compileStorTs` e os erros do compilador entram no gate como código `compile`. Uma tentativa
reprovada deixa o conteúdo em disco para o retry ler, a mesma troca que o n4-render já fazia.
