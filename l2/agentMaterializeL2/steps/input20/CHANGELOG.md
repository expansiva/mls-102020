# input20 — CHANGELOG

- 2026-10-05: created for agentMaterializeL2 (phase A), from the generic gate of agentMaterializeL2v2 (refactor of 05/10).
  - The contract reader is a copy of the official parser (`helpers/defs/contract.ts`). It exposes the route JSDoc and the projection leaves, and accepts the empty hub contract `export {};`.
  - New: the L4 context (`helpers/l4/context.ts`), sliced per page and stored in `input.json`. Its hash is part of every unit.
  - Notes `M4_INPUT_L4_LANGUAGES` and `M4_INPUT_L4_ONTOLOGY` when the L4 is incomplete.
- 2026-10-07: the shared states may list `organisms`. agentDefsL2 requires that field since d2_80 (05/10). The reader in `helpers/defs/shared.ts` accepts it as optional and keeps its value. agendaClinica was refused with `forbidden field organisms`.
- 2026-10-07: **context inputs** (`contextInputs` in `input.json`, note `M4_INPUT_CONTEXT_INPUT`).
  - A top-level member of a form's command input is context when an entry param with a `select:` effect has the same name and a state takes its `source` from that param. It is the page's selection, not something the form asks for.
  - Case: comandaRestaurante/atendimento, `lancarItem.comandaId ← selectedComanda`. The draft held `comandaId`, nobody filled it, and the command was refused in the browser before reaching the BFF.
  - The match uses only the links the defs declare (contract input ↔ entry param ↔ state source), with no module names.
  - The note enters the shared40 rules, so it also changes the `rulesHash`, and the shareds it affects are regenerated.
