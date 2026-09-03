# s2-project

Writes `l2/molecules/skill.ts` (level 1) from every group `s1` wrote in this run. No LLM.

## Ordering

`dependsOn` every `s1-<group>-done` anchor of the run — it never starts before all of them finish
(`flow.json` → principles, "group → project, never in parallel"). Reads each group's
`l4/agentSyncMoleculeCatalog/<runKey>/s1-<group>.json`, never a group's `index.defs.ts` source text — one
source of truth per value, so this step and `syRenderDefs` can never disagree about what a group
contains.

Groups render **alphabetical by folder**, both in the `groups[]` array and in the markdown sections — see
`flow.json` → `decisions.groupOrder` for why (two other hypotheses were tried and falsified by E5).

## What it writes

- `l2/molecules/skill.ts`;
- `l4/agentSyncMoleculeCatalog/<runKey>/s2-project.json` (`SyProjectArtifact`) — read back by `s4`.

A group whose `s1` step left no artifact (crashed, or was skipped) is named in the step's own trace but
does not fail the whole run — the skill.ts still reflects every group that DID succeed.
