# c5-demo

Deterministic. No LLM. **The only non-blocking step of the pipeline.**

The molecule's sibling `.html` IS its demo page. It carries no mls header — 0 of 153 molecule
`.html` files have one (measured 2026-08-19) — so on the default path this is a byte-for-byte
copy, with nothing to swap.

## Input / Output

- `context.json` + the origin `.html`;
- `l2/molecules/<group>/<shortName>.html` per item, `trace-c5-demo-01.json`, and `c5-done`
  **with `ok: false` when something failed**.

## Why it never blocks

A molecule without its demo page is usable; a pipeline that dies at the demo is not. So a failure
here is per-item: that item's demo is skipped, the others still get theirs, and the anchor lands
either way with the issues inside. c6 reads it and reports.

This is also why the anchor is emitted on the failure path: a step that neither writes nor anchors
is how a run goes green and hangs (`agentImproveMolecule2/steps/i4-inherit`, 2026-08-10).

## Invariants

- a rename substitutes EVERY occurrence of the tag (24 in the sample measured), and the gate fails
  on any leftover;
- a copied demo must NOT gain an mls header — if one shows up, someone re-introduced a header
  swap that does not belong here;
- skipped items write nothing.
