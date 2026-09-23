# d2_14 — gates após review 2

Data: 23/09/2026.

## Contrato corrigido

- O gate recebe o contexto completo de candidatos reais, não somente os grupos já escolhidos pelo modelo.
- Cada organismo com candidato publicado compatível exige pelo menos uma recomendação para as famílias
  query/view, input/entry e command/trigger.
- Conteúdo estático ou organismo sem grupo compatível continua aceitando lista vazia com motivo.
- O prompt e o contexto proíbem alegar catálogo vazio quando `moleculeCandidates.groups` contém grupos.
- `D2_PAGES_VERSION` avançou de v3 para v4; resultados v3 não são reutilizados.
- Nenhuma variante é imposta: a recomendação permanece consultiva para o materializador.

## Resultados

| gate | resultado |
|---|---|
| focados d2_12/d2_13/d2_14 | 49 total: 48 pass, 0 fail, 1 skip (Chrome opt-in já certificado na d2_13) |
| `typeCheckProject(102020)` | L1 0/0, L2 0/0, `block=false` |
| runner nominal 102020/L2 | 193 arquivos; mesmas 12 falhas externas, pelos mesmos nomes de `runner-before.log` |
| `git diff --check` | limpo |

Nenhuma run viva, chamada `collabmsg`, edição dos defs gerados, commit ou push foi feita nesta rodada.
