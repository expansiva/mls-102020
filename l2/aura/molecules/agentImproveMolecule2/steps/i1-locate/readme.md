# i1-locate

Deterministic. No LLM. Runs on every route (A, B, C, D).

## Input

- `rootPlan.target` — what i0-classify read out of the prose (`ml-data-table` or `groupviewtable/ml-data-table`)
- `mls.actualProject` — the only project this agent ever touches

## Output

- `l4/agentImproveMolecule2/<runKey>/context.json` — the `ImContext` every later step reads
- result step `i1-done` carrying `{ contextFile, runKey, fileReference, group, tag, isShell, parentRef, artifactsPresent }`

## Invariants

**The molecule MUST exist.** This is the inverted precondition and the reason this pipeline is not
a mode of `agentNewMolecule2`: `nmFs.ts:75` refuses a molecule that already exists, this gate
refuses one that does not. When it is missing, the failure names `@@agentNewMolecule2`. Never
reconcile the two with a create/update flag inside a shared step — `agentsBestPractices` §2.

**`.ts` and `.defs.ts` are required; `.less` and `.html` are not.** A molecule with no playground is
normal — i5-playground is the step that creates one. A molecule with no `.defs.ts` is not: the
playground slot list and the Design System catalog are both built from it.

**A shell's parent lives in ANOTHER project.** Strategy D is inheritance across projects. A class
extending a molecule of the same project is a local base class, and route C does not apply to it.

**The tag is derived from the path, never authored.** Same rule as `agentNewMolecule2`.

**Nothing is inlined that can be referenced.** The group creation skill goes into `context.json` as
a reference; each later step imports it. Inlining it would put a 15 KB skill into every artifact.

## Failure modes

All are readable and immediate — flow.json declares no retry for this step.

| code | means |
|---|---|
| `molecule_not_found` | reported alone; every other check reads artifacts that were never read |
| `group_unknown` | the folder is not a group in `skills/index.ts`; the message lists the known ones |
| `group_no_skill` | the group has no `skillReference` (today: only `groupNavigateMain`) |
| `ts_unreadable` | located but empty |
| `defs_missing` | no readable `.defs.ts` |
| `parent_unresolved` / `parent_same_project` | the shell detection produced something route C cannot use |

## Tests

`gate.test.ts` — 14 cases, pure, no Studio. The two that must never be deleted are the inverted
precondition and "not-found is reported alone": the first is the boundary with `agentNewMolecule2`,
the second is what keeps the user's failure message down to one line.
