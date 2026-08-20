# CHANGELOG — c6-summary

## 2026-08-19 — nasce (Fase 3 do controle)

- **`modelType: general`** (skills/modelTypes.md) — é resumo, não julgamento técnico;
- a mensagem tem 5 blocos obrigatórios, e o **ponteiro para o bloco `collab_i18n`** é o principal:
  é o motivo do agente existir, com a receita concreta (`message_pt` + entrada no record);
- **não fala de index** nem sugere gerar um (decisão 3 + pedido explícito do usuário em 19/08);
- os arquivos citados vêm de `cFileExists`, não do contexto: a mensagem nunca afirma um arquivo que
  não foi escrito (o `.defs.ts` pode legitimamente faltar, e a demo pode ter falhado);
- contrato de saída igual ao do `v6-summary` do Variant: `{ "type": "flexible", "result": "<texto>" }`.

## 2026-08-20 — sai a receita de i18n (decisão de equipe)

A equipe dividiu a responsabilidade: **este agente só copia**; acrescentar idiomas é de **outro agente
do Studio**. O bloco 2 da mensagem era justamente a receita de tradução (`message_pt` + entrada no
record) — foi trocado por uma frase dizendo que a molécula agora é do projeto e que o bloco de texto
chegou como está na base.

O prompt passou a **proibir** explicitamente ensinar i18n, mostrar snippet ou nomear idioma: se as duas
mensagens ensinarem, elas competem — e a que chega primeiro (esta) é a que sabe menos sobre tradução.
