# CHANGELOG — c6-summary

## 2026-08-19 — nasce (Fase 3 do controle)

- **`modelType: general`** (skills/modelTypes.md) — é resumo, não julgamento técnico;
- a mensagem tem 5 blocos obrigatórios, e o **ponteiro para o bloco `collab_i18n`** é o principal:
  é o motivo do agente existir, com a receita concreta (`message_pt` + entrada no record);
- **não fala de index** nem sugere gerar um (decisão 3 + pedido explícito do usuário em 19/08);
- os arquivos citados vêm de `cFileExists`, não do contexto: a mensagem nunca afirma um arquivo que
  não foi escrito (o `.defs.ts` pode legitimamente faltar, e a demo pode ter falhado);
- contrato de saída igual ao do `v6-summary` do Variant: `{ "type": "flexible", "result": "<texto>" }`.
