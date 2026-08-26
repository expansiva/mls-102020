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
| — | `l2/molecules/<group>/index.ts` (the showcase page) | ✅ mostly (E8a) / ❌ 2 groups (E8b) | **this agent, s3** for 30 of 32 groups; 2 not built yet |

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
5. **`index.ts` migration is automatic and safe, creation is not built.** A G3 group (index.ts exists,
   not yet migrated) is migrated on every run, no opt-in needed (see "E8" below). A G1 group (no
   index.ts) is reported `creation-needed`, never silently skipped — E8b is not built.
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
| **E8a — migrate** an existing `index.ts` | 30 | deterministic text surgery | ❌ no — **built** |
| **E8b — create** `index.ts` from scratch | 2 (`groupNavigateMain`, `groupEnterDateTime`) | authorial | ✅ yes — **not built** |

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

## How to run it

```
@@agentSyncMoleculeCatalog
@@agentSyncMoleculeCatalog atualizar groupEnterText
@@agentSyncMoleculeCatalog atualizar grupos groupEnterText, groupSelectOne e groupViewTable
```

`index.ts` migration (G3) now runs automatically whenever a matched group has it pending — the
`incluindo o arquivo index.ts` phrase is still accepted, but no longer required (`flow.json` →
`decisions.migrationIsAutomatic`); it only still matters for a G1 group (creation, not built).

Then read `l4/agentSyncMoleculeCatalog/<runKey>/report.json` (or the step's readable summary) for what
was written, what was ignored and why, `index.ts` status per group, and the publish reminder.
