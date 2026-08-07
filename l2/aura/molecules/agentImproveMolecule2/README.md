# agentImproveMolecule2

Changes a molecule that already exists: its `.defs.ts`, `.ts`, `.less`, `.html` and the group index,
keeping the four in agreement. It does **not** create molecules — that is `agentNewMolecule2`.

Read `flow.json` (the contract) and `spec.md` (the rationale) before changing anything here.

## Run it

```
@@agentImproveMolecule2 in ml-data-table, the empty state should also show the active filters
```

Prose only — there is no object form. A bare mention fails readably: there is nothing to change
without a description.

Where the run stops depends on what you asked for:

- **a minor change** (style, a fix, text) runs straight through, no checkpoint;
- **a definition change** (a slot, a property, an event) is a rebuild, and stops at the
  `agentNewMolecule2` checkpoint — pre-filled with what the molecule is today;
- **an inherited shell** whose fix needs behaviour from the parent stops at its **own** checkpoint,
  where you choose where the change lands.

## What is built, as of 2026-08-06

Routes **B and C run end to end**, closing with the coherence report. One step is **not
implemented**, and the run says so rather than pretending:

- **`i2a-rebuild-handoff` — route A cannot run.** It fails readably at the router, pointing at
  `@@agentNewMolecule2`. Blocked on one open decision (`flow.json.openQuestion`): how the NM2
  collision gate is satisfied on a rebuild, given that NM2 refuses a molecule that already exists.

A declared-but-absent step is **skipped, never planted**: a tree node whose agent does not resolve
reads as a crash, not as "this part is not built". The router names every skipped step.

## Pipeline

| step | model | writes |
|---|---|---|
| root (`i0-classify`) | `classifier` | — (finds the molecule) |
| `i1-locate` | none | `l4/.../context.json` |
| `i2-triage` | `reasoning` | `triage.json` (the route) |
| `i2r-route` (the root again) | none | — (plants the branch) |
| `i2a-rebuild-handoff` | none | *not built* — route A fails readably |
| `i4-inherit` | `reasoning` + checkpoint | `inherit.json` (route C) |
| `i3-edit` | `code` | the artifacts |
| `i5-playground` | `code` | the `.html`, **only if the public surface moved** |
| `i6-index` | `code`, only for the card | the group `index.ts`, **if the playground changed** |
| `i7-summary` | `general` | the summary + the coherence report |

**The tree is planted in TWO PHASES**, which is the one structural difference from
`agentNewMolecule2`, whose eight steps always run and are planted at once.

The route is not known until `i2-triage` answers, and the branches cannot all be planted: `i3-edit`
waits on `i2-done` on route B and on `i4-done` on route C, and an anchor list with both is an AND —
the branch never planted would hang the one that was. So the root plants `i1`, `i2` and a **router**
(`i2r-route`, a hook on the root itself); when `i2-done` lands, the router reads the route and
plants that branch.

The router is a hook on the root and not a step agent because it holds no logic of its own — it *is*
the routing table, and the table belongs where the tree is planted. Scattering successors across
each step's after-hook is the pattern `agentsBestPractices` §6 names as the reason reordering
`agentChangeBackend` meant editing ~20 files.

## Test it

126 unit tests cover the gates and the pure logic (`node scripts/run-tests.mjs 102020`, or the
`agentImproveMolecule2/**/*.test.ts` files directly — the 102020 suite is currently red from an
unrelated `MANDATORY_COLOR_ROLES` defect in the Design System agent).

**Nothing has been exercised end to end in the Studio yet.** The five cases in
`flow.json.acceptance`; run at least these two by hand:

1. **Route B with a new property** — the playground must be regenerated **and** the group index must
   follow, in the same run. If the index does not change, the `i6-index` gate is broken.
2. **Route C on a shell of `mls-102054`** — choose "change the parent" and confirm the run ends with
   an instruction and **zero writes**; then choose "override" and confirm only the shell file
   changed.

## Where things live

- `helpers/` — only what is specific to *changing*: resolving the target, reading what exists,
  detecting the shell, computing the coherence report.
- **Everything that writes artifact content is imported from `agentNewMolecule2/helpers`**
  (`nmTemplates.ts`, `nmFs.ts`, `nmTypes.ts`, `nmLayoutAxes.ts`) and from its `schemas/`. Do not
  reimplement generation here. If a fix seems to need a change over there, stop and review — that is
  a boundary, and the NM2 suite must stay green.

## Three things that will bite you

**1. The gate is inverted, and that is the whole reason this agent exists separately.**
`nmFs.ts:75` reads *"a new molecule must not overwrite an existing one"*. NM2 refuses an existing
file; this agent requires one. Never reconcile the two with a mode flag inside the NM2 steps.

**2. Never touch the parent of a shell.** It is the hard invariant, and `i3-edit`'s gate proves it
on every run. A shell is fixed in its own file: `.less` first, a local override second — and prefer
the smallest member, because a shell that overrides `render()` **stops inheriting** every future fix
from the base.

**3. The coherence report will accuse molecules you did not touch.** That is intended. Nine
molecules declare a slot they never read; the report names them and the user decides. It never
blocks — an improve run is when these are cheapest to fix.

## Relationship to the old flow

`agentsManageMolecules/agentImproveMolecule{,Defs,Materialize}.ts` — three files in a flat folder,
no `flow.json`, no gates, no tests. They stay in place and untouched until this agent is accepted;
removal is manual and deliberate. Do not extend them.
