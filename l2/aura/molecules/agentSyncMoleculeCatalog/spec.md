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
| — | `l2/molecules/<group>/index.ts` (the showcase page) | ✅ mostly (E8a) / editorial-by-LLM (E8b) | **this agent, s3** — deterministic migration for a G3 group, one LLM call for a G1 group |

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
5. **`index.ts` migration and creation are both automatic**, no opt-in needed. A G3 group (index.ts
   exists, not yet migrated) is migrated on every run (see "E8" below). A G1 group (no index.ts at all)
   has its page CREATED on every run, one LLM call, since E8b (see "E8b" below) — never reported as a
   gap to fill later.
6. **The catalog is written but never published** (no publish API exists on this platform) — the report
   says so every run, naming the two silent failure modes an unpublished/stale-published catalog produces.

### The three `i6-index` invariants, and where each one landed

The E8 brief asked s3 to inherit them. Two hold, one does not apply — recorded here rather than dropped
in silence, because "inherited and then absent" and "deliberately waived" look identical in the code:

| `i6-index` invariant | here |
|---|---|
| the molecule is imported **exactly once** | **holds by construction.** s3 edits one method and adds two imports; it never touches the molecule import block. Verified across all 30 real groups: zero imports lost |
| every molecule has a **`<tag>` instance** on the page | **holds by construction**, same reason — `renderHero` and `renderShowcaseCards` come out byte-identical. Verified across all 30: zero instances lost |
| the page may not **shrink more than 10%** | ⚠️ **DOES NOT APPLY, and enforcing it would break every migration.** That guard exists because i6 *adds* a card, so shrinking meant it had destroyed something. Here shrinking IS the deliverable: 40–90 lines of hand-written table collapse into a 3-line call. Measured on real files: −16% (`groupViewTable`) to −32% (`groupEnterDate`). The guard that replaces it is the pair above plus "braces and parens stay balanced" |

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

## Correction (E8 prep): `aiAgentBase.ts` DOES exist locally

The E1-E7 record here previously said the root/step agents' type-checking was skipped because
`mls-102027/l2/aiAgentBase.ts`'s TypeScript source was believed absent from this checkout. **That belief
was wrong** — a broken `find` invocation (silently intercepted by a shell tool wrapper) returned nothing
and was read as "the file does not exist." `command find`/a direct listing shows it, `aiAgentHelper.ts`
and `aiAgentOrchestration.ts` all present. Re-run with a real scoped `tsc` including them: **clean, zero
errors**, across the root and all four step agents. The lesson (and the reason this correction is written
out rather than just silently fixed): before recording "this cannot be verified," prove the impossibility
directly — a failed command is not evidence a file is missing.

## E8 — migrating index.ts (D-E1 through D-E4)

E8 adds `s3-indexts`: migrating a group's `index.ts` showcase page so its "Quick reference" scenario
table imports from `index.defs.ts` instead of carrying the table as hand-written Lit code. Split by
nature, per a real measurement (not the original assumption that the whole page was authorial):

| | groups | nature | LLM? |
|---|---|---|---|
| **E8a — migrate** an existing `index.ts` | 30 (mls-102040) | deterministic text surgery | ❌ no — **built** |
| **E8b — create** `index.ts` from scratch | any G1 group of any project (7/7 in mls-102053) | authorial | ✅ yes, exactly 1 call/group — **built** |

### The migration surgery

`renderReferenceTable()`'s method signature (`private renderReferenceTable(): TemplateResult {`) is
byte-identical across all 30 groups. `helpers/syMigrateIndexTs.ts` finds it, brace-matches to the closing
`}` — with a small stack-based scanner that correctly handles a Lit template literal's `${...}`
interpolations containing MORE template literals (`${headers.map(h => html\`...\`)}`) — and replaces the
WHOLE body with:

```ts
private renderReferenceTable(): TemplateResult {
  return renderCatalogReferenceTable(molecules, scenarios);
}
```

plus two new imports (`molecules, scenarios` from `./index.defs`, and `renderCatalogReferenceTable` from
the new shared module) inserted right after the file's last existing `import` line. Everything else in
the file — hero, showcase cards, class declaration, `render()` — is untouched; confirmed by diffing the
migrated output of `groupEnterDate` and `groupViewTable` (the strong acceptance test, below).

Four field shapes for the pre-migration `rows`/`headers` declaration were measured across the 30 real
groups (inline `Array<{...}>`, a local `interface Row`, a local `type Row`, no type annotation at all) —
all four live ENTIRELY inside the method body, so replacing the whole method sidesteps needing to parse
any of them.

### D-E1 — where the generic renderer lives

**Closed:** a shared module in `mls-102020/l2/aura/molecules/shared/` (`indexReferenceTable.ts` +
`indexReferenceTableData.ts`), imported from every migrated `mls-102040` `index.ts`. ⚠️ There is no
existing precedent for that import direction (only the reverse, and the unrelated `enhancement=`
triple-slash metadata directive) — chosen as a risk explicitly accepted, not a pattern discovered safe.
A scoped `tsc` compile of the migrated files against the real module resolved cleanly (see "E8a
acceptance" below), which is strong type-level evidence; the Studio's own runtime resolution is a
different system and was not exercised.

### D-E2 / D-E2b — color and column order

**Closed:** header color is derived from the molecule's alphabetical index in `molecules[]`
(`syPaletteColor`), not harvested from the pre-migration page's historical card-import-order pairing —
a deliberate visual change. Tailwind classes come from a static lookup table
(`indexReferenceTableData.ts`'s `COLOR_CLASSES`), never `text-${color}-600` interpolation, because
Tailwind's build scans literal source text for class names. Because color now follows the alphabetical
index, **column order also became alphabetical** (D-E2b) — otherwise the colors would read as scattered
rather than in a clean left-to-right sequence, and this is what committed the migration to editing the
table's markup rather than leaving it untouched.

### The consolidation this led to

Once the markup needed editing anyway (D-E2b) and D-E1 already asked for a "thin call site," the whole
`renderReferenceTable()` collapses to ~3 lines instead of the narrower "①②③ change, ④ untouched" surgery
first scoped — confirmed explicitly with the product owner as a deliberate, bigger simplification. It is
lossless because the todo's own measurement found the markup structurally identical across all 30 groups.

### D-E3 — a scenario column naming another group's molecule

**Measured, not guessed:** swept all 30 real groups' scenario tables for fields matching no LOCAL
molecule. Before two matcher bugs were found and fixed (a group keeping the `ml` prefix in field names;
a letter→digit tokenization gap; a compound word spelled as one word in the filename but split by
camelCase in the field), the sweep found 7 of 30 groups with 19 "foreign-looking" columns. After the
fixes: **1 of 30** — `groupEnterNumber`'s "Range Slider" column, which genuinely is
`ml-number-range-slider` from `groupEnterNumberInterval`. Given the constraint "no index may reference
another group's molecule," such a column never renders, and a scenario row left with zero in-group
recommendations after dropping it is **omitted from the rendered table** (it stays in `scenarios[]` in
the `.defs.ts` regardless — no data lost, just no dead row drawn).

### D-E4 — the reference-table title

**Measured:** swept all 30 groups' `<h2>` title — 28 say "Quick reference", 2 (`groupTriggerAction`,
`groupViewTable`) say "Referência rápida" (the todo's own text only knew about `groupViewTable`).
**Closed:** normalize to "Quick reference" everywhere — the shared module hardcodes it. This is the one
place the migration edits prose that used to live in the untouched block; accepted because it is a
single, swept, uniform correction, not a per-group judgment call.

### E8a acceptance — what was actually verified

Migrated `groupEnterDate` (4 molecules, 288→185 lines) and `groupViewTable` (12 molecules, the largest
real `index.ts` at 796→662 lines) from their REAL current source. Both: braces balanced after the
surgery; hero/cards/class declaration/`render()` byte-identical; the new imports landed correctly. Then,
to close the loop end to end: regenerated real `index.defs.ts` content for both groups (via the E1-E7
renderers, from real source) and ran a scoped `tsc` compile of the migrated `index.ts` + the real
`index.defs.ts` + the real shared module together — **clean, zero errors**, including the cross-project
`mls-102040` → `mls-102020` import (D-E1). The temporary swap into the real `mls-102040` files was
reverted immediately after the check; nothing there is modified by this agent's own work.

## E8b — creating index.ts from scratch (the only LLM call in this agent)

E8b adds the second mode of `s3-indexts`: a G1 group (no `index.ts` at all — 7 of 7 groups in
`mls-102053`, the project this was built against, todo `decisions.e8bCreation_targetChanged`) gets its
showcase page written by ONE LLM tool-call turn, the same shape as `agentNewMolecule2`'s `n7-index`
(`prompt_ready` + a strict tool schema + `afterPromptStep` + a structural gate + retry up to
`NM_MAX_ATTEMPTS`). Same step, same agent (`agentSyIndexTs`) as migration — which mode runs is decided by
whether `index.ts` exists when the step runs, not by a flag (`flow.json` →
`decisions.e8bCreation_sameStepTwoModes`).

### The page is born migrated — the sharpest failure mode named in the todo

The model must NOT hand-write `rows`/`headers`/`<table>` markup for the model to "migrate" later. The
system prompt reuses `skills/indexGroupPage.ts` verbatim (`decisions.e8bCreation_skillReuseNotFork` — no
forked copy, so the two legacy agents that still use that skill unmodified never silently diverge from
it) and appends an `## OVERRIDE` section that gives `renderReferenceTable()`'s exact 3-line body and the
two import lines — the SAME text `syMigrateIndexTs.ts` (E8a) generates — superseding only that one
section of the skill. `steps/s3-indexts/createGate.ts` enforces it structurally: an attempt whose
`renderReferenceTable()` is not exactly that call, or that contains `<table`, `headers.map(` or a `rows`
array literal anywhere, fails the gate and retries (`decisions.e8bCreation_pageIsBornMigrated`).

### Scenarios stay authorial — only the address changes (§4's correction, restated here)

`skills/indexGroupPage.ts` already told the model to hand-write the quick-reference table's `rows`/
`headers` (line 106); the pilot's seed HARVESTED that authored table from a real `index.ts`, it never
derived it. E8b keeps the model as the author of the table's content, only moves where it lands: the tool
schema (`schemas/s3-indexts-create.schema.json`) asks for `scenarios: Array<{ scenario, recommended }>`
as DATA, `recommended` naming SHORT molecule names from the same "Available molecules" list the prompt
already shows the model. The step resolves each short name against the group's own molecule list — a
name matching nothing is DROPPED and recorded as a warning, never guessed
(`helpers/syCreateIndexTs.syResolveCreationScenarios`, `decisions.e8bCreation_tagAntiInvention`) — then
re-renders the group's WHOLE `index.defs.ts` via `syRenderIndexDefs` (the same renderer `s1` uses, not a
text edit) with everything unchanged except `scenarios[]`, and writes + compiles + re-caches it
(`decisions.e8bCreation_rewriteViaRendererNotTextEdit`) — `s1` already wrote+cached that file earlier in
the same run with `scenarios: []`, since a G1 group has nowhere to harvest from.

### Publish sequence, and where it differs from index.defs.ts

`index.ts` (either mode) is written + compiled, never passed through `syPublishToCache` — nothing imports
`index.ts` by name, the same reasoning already recorded for E8a's migration mode
(`decisions.e8bCreation_indexTsNeverCached`). `index.defs.ts`, rewritten with the model's scenarios, DOES
get re-cached: `index.ts` imports it by name.

### E8b acceptance — what is verified, what is pending

See `flow.json` → `acceptance.e8bStrongAcceptance` for the full record. Verified without an LLM: scoped
`tsc` compiles clean (two projects, mls-102020 + mls-102040), `syResolveCreationScenarios` and
`createGate.ts` pass unit tests against hand-written fixtures shaped like a real page, and a
retry-routing bug (found by code review, not by running it: a failed attempt's speculatively-written
`index.ts` made the retry's own `beforePromptStep` misroute into migration mode) was fixed before this
line was written. **Still pending, and it is the real gate**: a Studio run creating `groupEnterDateTime`'s
`index.ts` in `mls-102040` (2 molecules, the smallest real G1 case) from a REAL model response — this is
the first time this agent calls an LLM at all, and no amount of unit testing exercises prompt/schema
correctness against a real model the way E8a's own T1 gate did for the migration import.

## How to run it

```
@@agentSyncMoleculeCatalog
@@agentSyncMoleculeCatalog atualizar groupEnterText
@@agentSyncMoleculeCatalog atualizar grupos groupEnterText, groupSelectOne e groupViewTable
```

`index.ts` migration (G3) and creation (G1) both run automatically whenever a matched group has the
trigger — the `incluindo o arquivo index.ts` phrase is still accepted but no longer required
(`flow.json` → `decisions.migrationIsAutomatic`).

Then read `l4/agentSyncMoleculeCatalog/<runKey>/report.json` (or the step's readable summary) for what
was written, what was ignored and why, `index.ts` status per group, and the publish reminder.
