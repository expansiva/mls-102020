# n2-plan — CHANGELOG

## 2026-07-29 — created (control item 3.4)

Gate covers 12 codes with 15 tests. Decisions worth not undoing:

- **The model proposes a base NAME, not a path.** Code applies the `ml-` prefix, the theme suffix,
  the destination project and assembles the `fileReference` + tag. Asking the model for a full path
  is what made the old flow write files wherever its header said, and "the model forgot the theme
  suffix" would otherwise be a gate failure instead of a non-event.
- **The group folder IS honored on a human edit** (moving the molecule to another group is a
  legitimate checkpoint decision), while the project is always coerced. Caught by a test: the first
  version emitted the coercion message but kept the wrong project.
- **The gate runs twice** — on the proposal and on the confirmed data. The widget blocks missing
  descriptions and blank requirements, but it cannot know about collisions or unknown groups.
- **`plan.json` is written provisionally before the widget mounts**, so the widget rebuilds from
  disk rather than trusting the mounted payload (and a re-run shows the same data).
- **`requirement_question`**: a requirement ending in `?` means the model did not decide. Without
  this the question travels into the `.defs.ts` Responsibilities and out to whoever reads the
  contract.
- **Retry is bounded at 1** and follows the v3-less shape: the OPEN retry step is added first, then
  the current step completes with a trace — never 'failed' with a retry in flight.

## 2026-07-30 — layout axes at the checkpoint (decision D7 + D8 option (c))

The team shared `l2/aura/helpers/designSystemAuraBase.ts`, the canonical layout-axis vocabulary, which
**revised decision Q7b**: `layoutConfig = {}` is not neutral. `dsMatch/matchVariant` ANDs over the
declared axes, treats an omitted axis as a wildcard and breaks ties by specificity then ALPHABETICAL
catalog order — an empty bag makes the molecule the group's fallback pick, so a new `ml-a…` molecule
could start being assigned to pages before any review. And `buildMoleculeCatalog.sanitizeLayoutConfig`
drops an invalid axis with only a `console.warn`, so creation time is the only place a typo is catchable.

What this step now does:

- the **candidate axes** come from code (`nmCandidateAxes`), filtered by the group **case-insensitively**
  — `skills/index.ts` spells one group `groupEnterDateTimeInterval` while the vocabulary spells it
  `groupEnterDatetimeInterval`, and the `.defs` corpus carries both. An exact comparison would reject a
  legitimate declaration;
- the **model proposes** a value per axis inside the closed enum, on the requirements call;
- the **human confirms or changes it** in the checkpoint (option (c)): one `<select>` per axis,
  pre-filled, plus "any (wildcard)". Never free text — the widget cannot invent a value;
- the **gate validates** on both passes (proposal and confirmation) with 4 codes, each measured to have
  0 counterexamples across the 146 real `.defs.ts`: `axis_unknown`, `axis_value`,
  `axis_not_governing`, `axis_required`.

Two subtleties worth keeping:

- **page-wide axes (`density`, `motion`) are ALLOWED.** I first proposed rejecting them, reading the
  vocabulary's "never per element" as a ban. Measuring proved the opposite: `groupViewTable` uses
  `density` as a deliberate discriminator (`ml-data-table` = comfortable, `ml-data-table-minimal` =
  compact). That comment is about `plainControlRules`, which STAMPS rules per element; `matchVariant`,
  which SELECTS the molecule, is a different consumer.
- **declaring only a page-wide axis does not satisfy `axis_required`** — the molecule would stay a
  wildcard on the very axis that distinguishes it from its siblings.
