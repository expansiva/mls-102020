# d2_14 — preflight de catálogo após decisão da rodada 3

Data: 23/09/2026.

## Dependência explícita do 102047

| superfície | valor comprovado |
|---|---|
| `l5/config.json.workspaceDependencies` | `102040` aparece exatamente uma vez |
| `l5/config.json.projects["102040"]` | `{ "root": "../mls-102040", "type": "lib" }` |
| `mlsDep.json.workspaceDependencies` | `102040` aparece exatamente uma vez |

Hashes após o patch:

- `l5/config.json`: `659b2c36ecb6b34555ae73a90e1773b5b3ba2d315ccebdf2c3cbe3736a1ebe41`
- `mlsDep.json`: `a6299796019ea221e406b972db5dfe3f7850b8a73f0acfa945f2d477c86c0ac5`

`mlsDepJsonContents(config, project)` reproduziu `mlsDep.json` byte a byte.

## Descoberta produtiva

A regressão usa os três arquivos reais do 102047, instala somente o índice molecular realmente
presente em 102040 e chama `d2MoleculeCatalogPort.discover(null)`. Resultado:

- `project = 102040`
- `selectedBy = dependency`
- `candidates = [102040]`
- inventário carregado: 31 grupos

## Gates

| gate | resultado |
|---|---|
| focados d2_12/d2_13/d2_14 | 50 total: 49 pass, 0 fail, 1 skip (Chrome já certificado na d2_13) |
| `typeCheckProject(102020)` | L1 0/0, L2 0/0, `block=false` |
| runner nominal 102020/L2 | 193 arquivos; mesmas 12 falhas externas pelos mesmos nomes |
| `git diff --check` | limpo em 102020 e 102047 |

Nenhuma run viva, chamada `collabmsg`, edição manual dos defs gerados, commit ou push foi feita.
