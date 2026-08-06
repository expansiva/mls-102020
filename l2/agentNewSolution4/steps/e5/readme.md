# E5 — regras de negócio

Compila regras distribuídas em E1–E4 para contratos permanentes, rastreáveis e consumíveis por L1 e L2. O gate determinístico valida referências e enforcement; o juiz semântico independente verifica cobertura, contradições, destino e exemplos transformados indevidamente em constantes. Um reparo completo é permitido antes da revisão humana.

Saídas: `pipeline/e5-rules.draft.json`, `pipeline/e5-rules.approved.json`, `rules/{ruleId}.defs.ts` e `rules/index.defs.ts`.
