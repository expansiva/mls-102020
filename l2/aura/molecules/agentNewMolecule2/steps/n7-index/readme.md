# n7-index

Regenerates the group's showcase page: `index.ts` (LLM, reusing the `indexGroupPage` skill) and
`index.html` (deterministic — just the group index element).

## Decision D5: the skill is reused IN this step

No other agent is invoked. `agentUpdateIndexGroupPage` fans out (lesson P4), and the Variant's
`v4-index` already showed that reusing the skill in-step is the calmer path.

The molecule list comes from a stor scan of `molecules/<group>` in the destination project, excluding
`index`, `.defs` companions and `.test` files. The molecule created earlier in this pipeline is already
in the stor, and is appended defensively in case the scan misses it.

## Gate (`gate.ts`) — 8 codes, 8 tests

Structural essentials only, not byte shape:

| code | when |
|---|---|
| `empty` / `fence` | nothing came back, or markdown fences |
| `header` | the header does not reference this group's `index.ts` |
| `custom_element` | missing `@customElement('molecules--<group>--index-<project>')` |
| `molecule_import` / `molecule_tag` | the molecule created in this run is not imported / not shown |
| `molecule_missing` | another molecule of the group is absent from the showcase — it would be invisible to whoever browses the library |
| `background` | themed project whose showcase container lacks the theme background |

## It never blocks the pipeline

After a failed retry the step still emits `n7-done` with `ok:false`, and `n8-summary` reports that the
showcase was not updated. The page is a convenience; the molecule is the deliverable.
