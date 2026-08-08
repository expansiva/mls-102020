# E5 — regras de negócio

Compila regras distribuídas em E1–E4 para contratos permanentes, rastreáveis e consumíveis por L1 e L2. Na entrada, recompõe jornadas e ontologia pelos índices e artefatos permanentes aprovados, validando `businessHash`, `ontologyHash` e o módulo proprietário; os arquivos grandes de revisão em `pipeline/` não são dependência da retomada. O catálogo de fontes e a cobertura são derivados mecanicamente. Uma chamada compacta organiza os planos de regra; cada regra é detalhada em paralelo com contexto filtrado (`maxParallel: 20`). O finalizador repara somente itens ausentes ou inválidos, agrega o catálogo e executa o gate completo. O juiz semântico independente recebe contexto compacto e verifica cobertura, contradições, destino, lacunas anteriores ao E5 e exemplos transformados indevidamente em constantes. Um reparo semântico limitado retorna pelo mesmo plano e fan-out antes da revisão humana.

Intermediários retomáveis: `pipeline/e5-source-catalog.json`, `pipeline/e5-rules-plan.draft.json` e `pipeline/e5-rules/{ruleId}.draft.json`.

Saídas: `pipeline/e5-rules.draft.json`, `pipeline/e5-rules.approved.json`, `rules/{ruleId}.defs.ts` e `rules/index.defs.ts`.
