# i5-playground

Conditional LLM call (`code`). Routes B and C. **Most runs never call the model.**

## The decision, in code

The playground demonstrates the molecule's public surface, so it goes stale exactly when that
surface moves. `diffSurface(before, after)` compares the snapshot i1 took with what is on disk after
i3 wrote — slots, properties, events. A `.less`-only edit yields `changed: false`, and
`beforePromptStep` returns the done anchor without emitting a prompt at all.

That is why `context.json` keeps the *pre-edit* sources instead of being refreshed as the run goes:
it is the only record of what the molecule looked like before.

## Input / Output

- reads `context.json` and the current `.ts` and `.html` from disk
- writes the `.html` when it changed, plus `l4/…/playground.json`
- result step `i5-done` carrying `{ playgroundChanged, addedSlots }` — i6 depends on both.

## Invariants

**A no-op must write nothing.** Rewriting a page that was already correct produces a diff the user
has to review and claims work that was not needed. The gate refuses it.

**When the surface moved, the page must follow**, and every *added* slot must be exercised —
`slot="X"` or `<X>`, a mention in a comment does not count. This is the 2026-08-05 defect as a check.

**The delta rule.** A slot the page never exercised is pre-existing debt: i7 reports it, this gate
does not block on it.

**Edits, not a rewrite** — the same mechanism as i3, so the examples someone wrote survive. Nothing
is written until the gate passes, so a rejected attempt leaves the page exactly as it was.

## Tests

`gate.test.ts` (11). The pair that carries the design is "a no-op run that REWROTE the page is
refused" and "THE DELTA RULE: a slot the page NEVER exercised does not block".
