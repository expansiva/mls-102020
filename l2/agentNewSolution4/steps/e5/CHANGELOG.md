# Changelog

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
