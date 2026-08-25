# agentSyncMoleculeCatalog

Generates the molecule catalog an LLM consumer reads to choose components: `l2/molecules/skill.ts`
(level 1) and, per group, `index.defs.ts` + `index.html` (level 2) — derived from the molecule files
already in the project. **No LLM call in the default path.**

```
@@agentSyncMoleculeCatalog
@@agentSyncMoleculeCatalog atualizar groupEnterText
@@agentSyncMoleculeCatalog atualizar grupos groupEnterText, groupSelectOne e groupViewTable
@@agentSyncMoleculeCatalog atualizar grupo groupEnterText incluindo o arquivo index.ts
```

With nothing after the mention, or `all`, every group the project has (with a `skills/index.ts` entry) is
synced. A specific list is comma/`e`-separated. `index.ts` is opt-in — see below.

## The tree

| step | model | what it does |
|---|---|---|
| root (`beforePromptImplicit`) | — | parses the mention, scans the project, plants everything below in one batch |
| `s1-<group>` × N | none | one group's `index.defs.ts` + `index.html` |
| `s2-project` | none | `l2/molecules/skill.ts`, after every `s1` of the run |
| `s4-report` | none | `report.json` + the readable summary, after `s2` |

## What a run leaves behind

`l4/agentSyncMoleculeCatalog/<runKey>/` in the active project:

| file | what for |
|---|---|
| `report.json` | **the four obligations**: what was written, ignored groups with reasons, whether `index.ts` was touched (never, in this build) and how to ask for it, and that the catalog is written but **not published** |
| `input.json` | the resolved scope: matched/ignored/requested-but-ignored/unknown groups |
| `s1-<group>.json`, `s2-project.json` | each step's own written summary |

## Three things worth knowing before reading the code

**The tag is never invented.** It is read from the molecule's real `@customElement(...)` decorator, by
construction — never from a filename, never from an LLM. There is no separate anti-invention gate because
there is nothing to gate against.

**Scenarios are the one field that is not derived.** They are editorial. On a fresh group they are
harvested from its current `index.ts`; on every resync, whatever is already in the group's
`index.defs.ts` is preserved — a resync never clobbers a hand edit. See `spec.md` for the field-matching
algorithm groupViewTable's abbreviated column names required.

**`index.ts` is not built by this agent yet.** It is the authored Lit showcase page, and the analysis
that designed this agent measured it at 189–795 hand-written lines per group across the 30 existing ones
— not derivable, and it must never hold the derivable catalog hostage. Every run's report says so, and
how to ask for it once that step exists.

## Files

```
flow.json  spec.md  README.md              the design record — spec first
agentSyncMoleculeCatalog.ts                root: mention parsing, discovery, single-batch planting
helpers/syTypes.ts                         pure: constants, anchors, artifact shapes
helpers/syEntry.ts                         pure: the mention — which groups, index.ts opt-in or refusal
helpers/syDiscover.ts                      pure: project folders matched against skills/index.ts
helpers/syExtract.ts                       pure: one molecule's tag/Objective/layoutConfig + scenario harvest
helpers/syLabels.ts                        pure: palette + short label (consumed by the future s3)
helpers/syRenderDefs.ts                    pure: index.defs.ts + index.html TEXT
helpers/syRenderSkill.ts                   pure: skill.ts TEXT
helpers/syFs.ts                            the only module that touches mls.stor — l4 paths + scans
steps/s1-group/  steps/s2-project/  steps/s4-report/
```

Tests: `helpers/*.test.ts` (59+ cases) and `steps/s4-report/report.test.ts`, all pure, all `node:test`.
E5's acceptance (regenerating the 6 pilot groups and diffing against the seed) was run as a one-off
script, not shipped — see `spec.md` → "E5 acceptance" for the result.
