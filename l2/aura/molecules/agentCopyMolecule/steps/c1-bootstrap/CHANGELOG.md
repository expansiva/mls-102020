# CHANGELOG — c1-bootstrap

## 2026-08-19 — nasce (Fase 3 do controle)

Escrito depois do `flow.json` (spec-first). Decisões que já nasceram aqui, todas do controle:

- **admissão da lista inteira** com todos os erros de uma vez (decisão 2, fail-fast) — o gate
  recebe uma sonda por item e devolve o conjunto;
- **colisão não é falha**: é registrada por item, com o `copiedFrom` da cópia existente quando
  legível, para o c2 poder dizer *quando* a cópia foi feita;
- **critério de colisão** = qualquer um dos 4 arquivos do destino existir (critério do
  `v1-bootstrap` do Variant), e não só o `.ts`;
- **nada é escrito em `l2`** aqui — se o bootstrap escrevesse, "cancelar" no c2 seria mentira;
- **trace também no caminho de falha**: é o registro de por que nada foi copiado;
- `.less` ausente na origem entra como erro nomeado (a cópia sairia sem aparência) em vez de
  ser descoberto no preview.

## 2026-08-20 — `origin_less_missing` deixa de bloquear

Uma molécula sem `.less` legível não pode abortar a admissão de um lote de 12: molécula sem aparência
própria é estado legítimo na base (o `ml-data-table` prova o caso vizinho, com folha só de header). O
código continua sendo emitido — vai para o `warnings` do trace — mas entrou em
`C_BOOTSTRAP_NON_BLOCKING` e o step filtra antes de decidir falhar.
