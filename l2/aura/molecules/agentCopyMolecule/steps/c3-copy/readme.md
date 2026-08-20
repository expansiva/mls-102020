# c3-copy

Deterministic. No LLM. The FIRST step that writes into `l2` — everything before it is admission
and decision.

## Input

- `context.json` (via `runKey`), already carrying the c2 answer (`skip`/`rename`);
- the origin sources, read from the stor at write time.

## Output

- `l2/molecules/<group>/<shortName>.ts` and `.defs.ts` per item;
- `trace-c3-copy-01.json` with what was written, what was skipped and the warnings;
- `c3-done`.

## Where each source comes from

| artifact | default | flattened shell |
|---|---|---|
| `.ts` | the molecule itself | the **parent** (that is where the real code and the i18n block live), under the SHELL's identity |
| `.defs.ts` | the molecule itself, `TagName` untouched | the shell's when it has one, else the **parent's** with `TagName` swapped |

The `.defs.ts` branch is not hypothetical: all 42 shells of `mls-102055` own a `.defs.ts`, while
`mls-102054` owns exactly 1 of 42 (measured 2026-08-19).

## Invariants

**The body is never rewritten.** Only the header `fileReference`, the inserted `copiedFrom` line
and — on the two paths that need it — the identity (tag + class). The gate compares the
`collab_i18n` block **byte for byte** between source and copy: a copy that "improves" the i18n
block on the way is worse than no copy at all.

**Identity is the shell's when flattening.** With the parent's identity the copy would shadow the
BASE molecule instead of the themed one the client uses — and the shell in the library would keep
winning. The gate fails on any leftover parent tag.

**Render and gate EVERY item before writing the first byte.** A batch that fails midway is the
half-state this pipeline refuses.

**Skipped items write nothing** — not the `.ts`, not the `.defs.ts`.

**`.test.ts` never travels** with the copy (control decision).

## Known traps

- a molecule with no readable `.defs.ts` anywhere (neither its own nor the parent's) is a WARNING,
  not a failure: the contract does not travel, the copy still does — and the summary says so;
- the origin can become unreadable between admission and copy (another sync, a deleted file):
  that is a readable failure, not a silent empty file.
