# c4-less

Deterministic. No LLM — and that is the whole point of this step existing separately from the
Variant's `v3-less`, which spends an LLM call here.

## Why no LLM

The Variant generates a NEW stylesheet because the theme changes the appearance. A copy does not
change the appearance: same molecule, same look. So the sheet is copied verbatim, with the header
swapped. When the copy keeps the origin's name — the default — even the root selector is already
right, because **the root selector of a molecule sheet IS its tag**.

## Input / Output

- `context.json` + the `.less` of the molecule that was asked for;
- `l2/molecules/<group>/<shortName>.less` per item, `trace-c4-less-01.json`, `c4-done`.

## Invariants

**The sheet always comes from the molecule that was asked for.** For a shell that means the
SHELL's own sheet — it is the appearance the client chose. Taking the parent's sheet would undo
the theme and hand the client a molecule that looks like the base one. The gate checks it.

**Only a rename re-scopes.** Then the root selector is swapped to the new tag and the gate fails
on any leftover of the old one.

**Skipped items write nothing.**
