# Changelog

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
