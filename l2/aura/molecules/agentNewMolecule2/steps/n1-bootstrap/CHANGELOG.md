# n1-bootstrap — CHANGELOG

## 2026-08-25 — the trace now records WHICH contract the runtime served

The step already PROBED the creation skill to fail fast. It probed it, and then threw the answer away:
the trace said `themePresent` and a summary, and nothing about the contract. So when a run produced a
wrong molecule there was no way, afterwards, to tell whether the contract in the runtime was the
published one — and the contracts are loaded with `await import`, which serves the MODULE, not the
`.ts` on disk. Editing the source without publishing changes nothing, silently.

Two additions:

- `probeSkill` now returns a **fingerprint** of the text it loaded — `chars` and an FNV-1a hash
  (`shared/contractFingerprint.ts`). The same function runs in node, so the pair computed over a
  working copy compares to the pair in a trace by string equality.
- the **usage** contract is probed too, and both go to the trace under `contracts`. It is
  deliberately NOT gated: `n6-demo` and `n7-index` are the steps that read the usage, they run much
  later, and a run that only fails there is worth finishing. Recording it here is what makes that
  failure diagnosable instead of guessing which text the playground came from.

Measured on 2026-08-25: two runs of the same prompt produced molecules that differed on a rule the
contract does not state, and reconstructing which contract each had seen took reading the generated
code. That is the cost this entry removes.


## 2026-07-29 — created (control item 3.3)

Written together with the root (`agentNewMolecule2.ts`). Gate covers 9 codes with 13 tests.

Decisions worth not undoing:

- **A missing theme is not an error.** `loadVTheme` reports absence as an error because the Variant
  requires a theme; here existence is checked FIRST (`nmThemeExists`) so absence (neutral molecule,
  the old flow's behaviour — acceptance 3.11) stays apart from invalidity (fatal).
- **`theme_suffix`**: a valid theme that declares no suffix fails. Without one the themed molecule
  cannot be named apart from the neutral one, and the name is what the human confirms at the
  checkpoint (Q2).
- **`group_folder` requires lowercase.** The tag is derived by kebab-casing the folder, so
  `molecules/groupEnterText` would yield `group-enter-text--ml-x` — a tag that matches no molecule
  in the library. The behaviour is pinned by a test in `shared/moleculeTemplates.test.ts`.
- **The creation skill is probed, not stored.** `context.json` keeps the reference; each step
  imports the skill itself. Storing the text would bloat the artifact for no gain.
- **`checkNmGroupChoice` is shared with the root**, which calls it right after the classification.
  Failing at the root costs nothing; failing at n1 wastes an LLM call, and failing at n3 wastes two.
