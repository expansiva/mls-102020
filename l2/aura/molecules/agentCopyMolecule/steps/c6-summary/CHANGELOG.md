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

## 2026-08-20 — o aviso de shadowing estava ERRADO (verificação de código, sem teste no Studio)

O aviso dizia que um import explícito do módulo da base "quebra com define duplicado". Verificando
antes de pedir o teste manual (o 5.5b do controle), o preview **não quebra**: o iframe injeta um shim
que troca `customElements.define` por uma versão com guarda —
`aura/services/preview/previewModeAura.ts:293`, dentro de `strRuntimeShim` — então o SEGUNDO registro
é **ignorado em silêncio** e vale o módulo que carregou primeiro.

O sintoma real é pior de diagnosticar que um erro: se o módulo da BASE carregar primeiro, o cliente vê
a molécula da biblioteca **em vez da própria cópia**, sem nenhuma mensagem. O aviso foi reescrito para
falar disso — "só o primeiro a carregar conta, e pode ser o da biblioteca" — em vez de prometer um erro
que o preview não dá. Fora do shim, o registro duplicado é erro de DOM; o aviso não cita texto de erro
específico porque o comportamento depende do ambiente.
