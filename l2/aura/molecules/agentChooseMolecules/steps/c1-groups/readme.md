# c1-groups

One LLM call (`reasoning`). Always runs — it is the first half of the funnel.

## Input

- the page definition, verbatim, from task memory (the human prompt);
- **level 1** of the catalog: `mod.skill` of `l2/molecules/skill.ts` in the ACTIVE project, ~1.5 KB.

It does **not** see the molecules of any group, and it does not see any usage contract. That is the
design being measured: one catalog level per prompt (`flow.json.principles`).

## Output

- `l4/agentChooseMolecules/<runKey>/c1-groups.json` — the regions with their group (or `null`) and reason;
- `l4/agentChooseMolecules/<runKey>/input.json` — the entry, written on the first attempt;
- `l4/agentChooseMolecules/<runKey>/prompt-c1-groups-NN.json` — the size of the prompt of attempt NN;
- result step `c1-done` with `{ groups, regionCount, grouplessCount }` — the root fans out from this, so
  it never has to open the artifact.

## The decision

Two questions, in order.

1. **What are the regions?** One interaction a single component could serve — a field, a list, a table,
   an attachment. A form is as many regions as it has fields; a header is not a region at all.
2. **Which published group serves each one, or none?** The group list is the only source of group
   names, and it is deliberately partial in the pilot (6 of 32).

The `need` line is the part that is easy to underrate: it is **all** the next call sees of the page. If
it does not say "long list, the user types to filter, only values from the list", nothing downstream can
tell `ml-combobox` from `ml-select-one-autocomplete` — and that tie is one of the things the pilot
measures.

## Invariants

**`none` is an answer.** Battery case #10 (an upload and a chart) is correct only if it comes back with
`group: null` on both regions. The gate accepts `none` and refuses an unpublished group, which is the
same rule from the other side.

**The gate never judges the choice.** Whether a plan comparison is `groupSelectOne` or `groupViewTable`
is exactly what the run is measuring; a gate with an opinion about it would measure itself.

**A case slip in a group name passes.** `groupselectone` for `groupSelectOne` is recorded in the
catalog's spelling and costs no retry. The TAG is the opposite case, in c2: there the exact spelling is
the thing being measured.

**Region names are the join key**, so they must be unique — the next call answers against them.

## Failure modes

Retry 1 with the gate errors in the prompt; a 2nd failure fails the step (with no regions there is
nothing to measure).

| code | means |
|---|---|
| `regions_empty` | no region at all — the message names the `none` way out |
| `region_missing` / `region_duplicated` | the join key is absent or ambiguous |
| `need_missing` | the line the next call depends on is empty |
| `reason_missing` | on `none` this was the whole answer the reader would have got |
| `group_unknown` | a group this project does not publish; the message lists the ones it does |

## Tests

`gate.test.ts` (10, pure). Two of them pin shapes the gate must keep **accepting** — a `none` group and
a lowercase group name — so a later tightening does not turn honesty or a spelling slip into a failure.
