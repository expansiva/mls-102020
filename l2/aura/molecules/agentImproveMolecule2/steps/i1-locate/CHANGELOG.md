# CHANGELOG — i1-locate

## 2026-08-06 — first version

- Deterministic step: resolve the target, read the five artifacts, detect the shell, write
  `context.json`. No LLM, per flow.json ("deterministic first").
- Gate with two entry points, `checkImClassification` (used by the root, for i0) and
  `runImLocateGate`, mirroring `agentNewMolecule2/steps/n1-bootstrap/gate.ts`.
- **Not-found is reported alone.** First draft accumulated every issue, so a typo in the molecule
  name produced five errors — the group unknown, the `.ts` unreadable, the `.defs.ts` missing —
  and the one line that mattered was the last. Resolution returns early now.
- **`checkImClassification` rejects prose-shaped targets** (`the table on the customers page`)
  before resolution. Without it, `resolveTarget` walks all 31 groups looking for a file whose name
  cannot exist, and the failure says "searched every group", which reads like a system fault
  rather than a classifier miss.
- Root-plan accessors went to `helpers/imRootPlan.ts` instead of the root file.
  `agentNewMolecule2` keeps them in `agentNewMolecule2.ts:150-176`, which makes step → root → gate
  a module cycle; here both the root and the steps import the helper. Side effect worth keeping:
  the step compiles and is testable before the root exists.
- Plumbing (`nmParseStepArgs`, `nmResultStepIntent`, `nmUpdateStatusIntent`, `nmFs`) is imported
  from `agentNewMolecule2/helpers`, not copied — flow.json principle #1. Only `nmDoneAnchor` could
  not be reused: it is typed to `NmPlanId`, hence `imDoneAnchor` in `imTypes.ts`.
- l4 work files live under `agentImproveMolecule2/<runKey>/`, never in the NM2 folder — route A
  hands over to NM2 and the two runs must not write into the same place.
