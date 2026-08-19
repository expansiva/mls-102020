# c2-molecules

One LLM call (`reasoning`) **per group**, planted by the root once c1 has answered.

## Input

- **level 2** of ONE group: `mod.skill` of its `index.defs.ts` (2–6 KB), which carries the molecule list
  with the layout axes, the quick-reference scenarios and how to choose between siblings;
- the regions c1 assigned to that group — name + `need` line, nothing else about the page.

The group's **usage contract** is referenced by level 2 and deliberately not read: this probe chooses,
it does not write markup.

## Output

- `l4/agentChooseMolecules/<runKey>/c2-<groupfolder>.json` — the choices, `ok`, the gate history and any
  molecule chosen while marked as outside the contract;
- `prompt-c2-<groupfolder>-NN.json` and `trace-c2-<groupfolder>-NN.json` per attempt;
- result step `c2-<groupfolder>-done` — **planted even when the gate never accepted an answer**, so the
  report always runs.

## The decision

1. does a row of the quick-reference table match the need? Start from what it recommends;
2. break the tie by the descriptions — what the need insists on is usually the exact axis that separates
   two siblings;
3. cite the row in `scenarioUsed`, or `none`.

## Invariants

**The tag comes from the catalog or nowhere.** The gate compares against `mod.molecules[].tag` of this
group, in full, prefix included. Three codes separate the ways it can be wrong, because the acceptance
criterion is about one of them:

| code | means | counts as |
|---|---|---|
| `tag_invented` | no such molecule in any spelling | **the criterion: must stay at zero** |
| `tag_short` | the molecule exists, the `<group>--` prefix was dropped | a copy failure |
| `tag_case` | the molecule exists, the case is wrong | a slip |

**The short name is refused, never completed by code.** Completing it would hide whether the catalog
teaches the tag properly, which is part of what the pilot measures (`flow.json.decisions.tagSpelling`).

**`tag: none` is a legal answer** and has two correct uses: the need belongs to another group — the
numeric RANGE of `groupEnterNumber`'s own table is exactly this case, since the molecule it recommends
lives in `groupEnterNumberInterval` — or nothing in this group matches what the need insists on.

**A molecule marked as outside the contract can be chosen** (`ml-table-multi-select` has no `.defs.ts`),
and the artifact records that it was. The prompt asks for the caveat in the reason; the gate does not
police the wording of a reason.

**The example tag in the prompt is substituted from this group's own list.** A hand-written example
would be teaching the very mistake the gate refuses — and `chPrompts.test.ts` fails if a tag ever
appears in a prompt file.

**This step never fails the run.** Two refusals record `ok: false` and complete. "The model insisted on
a tag that does not exist" is a result of the probe, not a crash.

## Failure modes

| code | means |
|---|---|
| `choices_empty` | nothing returned; omission is not how a region is declined |
| `region_unknown` / `region_unanswered` / `region_duplicated` | the join with c1 does not close |
| `group_mismatch` | a choice belonging to another group's call |
| `scenario_unknown` | a scenario that is not a row of this group's table |
| `reason_missing` | on `none` it was the whole answer |
| `tag_invented` / `tag_short` / `tag_case` | the table above |

## Tests

`gate.test.ts` (13, pure), with one test per tag failure mode and one pinning that a scenario cited in
another case is accepted.
