# agentChooseMolecules

**Experimental probe.** Reads a definition of a page or system and reports which **group** and which
**molecule** of this project's catalog serve each region of it. It writes no page and no molecule — the
product of a run is the measurement.

```
@@agentChooseMolecules Cadastro de cliente: nome completo, CPF, telefone, e-mail e data de nascimento
@@agentChooseMolecules { catalogProject: 102054 } Tela de checkout com seleção de país
```

The catalog is looked up in this project and its direct dependencies; the optional argument says which
project to read instead. Exactly one catalog answers a run — see `spec.md`.

It answers a question about the CATALOG, not about the page: is the three-level catalog good enough for an
LLM to choose from without inventing a component? The pilot's decisions and its acceptance criteria ship
here, in `flow.json` (`decisions`, `acceptance`) and `spec.md` — there is no other document to look for.

## The tree

| step | model | what it does |
|---|---|---|
| c0-classify (the root) | `classifier` | slug, language, step titles. Names no group and no tag, on purpose |
| c1-groups | `reasoning` | level 1 in: the regions of the page and the group of each, or `none` |
| c1r-fanout (the root) | — | plants one c2 per chosen group, plus c3 |
| c2-\<group\> | `reasoning` | level 2 of ONE group in: the molecule per region, or `none` |
| c3-report | — | `run.json` and the readable summary |

## What a run leaves behind

`l4/agentChooseMolecules/<runKey>/` in the active project:

| file | what for |
|---|---|
| `run.json` | **the scoring artifact**: region → group → molecule → scenario, with both reasons |
| `input.json`, `c1-groups.json`, `c2-<group>.json` | the entry and each step's answer |
| `prompt-<planId>-NN.json` | the size of that attempt's prompt: instructions / catalog / input |
| `trace-<planId>-NN.json` | the gate verdict of that attempt, with the tag-issue breakdown |

## Three things worth knowing before reading the code

**One catalog level per prompt.** c1 sees the ~1.5 KB group list; each c2 sees one group's 2–6 KB list.
All 32 groups would be ~90 KB, and the precedent for what that does is the 58 KB prompt that brought
down `i3-edit`.

**The gate is the point.** A tag outside the group's published list is refused — `tag_invented` must
stay at zero, and `run.json` also records how many times the gate had to fire to keep it there. The
reason this matters is measured: the usage contracts' own examples carry 38 invalid tags against 2
valid ones.

**`none` is an answer at both levels.** The pilot publishes 6 of 32 groups deliberately, so a page
asking for an upload must come back empty-handed rather than with a plausible neighbour.

## Files

```
flow.json  spec.md  README.md          the design record — spec first
agentChooseMolecules.ts                root: entry, phase-1 planting, and the fan-out
helpers/chTypes.ts                     pure: anchors, sentinel, prompt measurement
helpers/chCatalog.ts                   the only module that reads disk: catalog + l4 paths
helpers/chExtract.ts                   pure: a catalog level parsed from its source text
helpers/chEntry.ts                     pure: the mention's argument, and which catalog answers
helpers/chRootPlan.ts                  the c0-classify answer, as the steps read it
schemas/                               the two tool schemas
steps/c1-groups/  steps/c2-molecules/  steps/c3-report/
```

Tests: `gate.test.ts` in both LLM steps, `report.test.ts`, `helpers/chTypes.test.ts`,
`helpers/chExtract.test.ts`, `helpers/chEntry.test.ts` and `helpers/chPrompts.test.ts` (the `modelType` marker check `skills/modelTypes.md` makes mandatory, plus
the invariant that no prompt of this agent may contain a molecule tag). All pure, all in CI, 71 in total.
