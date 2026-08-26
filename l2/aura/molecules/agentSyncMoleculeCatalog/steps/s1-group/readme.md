# s1-group

For ONE group: writes `index.defs.ts` (level 2) + `index.html`. No LLM.

## What it reads

- every `ml-*.ts` under `molecules/<group>/` (excluding `index.ts`) — for the real `@customElement` tag;
- the matching `ml-*.defs.ts`, when it exists — for the complete `# Objective` and `layoutConfig`;
- the group's OWN `index.defs.ts`, if one already exists — to preserve any scenarios already there;
- the group's OWN `index.ts`, if it exists and the step above found nothing to preserve — to harvest
  scenarios from its hand-authored `renderReferenceTable()`.

## What it writes

- `l2/molecules/<group>/index.defs.ts`, `l2/molecules/<group>/index.html`;
- `l4/agentSyncMoleculeCatalog/<runKey>/s1-<group>.json` (`SyGroupArtifact`) — what `s2` and `s4` read
  back, so neither has to re-parse level 2 source text.

## The three gates this step satisfies by construction

1. **No invented tag** — the tag is read from `@customElement`, never derived otherwise.
2. **No molecule disappears** — a `.ts` with no matching `.defs.ts` still gets an entry (`defs: null`)
   and a `⚠ fora de contrato` markdown line.
3. **Layout axes**: only the ones that VARY across this group's siblings are published, and only for the
   molecules that themselves define them — `helpers/syExtract.syVaryingAxes` / `syPublishedLayout`.

See `flow.json` → `decisions.scenarioHarvest` for the harvest algorithm and why it lives HERE and not in
the (not yet built) `s3`.
