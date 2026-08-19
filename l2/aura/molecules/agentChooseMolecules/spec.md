# agentChooseMolecules — spec

**Status: experimental probe.** It exists to measure whether the molecule catalog is good enough for
an LLM to choose from. It answers a question about the CATALOG, not about a page — which is why it
writes no page.

Design record: this file + `flow.json` + the per-step `CHANGELOG.md`, and nothing else — the analysis that
produced it (§10 the three-level design, §11 this pilot) and the battery it is scored against live on the
author's machine, so whatever a maintainer needs in order to change this agent is restated here.

## The three levels it walks

| level | file | what it answers | who reads it |
|---|---|---|---|
| 1 | `l2/molecules/skill.ts` of the active project | which GROUPS exist | c1-groups |
| 2 | `l2/molecules/<group>/index.defs.ts` | which MOLECULES the group has, with scenarios | c2-molecules |
| 3 | the group's `usage.ts` in 102020 | how to write the markup | **nobody, in this probe** |

Level 3 is referenced by level 2 (`usageContract`) and deliberately never read here: this probe
chooses, it does not compose. Reading it would also make the prompt-size measurement meaningless.

## The funnel, and why it is a funnel

Two calls instead of one, because the whole catalog does not fit a prompt and should not have to.
Level 1 is ~1.5 KB; a single level 2 is 2–6 KB; all 32 groups would be ~90 KB. The precedent that
settles it is `i3-edit`, which the 58 KB prompt brought down (`analise-skill-molecules.md` §2).

So: **one level per prompt, one group per c2 call.** A c2 that received two groups would be cheaper in
step count and would stop measuring what the design claims.

## What it measures

Every run leaves `l4/agentChooseMolecules/<runKey>/run.json` with:

- the regions c1 found, and the group it gave each one (or `null`);
- the molecule c2 chose per region, the quick-reference scenario it used, and its reasoning;
- **the size of every prompt assembled**, split into instructions / catalog / input, in chars and in
  estimated tokens (4 chars/token). There is no token telemetry on this platform — nothing in the step
  contract carries provider usage — so the estimate IS the metric, approved as such on 2026-08-19;
- **how many times the anti-invention gate fired.** A run where the gate fired twice and the second
  attempt was right is not the same as a run that was right the first time, and the file says which.

Scoring against the battery's expected answers is **manual**, by design: an agent that knew the
gabarito would be measuring itself.

## Invariants

1. **Never a tag from outside the catalog.** The gate compares against `mod.molecules[].tag` of the
   group being answered. The published tag carries the group prefix (`groupselectone--ml-card-selector`)
   and must be copied in full — a bare `ml-card-selector` is refused, not completed.
2. **Never a group outside level 1.** The pilot's level 1 lists 6 of the 32 groups on purpose: a page
   asking for an upload or a chart must get `null`, not a plausible neighbour.
3. **`null` is a legal answer at both levels**, with a reason. `group: null` when no published group
   covers the region; `tag: null` when no molecule of the chosen group serves it — which is the honest
   answer for a numeric RANGE, whose molecule lives in `groupEnterNumberInterval`, outside the pilot.
4. **Nothing outside l4 is written.** No molecule, no contract, no index, no page.
5. **The report spends no LLM call.** It aggregates and renders.

## Known catalog quirks the prompts must survive

Recorded in the control (§5) at seeding time, and left uncorrected on purpose — the pilot measures
whether they hurt:

- `ml-table-multi-select` has no `.defs.ts`: it appears in the catalog marked
  `⚠ fora de contrato`, with `defs: null`. Choosing it is legal; hiding the limitation is not.
- The `groupEnterNumber` scenarios table recommends `ml-number-range-slider`, which belongs to
  another group. The seeded catalog left those rows without a local recommendation and says so.
- One `# Objective` is in Portuguese (`ml-floating-number-input`) while the rest are in English.
- `ml-combobox` and `ml-select-one-autocomplete` are indistinguishable across all three existing
  sources. If the probe misses case #4 consistently, the registered fallback is a contrastive
  sentence in the source objectives — never a new keywords field.

## How to run the battery

Six preconditions are already met (102020 published, the seeded catalog uploaded as the active
project). For each of the 10 definitions in the control's §3:

```
@@agentChooseMolecules <the definition, verbatim>
```

Then read `run.json` and fill in the score by hand. Cases #4 and #5 run three times each — LLM
content failures are intermittent, and one roll proves nothing about a tie.
