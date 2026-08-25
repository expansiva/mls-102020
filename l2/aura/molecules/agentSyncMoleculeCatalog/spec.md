# agentSyncMoleculeCatalog — spec

Generates the molecule catalog an LLM consumer reads to choose components — `l2/molecules/skill.ts`
(level 1, the project's group list) and, per group, `index.defs.ts` + `index.html` (level 2, the group's
molecule list). Design record: this file + `flow.json` + the per-step `CHANGELOG.md`, and nothing else.

## The three levels, and which two this agent writes

| level | file | derivable? | who writes it |
|---|---|---|---|
| 1 | `l2/molecules/skill.ts` | ✅ from level 2 | **this agent, s2** |
| 2 | `l2/molecules/<group>/index.defs.ts` | ✅ from the molecule `.ts`/`.defs.ts` files | **this agent, s1** |
| 3 | `skills/<group>/usage.ts` | ❌ manual, editorial | nobody (decision of 2026-08-17) |
| — | `l2/molecules/<group>/index.ts` (the showcase page) | ❌ authored Lit | nobody yet (s3, out of scope) |

Level 3 is referenced by level 2 (`usageContract`) and never read or written here.

## Why the default path costs nothing

Every value this agent writes is 100% derivable from files already in the project:

- the **tag** is the real `@customElement(...)` of the molecule's own `.ts` — never the filename;
- the **description** is the molecule's `# Objective`, read complete, never truncated;
- the **layout axes** published are only the ones that VARY between a group's siblings;
- the **group list** and **molecule count** come from the freshly-written `index.defs.ts` of the run.

None of that needs an LLM, and the pilot (`agentChooseMolecules`, 23 runs) already proved an LLM can
choose correctly from exactly this shape of catalog. So the root plants its whole step tree — one `s1`
per group, `s2`, `s4` — in a single deterministic batch, and the ONLY thing resembling an "LLM call" is
the root's own bootstrap step, which uses `AgentIntentAddMessageAI.skipRootLLM` (the mechanism
`agentChangeFrontend` already ships with) purely so the platform has a step to hang the tree from. It
never reaches a model.

## The one field that is NOT derived: scenarios

The "quick reference" table (scenario → recommended molecules) is editorial, not derivable — it is a
human's judgment about which molecule fits which use case. Three sources, checked in order, per group,
inside `s1`:

1. **Already in this group's `index.defs.ts`** from a previous sync → preserved untouched. This is what
   makes the agent a *sync*, not a *generate*: re-running it never clobbers a hand edit.
2. **Harvested from the group's CURRENT `index.ts`**, the first time it is synced — its hand-authored
   `renderReferenceTable()` already has this table, just as Lit code instead of data. Reading it is a
   data extraction, not composition, so it stays inside the deterministic `s1`, never the (not yet built)
   LLM step.
3. **Empty**, for a brand-new group with no `index.ts` at all yet.

### The harvest has to match FREE, ABBREVIATED field names

A showcase page's boolean row fields are not a mechanical transform of the tag — `groupViewTable`'s table
uses `advanced`, `data`, `detailGrid`, not `advancedDataTable`, `dataTable`, `lcrudDetailGrid`. The
matcher (`helpers/syExtract.ts`) works by TOKEN SET, not string similarity:

1. an **exact** token-set match wins outright (`grouping` == the one molecule whose tokens are exactly
   `{grouping}`);
2. failing that, among molecules whose tokens are a **superset** of the field's, the **unique smallest**
   one wins — bare `data` is a subset of five `*-data-*` molecules, but `ml-data-table` alone adds no
   token beyond what the field named, so it is the specific match;
3. a genuine tie is left **unmatched**, never guessed — the same honesty-over-invention rule that runs
   through this whole family.

## Order: two guesses, both falsified, one that works

The seeded `skill.ts` was assumed to follow `skills/index.ts`'s own order — 4 of the 6 pilot groups fit
that pattern. **E5's regeneration falsified it**: the seed lists `groupViewTable` before `groupEnterDate`,
the *opposite* of their `skills/index.ts` order. There is no rule to reverse-engineer here; the seed's
order looks like an artifact of the pilot's own ad-hoc seeding, not a property to reproduce. This agent
orders groups **alphabetically by folder** — simple, deterministic, and it reproduces every other
structural property of the seed exactly (see `flow.json` → `decisions.groupOrder`).

## Purpose text: full, not truncated

The seed's `groupEnterNumber` shows `Objetivo do grupo: Allows the user to input numeric values. Ideal
for quantities, measurements, percentages, ages, weights, and numeric configurations.` — two sentences,
dropping a trailing `Implementations include...`. Reproducing that exactly requires a split-point rule,
and none survives all 6 groups: `skills/index.ts` has been hand-edited since the 2026-08-21 seed (e.g.
`groupSelectOne`'s description was rewritten with new structure and no longer HAS an
`Implementations`/`Supports` sentence to split on). This agent publishes the **full** `skills/index.ts`
description, untruncated, at both levels — simpler, always in sync with the manually-maintained source of
truth, and a defensible content choice (`flow.json` → `decisions.purposeText`).

## Invariants

1. **The tag is never invented.** It is read from a real `@customElement`, by construction — there is no
   post-hoc gate because there is nothing to gate against.
2. **No molecule disappears.** Every file found under a group's folder appears in `molecules[]`; one with
   no `.defs.ts` gets `defs: null` and a `⚠ fora de contrato` line, never silent omission.
3. **Group → project, never in parallel.** `s2` `dependsOn` every `s1` anchor of the run, and reads their
   l4 artifacts — never a group's `index.defs.ts` source text directly.
4. **A group with no `skills/index.ts` entry is ignored WITH A REASON**, never dropped silently — today
   that is `groupNavigateMain`, invisible to the legacy `agentUpdateIndexGroupPage` because it resolves
   against `skills/index.ts` alone, not the project's own directories.
5. **`index.ts` is never touched by this build**, and every run's report says so and how to ask for it —
   a run that DOES ask gets an honest "not built yet", never silence.
6. **The catalog is written but never published** (no publish API exists on this platform) — the report
   says so every run, naming the two silent failure modes an unpublished/stale-published catalog produces.

## E5 acceptance — what was actually verified

Regenerated all 6 pilot groups (`groupEnterDate`, `groupEnterNumber`, `groupEnterText`,
`groupSelectMany`, `groupSelectOne`, `groupViewTable`) straight from their real source files in
`mls-102040-temp`, through the exact pure renderers this agent ships, and diffed the result against the
seeded v2 `index.defs.ts` — **structurally identical for all 6**: every molecule entry, every layout axis
(including groupSelectOne/groupViewTable's 12-molecule case), every scenario recommendation, every
markdown bullet. The only differences are the two documented content divergences above, plus two
markdown-table cells where the seed carries a hand-written explanation this generator has no way to know
(`groupEnterNumber`'s "Percentage"/"Range selection" rows, which the seed annotates as belonging to
`groupEnterNumberInterval`). `skill.ts` (level 1): identical `groups[]` entries and identical
`Moléculas:` lines as sets, order aside.

## What could not be verified locally

The root and the three step agents (`agentSyGroup`, `agentSyProject`, `agentSyReport`) import
`IAgentAsync`/`IAgentMeta` from `mls-102027`'s `aiAgentBase.ts`, whose TypeScript source is not present
in this checkout (only a compiled, stale `dist/` artifact) — a pre-existing environment gap, not
introduced here. They could not be type-checked or executed in this session. Every hook signature, intent
shape, and the `skipRootLLM` bootstrap pattern were copied from three separate, presumably-shipping
precedents (`agentChReport.ts`, `agentChangeFrontend.ts`, `agentChooseMolecules.ts`'s root) rather than
invented, and reviewed by hand — but a first real Studio run is the only way to close this gap.

## How to run it

```
@@agentSyncMoleculeCatalog
@@agentSyncMoleculeCatalog atualizar groupEnterText
@@agentSyncMoleculeCatalog atualizar grupos groupEnterText, groupSelectOne e groupViewTable
@@agentSyncMoleculeCatalog atualizar grupo groupEnterText incluindo o arquivo index.ts
```

Then read `l4/agentSyncMoleculeCatalog/<runKey>/report.json` (or the step's readable summary) for what
was written, what was ignored and why, and the publish reminder.
