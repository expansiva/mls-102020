# d2_14 — gates após review 1

Data: 23/09/2026.

## Mudança verificada

- `gateD2Pages` deixou de exigir que toda Scene seja referenciada por um organismo.
- Continuam ativos os gates de organismo único/completo, `contentRef` existente, paridade desktop/mobile e superfícies válidas do shared.
- A regressão usa 3 Scenes válidas e 2 organismos; ambos referenciam Scenes reais e a terceira não exige organismo artificial.
- O negativo existente `D2_PAGES_CONTENT_REF_UNKNOWN` continua passando.

## Resultados

| gate | resultado |
|---|---|
| focados d2_12/d2_13 | 44 total: 43 pass, 0 fail, 1 skip (Chrome opt-in já certificado na d2_13) |
| `typeCheckProject(102020)` | L1 0/0, L2 0/0, `block=false` |
| runner nominal 102020/L2 | 193 arquivos; mesmas 12 falhas externas, pelos mesmos nomes de `runner-before.log` |
| `git diff --check` | limpo |

Nenhuma run viva, chamada `collabmsg`, edição dos defs gerados, commit ou push foi feita nesta rodada.
