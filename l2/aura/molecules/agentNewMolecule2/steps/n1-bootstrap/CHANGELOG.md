# n1-bootstrap — CHANGELOG

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
