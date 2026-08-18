# E5 — regras de negócio

Mantém um único catálogo de regras legível por humanos e por LLMs. E2, E3 e E4 guardam somente ids em `useRules`; a descrição existe apenas no E5. Na entrada, o agente recompõe jornadas, matriz de acesso e ontologia pelos artefatos permanentes aprovados e coleta mecanicamente todos os ids referenciados.

Uma única chamada de reasoning recebe esses ids e o contexto L4 compacto. A resposta aceita somente `{ id, description }`. O gate determinístico exige ids lower-camel únicos, descrição não vazia e cobertura de todas as referências. Há no máximo um retry de transporte e um reparo de gate; não existem fan-out por regra, juiz, `appliesTo`, `sourceRefs` ou detalhes executáveis.

Saídas: `pipeline/e5-rules.draft.json`, `pipeline/e5-rules.approved.json` e `rules/rules.defs.ts`.

Páginas, casos de uso, tabelas e comportamentos futuros varrem o L4 e registram somente os ids aplicáveis em `useRules`. Assim, alterar uma descrição muda a regra em um único local, e a análise de impacto consiste em localizar as referências ao id no L4.
