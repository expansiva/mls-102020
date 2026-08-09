# Changelog

## 2026-08-09 — build 35, flow contract unchanged (v17)

- E5 judge identity (`moduleName`, `reviewRound`) is frozen from its scheduled step, so a stale numeric
  value copied from the static JSON example cannot discard an otherwise valid semantic verdict.
- The compact reference and judge context now include approved field constraints and entity invariants;
  routing to E4 is judged against facts that actually exist instead of producing false upstream gaps.
- A genuine upstream gap discovered by the semantic judge is persisted with the standard resumable E5
  failure prefix, reopening the owning E3/E4 rounds instead of leaving the pipeline running after an ABEND.

## 2026-08-08 — build 32, flow contract unchanged (v17)

- The first run24 repair task correctly entered E3 round 2 but failed immediately because E3 still
  parsed the large E2 pipeline draft. Approved-source loading is now centralized for E3–E5 on the
  journey/access/ontology permanent defs; the upcoming E4 repair no longer reads its large draft.

## 2026-08-08 — build 31, flow contract unchanged (v17)

- Both resumed run23 and clean run24 reached E5 and produced valid compact plans, but stopped on six
  real upstream access/ontology gaps because the flow had detection without a repair route.
- The gap failure remains fail-closed. On the next explicit module resume it deterministically reopens
  E3 then E4 with the persisted report and previous approved contracts, records revision round 2, and
  retries E5 only after both owning gates approve the repaired artifacts.

## 2026-08-08 — build 30, flow contract unchanged (v17)

- A valid run23 resume reached E5 directly, but one large pipeline draft read returned the storage
  sentinel `Erro`; E5 attempted to parse it as JSON and the task failed before the LLM call.
- E5 now reconstructs journeys and ontology from their approved permanent indexes and per-item
  `.defs.ts` artifacts, validates hashes/module ownership, reads details in bounded batches and
  retries an invalid storage response once with an explicit artifact-specific error.

## 2026-08-08 — build 28, flow contract unchanged (v17)

- Run23 completed E1-E4, then its 20 E4 entity calls recorded 542,366 tokens inside one limiter
  window. The following E5 plan was rejected by collab-llm with `limit_type=tpm`, but the empty
  payload was mislabeled as an invalid plan and retained 118 KB of input in the task.
- The E5 compact plan now receives only the exact mechanical catalog and allowed reference index;
  full semantic context remains available later in filtered rule workers and the judge.
- A transport/empty-payload failure gets one separately budgeted retry. The failed attempt is cleaned
  before retry, and a compact trace preserves the provider reason without duplicating the prompt.

## 2026-08-08 — flow v12

- Rule workers reconstruct `{ planId: "e5-rules" }` from `args=rule:<id>` instead of reading the
  absent prompt of a materialized parallel child.

## 2026-08-07 — flow v11

- Parallel rule children use their stable `rule:` hook argument for before/after dispatch even when
  the runtime materializes the child without `planning.planId`.

## 2026-08-07

- Flow v10 substitui a proposta monolítica por catálogo/cobertura mecânicos, plano compacto, detalhamento
  paralelo por regra com `maxParallel: 20`, reparo direcionado e juiz com contexto compacto.
- Inputs e outputs grandes são limpos ao concluir ou falhar; os artefatos intermediários preservam a
  retomada e a rastreabilidade sem manter centenas de milhares de tokens no task.
- Lacunas que exigem contrato anterior são explicitadas como `upstreamGap`; o E5 não inventa entidades,
  projeções ou campos ausentes em E4.

## 2026-08-06

- Primeiro contrato E5 com gate estrutural, juiz semântico, reparo limitado, clarification iterativo e artefatos permanentes por regra.
