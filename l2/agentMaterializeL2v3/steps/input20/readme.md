# input20 (agentM3Input)

Entrada: o prompt do run; `report.json` e `ownership.json` do `finalize80` do agentDefsL2 e os 4 defs de cada página (dados, não código).
Saída: `input.json` no trace do run e o marcador `input20-done`.

Invariantes:
- Sem LLM. Só lê; escreve apenas o `input.json`.
- Exige report `complete`, `scope: all`, `pending` vazio e toda compilação `passed`.
- Cada def tem de bater byte a byte (sha256) com o ownership: senão `M3_DEFS_DRIFT`.
- D-008: as rotas do contrato `<module>.<pageId>.<requestId>` são exatamente as chaves de `requests` do shared.
- A ordem dos `requestId` no `input.json` é a ordem do contrato.
- Fora desta spec (vêm com o pages50): mapa de moléculas e checagem do template.
- Falha: degradação + `summary.json` `failed` antes de devolver `failed`.
